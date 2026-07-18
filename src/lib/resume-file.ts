import { inflateRawSync, inflateSync } from "node:zlib";
import { MAX_RESUME_TEXT_CHARACTERS } from "@/lib/resume-import";
import {
  MAX_RESUME_FILE_BYTES,
  MAX_RESUME_FILE_LABEL,
} from "@/lib/resume-file-limits";
export { MAX_RESUME_FILE_BYTES, MAX_RESUME_FILE_LABEL } from "@/lib/resume-file-limits";

const MAX_EXPANDED_DOCUMENT_BYTES = 12 * 1024 * 1024;
const MAX_PDF_STREAMS = 256;

export class ResumeFileError extends Error {
  constructor(
    message: string,
    readonly code:
      | "unsupported_file"
      | "file_too_large"
      | "empty_file"
      | "encrypted_pdf"
      | "no_extractable_text"
      | "invalid_document",
  ) {
    super(message);
    this.name = "ResumeFileError";
  }
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  return -1;
}

function readZipEntry(buffer: Buffer, requestedName: string) {
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset < 0 || endOffset + 22 > buffer.length) {
    throw new ResumeFileError("This Word document could not be read.", "invalid_document");
  }

  const totalEntries = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);

  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new ResumeFileError("This Word document could not be read.", "invalid_document");
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;

    if (nameEnd > buffer.length) {
      throw new ResumeFileError("This Word document could not be read.", "invalid_document");
    }

    const fileName = buffer.subarray(nameStart, nameEnd).toString("utf8");
    offset = nameEnd + extraLength + commentLength;

    if (fileName !== requestedName) {
      continue;
    }
    if (uncompressedSize > MAX_EXPANDED_DOCUMENT_BYTES) {
      throw new ResumeFileError("This Word document expands beyond the safe import limit.", "file_too_large");
    }
    if (
      localHeaderOffset + 30 > buffer.length ||
      buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50
    ) {
      throw new ResumeFileError("This Word document could not be read.", "invalid_document");
    }

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataStart < 0 || dataEnd > buffer.length) {
      throw new ResumeFileError("This Word document could not be read.", "invalid_document");
    }

    const compressed = buffer.subarray(dataStart, dataEnd);
    if (compressionMethod === 0) {
      return compressed;
    }
    if (compressionMethod === 8) {
      try {
        return inflateRawSync(compressed, { maxOutputLength: MAX_EXPANDED_DOCUMENT_BYTES });
      } catch {
        throw new ResumeFileError("This Word document could not be read.", "invalid_document");
      }
    }
    throw new ResumeFileError(
      "This Word document uses an unsupported compression format.",
      "unsupported_file",
    );
  }

  throw new ResumeFileError("This file does not appear to be a valid DOCX document.", "invalid_document");
}

function extractDocxText(buffer: Buffer) {
  const documentXml = readZipEntry(buffer, "word/document.xml").toString("utf8");
  const withStructure = documentXml
    .replace(/<w:tab\b[^>]*\/?\s*>/gi, "\t")
    .replace(/<w:br\b[^>]*\/?\s*>/gi, "\n")
    .replace(/<\/w:tc>/gi, "\t")
    .replace(/<\/w:p>/gi, "\n");

  return decodeXmlEntities(withStructure.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodePdfUnicodeHex(hex: string) {
  const clean = hex.replace(/\s+/g, "");
  if (!clean) {
    return "";
  }
  const evenHex = clean.length % 2 === 0 ? clean : `${clean}0`;
  const bytes = Buffer.from(evenHex, "hex");
  if (bytes.length >= 2 && (bytes[0] === 0xfe || evenHex.length % 4 === 0)) {
    const swapped = Buffer.alloc(bytes.length - (bytes[0] === 0xfe && bytes[1] === 0xff ? 2 : 0));
    const start = bytes[0] === 0xfe && bytes[1] === 0xff ? 2 : 0;
    for (let index = start; index + 1 < bytes.length; index += 2) {
      swapped[index - start] = bytes[index + 1] ?? 0;
      swapped[index - start + 1] = bytes[index] ?? 0;
    }
    const decoded = swapped.toString("utf16le");
    if (/[\p{L}\p{N}]/u.test(decoded)) {
      return decoded;
    }
  }
  return bytes.toString("latin1");
}

function buildPdfCharacterMap(content: string) {
  const map = new Map<string, string>();
  for (const block of content.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of (block[1] ?? "").matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) {
      map.set((pair[1] ?? "").toUpperCase(), decodePdfUnicodeHex(pair[2] ?? ""));
    }
  }
  for (const block of content.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const range of (block[1] ?? "").matchAll(
      /<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi,
    )) {
      const start = Number.parseInt(range[1] ?? "", 16);
      const end = Number.parseInt(range[2] ?? "", 16);
      const destination = Number.parseInt(range[3] ?? "", 16);
      const width = (range[1] ?? "").length;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end - start > 512) {
        continue;
      }
      for (let code = start; code <= end; code += 1) {
        map.set(
          code.toString(16).padStart(width, "0").toUpperCase(),
          String.fromCodePoint(destination + code - start),
        );
      }
    }
  }
  return map;
}

function decodePdfBytes(bytes: Buffer, characterMap: Map<string, string>) {
  if (bytes.length === 0) {
    return "";
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodePdfUnicodeHex(bytes.subarray(2).toString("hex"));
  }

  const codeWidths = Array.from(
    new Set(Array.from(characterMap.keys(), (key) => key.length / 2)),
  ).sort((left, right) => right - left);
  if (codeWidths.length > 0) {
    let mapped = "";
    let matchedBytes = 0;
    for (let index = 0; index < bytes.length; ) {
      let match: { value: string; width: number } | null = null;
      for (const width of codeWidths) {
        const key = bytes.subarray(index, index + width).toString("hex").toUpperCase();
        const value = characterMap.get(key);
        if (value !== undefined) {
          match = { value, width };
          break;
        }
      }
      if (match) {
        mapped += match.value;
        matchedBytes += match.width;
        index += match.width;
      } else {
        mapped += bytes.subarray(index, index + 1).toString("latin1");
        index += 1;
      }
    }
    if (matchedBytes >= Math.ceil(bytes.length / 2)) {
      return mapped;
    }
  }

  return bytes.toString("latin1");
}

function decodePdfLiteral(token: string, characterMap: Map<string, string>) {
  if (token.startsWith("<")) {
    const hex = token.slice(1, -1).replace(/\s+/g, "");
    return decodePdfBytes(Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex"), characterMap);
  }

  const source = token.slice(1, -1);
  const bytes: number[] = [];
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    if (character !== "\\") {
      bytes.push(character.charCodeAt(0) & 0xff);
      continue;
    }

    const next = source[index + 1] ?? "";
    const escaped: Record<string, number> = {
      n: 0x0a,
      r: 0x0d,
      t: 0x09,
      b: 0x08,
      f: 0x0c,
      "(": 0x28,
      ")": 0x29,
      "\\": 0x5c,
    };
    if (next in escaped) {
      bytes.push(escaped[next] ?? 0);
      index += 1;
      continue;
    }
    if (/[0-7]/.test(next)) {
      const octal = source.slice(index + 1).match(/^[0-7]{1,3}/)?.[0] ?? "";
      bytes.push(Number.parseInt(octal, 8));
      index += octal.length;
      continue;
    }
    if (next === "\r" || next === "\n") {
      if (next === "\r" && source[index + 2] === "\n") {
        index += 1;
      }
      index += 1;
      continue;
    }
    bytes.push(next.charCodeAt(0) & 0xff);
    index += 1;
  }
  return decodePdfBytes(Buffer.from(bytes), characterMap);
}

function readPdfStreams(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const streams: string[] = [];
  const streamPattern = /stream\r?\n/g;
  let expandedStreamBytes = 0;
  let streamCount = 0;

  for (const match of source.matchAll(streamPattern)) {
    streamCount += 1;
    if (streamCount > MAX_PDF_STREAMS) {
      throw new ResumeFileError(
        "This PDF is too complex to import safely. Try pasting the resume text instead.",
        "invalid_document",
      );
    }
    const streamStart = (match.index ?? 0) + match[0].length;
    const streamEnd = source.indexOf("endstream", streamStart);
    if (streamEnd < 0) {
      continue;
    }
    const objectStart = Math.max(source.lastIndexOf("obj", match.index), 0);
    const dictionary = source.slice(objectStart, match.index);
    let rawEnd = streamEnd;
    while (rawEnd > streamStart && /[\r\n]/.test(source[rawEnd - 1] ?? "")) {
      rawEnd -= 1;
    }
    const raw = buffer.subarray(streamStart, rawEnd);

    try {
      if (/\/FlateDecode\b/.test(dictionary)) {
        const inflated = inflateSync(raw, {
          maxOutputLength: MAX_EXPANDED_DOCUMENT_BYTES,
        });
        expandedStreamBytes += inflated.length;
        if (expandedStreamBytes > MAX_EXPANDED_DOCUMENT_BYTES) {
          throw new ResumeFileError(
            "This PDF expands beyond the safe import limit.",
            "file_too_large",
          );
        }
        streams.push(inflated.toString("latin1"));
      } else if (!/\/Filter\b/.test(dictionary)) {
        expandedStreamBytes += raw.length;
        if (expandedStreamBytes > MAX_EXPANDED_DOCUMENT_BYTES) {
          throw new ResumeFileError(
            "This PDF expands beyond the safe import limit.",
            "file_too_large",
          );
        }
        streams.push(raw.toString("latin1"));
      }
    } catch (error) {
      if (error instanceof ResumeFileError) {
        throw error;
      }
      // A PDF may contain image or font streams that do not help resume text extraction.
    }
  }

  return { source, streams };
}

function extractPdfText(buffer: Buffer) {
  const { source, streams } = readPdfStreams(buffer);
  if (/\/Encrypt\b/.test(source)) {
    throw new ResumeFileError(
      "Password-protected PDFs cannot be imported. Remove the password or paste the resume text.",
      "encrypted_pdf",
    );
  }

  const allContent = [source, ...streams].join("\n");
  const characterMap = buildPdfCharacterMap(allContent);
  const lines: string[] = [];

  for (const content of streams.length > 0 ? streams : [source]) {
    for (const textBlock of content.matchAll(/BT([\s\S]*?)ET/g)) {
      const block = textBlock[1] ?? "";
      let currentLine = "";
      let previousEnd = 0;
      const operationPattern =
        /\[((?:\\.|[^\]])*)\]\s*TJ|(\((?:\\.|[^\\)])*\)|<[0-9a-f\s]+>)\s*(?:Tj|'|")/gi;

      for (const operation of block.matchAll(operationPattern)) {
        const between = block.slice(previousEnd, operation.index ?? 0);
        if (/\b(?:Td|TD|Tm|T\*)\b/.test(between) && currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = "";
        }

        const tokens = operation[1]
          ? Array.from(
              operation[1].matchAll(/\((?:\\.|[^\\)])*\)|<[0-9a-f\s]+>/gi),
              (token) => token[0],
            )
          : [operation[2] ?? ""];
        const value = tokens
          .map((token) => decodePdfLiteral(token, characterMap))
          .join("")
          .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
          .trim();
        if (value) {
          const needsSpace = currentLine && /[\p{L}\p{N}]$/u.test(currentLine) && /^[\p{L}\p{N}]/u.test(value);
          currentLine += `${needsSpace ? " " : ""}${value}`;
        }
        previousEnd = (operation.index ?? 0) + operation[0].length;
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
    }
  }

  const deduped = lines.filter((line, index) => line && line !== lines[index - 1]);
  return deduped.join("\n").trim();
}

function inferFileKind(fileName: string, contentType: string, buffer: Buffer) {
  const normalizedName = fileName.toLowerCase();
  if (contentType === "application/pdf" || normalizedName.endsWith(".pdf") || buffer.subarray(0, 4).toString() === "%PDF") {
    return "pdf" as const;
  }
  if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedName.endsWith(".docx")
  ) {
    return "docx" as const;
  }
  if (
    contentType.startsWith("text/") ||
    normalizedName.endsWith(".txt") ||
    normalizedName.endsWith(".md")
  ) {
    return "text" as const;
  }
  return null;
}

export function extractResumeFileText(input: {
  buffer: Buffer;
  fileName: string;
  contentType?: string | null;
}) {
  const { buffer, fileName } = input;
  if (buffer.length === 0) {
    throw new ResumeFileError("The selected file is empty.", "empty_file");
  }
  if (buffer.length > MAX_RESUME_FILE_BYTES) {
    throw new ResumeFileError(
      `Resume files must be ${MAX_RESUME_FILE_LABEL} or smaller.`,
      "file_too_large",
    );
  }

  const kind = inferFileKind(fileName, input.contentType ?? "", buffer);
  if (!kind) {
    throw new ResumeFileError(
      "Upload a PDF, DOCX, TXT, or Markdown resume.",
      "unsupported_file",
    );
  }

  let text = "";
  if (kind === "pdf") {
    text = extractPdfText(buffer);
  } else if (kind === "docx") {
    text = extractDocxText(buffer);
  } else {
    text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  }

  const normalized = text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, MAX_RESUME_TEXT_CHARACTERS);
  const meaningfulCharacters = normalized.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (meaningfulCharacters < 20) {
    throw new ResumeFileError(
      kind === "pdf"
        ? "We could not read text from this PDF. If it is a scan, paste the resume text instead."
        : "We could not find enough resume text in this file.",
      "no_extractable_text",
    );
  }

  return { text: normalized, kind };
}
