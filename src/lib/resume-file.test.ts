import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { extractResumeFileText, ResumeFileError } from "@/lib/resume-file";

function createStoredZip(fileName: string, contents: string) {
  const name = Buffer.from(fileName);
  const data = Buffer.from(contents);
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(name.length, 26);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt32LE(data.length, 20);
  centralHeader.writeUInt32LE(data.length, 24);
  centralHeader.writeUInt16LE(name.length, 28);
  centralHeader.writeUInt32LE(0, 42);

  const centralDirectory = Buffer.concat([centralHeader, name]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localHeader.length + name.length + data.length, 16);

  return Buffer.concat([localHeader, name, data, centralDirectory, end]);
}

function createFlatePdfStream(objectId: number, contents: Buffer) {
  const compressed = deflateSync(contents);
  return Buffer.concat([
    Buffer.from(`${objectId} 0 obj\n<< /Filter /FlateDecode >>\nstream\n`, "latin1"),
    compressed,
    Buffer.from("\nendstream\nendobj\n", "latin1"),
  ]);
}

describe("extractResumeFileText", () => {
  it("reads plain-text resumes", () => {
    const result = extractResumeFileText({
      buffer: Buffer.from("Taylor Reed\nSenior Engineer\ntaylor@example.com\nExperience\nAcme Corp"),
      fileName: "resume.txt",
      contentType: "text/plain",
    });

    expect(result.kind).toBe("text");
    expect(result.text).toContain("Senior Engineer");
  });

  it("extracts paragraph structure from DOCX files", () => {
    const documentXml = `<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>Taylor Reed</w:t></w:r></w:p><w:p><w:r><w:t>Senior Engineer</w:t></w:r></w:p><w:p><w:r><w:t>taylor@example.com</w:t></w:r></w:p></w:body></w:document>`;
    const result = extractResumeFileText({
      buffer: createStoredZip("word/document.xml", documentXml),
      fileName: "resume.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(result.kind).toBe("docx");
    expect(result.text).toBe("Taylor Reed\nSenior Engineer\ntaylor@example.com");
  });

  it("extracts text drawing operations from text-based PDFs", () => {
    const pdf = `%PDF-1.4
1 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
72 720 Td
(Taylor Reed) Tj
0 -18 Td
(Senior Engineer) Tj
0 -18 Td
(taylor@example.com) Tj
ET
endstream
endobj
%%EOF`;
    const result = extractResumeFileText({
      buffer: Buffer.from(pdf, "latin1"),
      fileName: "resume.pdf",
      contentType: "application/pdf",
    });

    expect(result.kind).toBe("pdf");
    expect(result.text).toBe("Taylor Reed\nSenior Engineer\ntaylor@example.com");
  });

  it("rejects unsupported files with a user-facing error", () => {
    expect(() =>
      extractResumeFileText({
        buffer: Buffer.from("This is enough text to pass the meaningful character check."),
        fileName: "resume.pages",
        contentType: "application/octet-stream",
      }),
    ).toThrowError(ResumeFileError);
  });

  it("caps the aggregate expansion of compressed PDF streams", () => {
    const expandedStream = Buffer.alloc(7 * 1024 * 1024, 0x41);
    const pdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n", "latin1"),
      createFlatePdfStream(1, expandedStream),
      createFlatePdfStream(2, expandedStream),
      Buffer.from("%%EOF", "latin1"),
    ]);

    expect(() =>
      extractResumeFileText({
        buffer: pdf,
        fileName: "oversized-streams.pdf",
        contentType: "application/pdf",
      }),
    ).toThrowError("This PDF expands beyond the safe import limit.");
  });
});
