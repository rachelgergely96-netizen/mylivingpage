/* eslint-disable @typescript-eslint/no-explicit-any */

import { normalizeResumeDataForExport, normalizeResumeText } from "@/lib/resume-export";
import type { AtsExportCheck, ResumeData } from "@/types/resume";

type PdfKitModule = {
  default: new (options?: Record<string, unknown>) => PdfDocumentInstance;
};
type PdfDocumentInstance = any;

const PAGE_MARGIN = 50;
const CONTENT_GUTTER = 4;
const SECTION_TITLE_GAP = 3;
const SECTION_CONTENT_GAP = 7;
const ENTRY_COLUMN_GAP = 12;
const ENTRY_DATE_WIDTH = 76;
const BODY_FONT_SIZE = 8.8;
const BODY_LINE_GAP = 1.4;
let pdfKitPromise: Promise<PdfKitModule> | null = null;

function getPdfKit() {
  if (!pdfKitPromise) {
    pdfKitPromise = import("@react-pdf/pdfkit");
  }

  return pdfKitPromise;
}

function displayLink(value: string | null) {
  if (!value) {
    return null;
  }

  const clean = normalizeResumeText(value);
  return clean.replace(/^https?:\/\//i, "");
}

function buildContactLines(data: ResumeData) {
  const email = data.email ? normalizeResumeText(data.email) : "";
  const links = [displayLink(data.linkedin), displayLink(data.github), displayLink(data.website)].filter(
    Boolean,
  ) as string[];

  if (email && links.length) {
    const combined = [email, ...links].join(" | ");
    if (combined.length <= 72) {
      return [combined];
    }

    return [email, links.join(" | ")];
  }

  if (email) {
    return [email];
  }

  if (links.length) {
    return [links.join(" | ")];
  }

  return [];
}

function buildFallbackSectionLines(data: ResumeData) {
  const sections: Array<{ title: string; lines: string[] }> = [];

  if (data.summary) {
    sections.push({
      title: "Summary",
      lines: [data.summary],
    });
  }

  if (data.experience.length) {
    sections.push({
      title: "Experience",
      lines: data.experience.flatMap((entry) => {
        const heading = [entry.title, entry.company, entry.dates].filter(Boolean).join(" | ");
        const highlights = entry.highlights.map((highlight) => `- ${highlight}`);
        return [heading, ...highlights].filter(Boolean);
      }),
    });
  }

  if (data.skills.length) {
    sections.push({
      title: "Skills",
      lines: data.skills
        .map((group) => {
          const items = group.items.filter(Boolean).join(", ");
          return items ? `${group.category}: ${items}` : group.category;
        })
        .filter(Boolean),
    });
  }

  if (data.education.length) {
    sections.push({
      title: "Education",
      lines: data.education
        .map((entry) => [entry.degree, entry.school, entry.year].filter(Boolean).join(" | "))
        .filter(Boolean),
    });
  }

  if (data.projects.length) {
    sections.push({
      title: "Projects",
      lines: data.projects.flatMap((project) => {
        const lines = [project.name, project.description].filter(Boolean);
        if (project.tech.length) {
          lines.push(project.tech.join(", "));
        }
        return lines;
      }),
    });
  }

  if (data.certifications.length) {
    sections.push({
      title: "Certifications",
      lines: data.certifications
        .map((certification) =>
          [certification.name, certification.issuer, certification.date].filter(Boolean).join(" | "),
        )
        .filter(Boolean),
    });
  }

  return sections;
}

function countOverflowReasons(data: ResumeData) {
  const reasons: string[] = [];
  const fixes: string[] = [];
  const totalHighlights = data.experience.reduce((count, entry) => count + entry.highlights.length, 0);

  if (data.summary.length > 320) {
    reasons.push("The summary is still too long for a one-page Resume PDF.");
    fixes.push("Shorten the summary to two tight sentences with the exact role and top skills.");
  }

  if (data.experience.length > 4) {
    reasons.push("There are more than four roles in the export.");
    fixes.push("Keep the four strongest roles on the exported resume.");
  }

  if (totalHighlights > 8) {
    reasons.push("There are too many bullet lines across experience.");
    fixes.push("Trim each role to the strongest one or two bullets.");
  }

  if (data.projects.length > 2) {
    reasons.push("Projects are taking too much one-page space.");
    fixes.push("Keep only the two most relevant projects in the Resume PDF.");
  }

  if (data.certifications.length > 2) {
    reasons.push("Certifications are taking too much one-page space.");
    fixes.push("Keep only the certifications that matter most to the role.");
  }

  if (data.skills.reduce((count, group) => count + group.items.length, 0) > 18) {
    reasons.push("The skills section is too dense for a one-page layout.");
    fixes.push("Keep the most important explicit skills and remove the rest from the exported PDF.");
  }

  return {
    overflowReasons: reasons,
    recommendedFixes: fixes,
  };
}

function safePageWidth(doc: PdfDocumentInstance) {
  const pageWidth = typeof doc.page.width === "number" ? doc.page.width : 612;
  return pageWidth - PAGE_MARGIN * 2;
}

function getContentBounds(doc: PdfDocumentInstance) {
  return {
    left: PAGE_MARGIN + CONTENT_GUTTER,
    width: safePageWidth(doc) - CONTENT_GUTTER * 2,
  };
}

function renderSectionTitle(doc: PdfDocumentInstance, title: string) {
  const { left, width } = getContentBounds(doc);
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(8.4).fillColor("#111827").text(title.toUpperCase(), left, doc.y, {
    width,
    characterSpacing: 0.8,
  });
  const lineY = doc.y + SECTION_TITLE_GAP;
  doc
    .save()
    .strokeColor("#CBD5E1")
    .lineWidth(0.5)
    .moveTo(left, lineY)
    .lineTo(left + width, lineY)
    .stroke()
    .restore();
  doc.y = lineY + SECTION_CONTENT_GAP;
}

function renderEntryDateLine(
  doc: PdfDocumentInstance,
  title: string,
  subtitle: string,
  dates: string,
) {
  const { left, width } = getContentBounds(doc);
  const startX = left;
  const startY = doc.y;
  const contentWidth = Math.max(170, width - ENTRY_DATE_WIDTH - ENTRY_COLUMN_GAP);

  doc.font("Helvetica-Bold").fontSize(9.3).fillColor("#111827").text(title, startX, startY, {
    width: contentWidth,
    lineGap: 0.6,
  });

  const titleHeight = doc.heightOfString(title, {
    width: contentWidth,
    lineGap: 0.6,
  });

  doc.font("Helvetica").fontSize(8.85).fillColor("#374151").text(subtitle, startX, startY + titleHeight + 2, {
    width: contentWidth,
    lineGap: 0.9,
  });

  doc.font("Helvetica").fontSize(8.1).fillColor("#6B7280").text(dates, startX + contentWidth + ENTRY_COLUMN_GAP, startY, {
    width: ENTRY_DATE_WIDTH,
    align: "right",
  });

  const subtitleHeight = doc.heightOfString(subtitle, {
    width: contentWidth,
    lineGap: 0.9,
  });
  doc.y = startY + titleHeight + subtitleHeight + 6;
}

async function createPdfDocument(): Promise<PdfDocumentInstance> {
  const pdfkit = await getPdfKit();
  const PDFDocument = pdfkit.default;

  return new PDFDocument({
    size: "LETTER",
    margin: PAGE_MARGIN,
    bufferPages: true,
    autoFirstPage: true,
  });
}

function bufferPdfDocument(doc: PdfDocumentInstance): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk: unknown) => {
      if (chunk instanceof Uint8Array) {
        chunks.push(chunk);
        return;
      }

      chunks.push(Uint8Array.from(Buffer.from(chunk as ArrayBufferLike)));
    });

    doc.on("end", () => {
      resolve(Uint8Array.from(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))));
    });

    doc.on("error", reject);
    doc.end();
  });
}

async function renderPrimaryPdfDocument(data: ResumeData) {
  const doc = await createPdfDocument();
  const { left, width } = getContentBounds(doc);
  const contactLines = buildContactLines(data);

  doc.font("Helvetica-Bold").fontSize(17.5).fillColor("#111827").text(data.name, left, doc.y, {
    width,
    lineGap: 0.4,
  });

  if (data.headline) {
    doc.moveDown(0.18);
    doc.font("Helvetica").fontSize(10).fillColor("#374151").text(data.headline, left, doc.y, {
      width,
      lineGap: 0.6,
    });
  }

  if (data.location) {
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(8.7).fillColor("#6B7280").text(data.location, left, doc.y, {
      width,
    });
  }

  contactLines.forEach((line, index) => {
    doc.moveDown(index === 0 ? 0.28 : 0.12);
    doc.font("Helvetica").fontSize(8.15).fillColor("#374151").text(line, left, doc.y, {
      width,
      lineGap: 0.8,
    });
  });

  if (data.summary) {
    renderSectionTitle(doc, "Summary");
    doc.font("Helvetica").fontSize(BODY_FONT_SIZE).fillColor("#374151").text(data.summary, left, doc.y, {
      width,
      lineGap: BODY_LINE_GAP,
    });
  }

  if (data.experience.length) {
    renderSectionTitle(doc, "Experience");
    data.experience.forEach((entry) => {
      renderEntryDateLine(
        doc,
        entry.title,
        `${entry.company}${entry.url ? ` | ${displayLink(entry.url)}` : ""}`,
        entry.dates,
      );

      entry.highlights.forEach((highlight) => {
        doc.font("Helvetica").fontSize(8.55).fillColor("#374151").text(`- ${highlight}`, left, doc.y, {
          width,
          lineGap: 1,
          indent: 10,
        });
      });

      doc.moveDown(0.32);
    });
  }

  if (data.skills.length) {
    renderSectionTitle(doc, "Skills");
    data.skills.forEach((group) => {
      doc.font("Helvetica").fontSize(8.5).fillColor("#374151").text(
        `${group.category}: ${group.items.join(", ")}`,
        left,
        doc.y,
        {
          width,
          lineGap: 1,
        },
      );
      doc.moveDown(0.08);
    });
  }

  if (data.education.length) {
    renderSectionTitle(doc, "Education");
    data.education.forEach((entry) => {
      renderEntryDateLine(doc, entry.degree, entry.school, entry.year);
      doc.moveDown(0.2);
    });
  }

  if (data.projects.length) {
    renderSectionTitle(doc, "Projects");
    data.projects.forEach((project) => {
      doc.font("Helvetica-Bold").fontSize(9.1).fillColor("#111827").text(project.name, left, doc.y, {
        width,
      });
      doc.font("Helvetica").fontSize(8.5).fillColor("#374151").text(project.description, left, doc.y, {
        width,
        lineGap: 1,
      });
      if (project.tech.length) {
        doc.font("Helvetica").fontSize(8.4).fillColor("#374151").text(project.tech.join(", "), left, doc.y, {
          width,
          lineGap: 0.8,
        });
      }
      doc.moveDown(0.28);
    });
  }

  if (data.certifications.length) {
    renderSectionTitle(doc, "Certifications");
    data.certifications.forEach((certification) => {
      doc.font("Helvetica-Bold").fontSize(9.1).fillColor("#111827").text(certification.name, left, doc.y, {
        width,
      });
      doc.font("Helvetica").fontSize(8.6).fillColor("#374151").text(
        [certification.issuer, certification.date].filter(Boolean).join(" | "),
        left,
        doc.y,
        {
          width,
          lineGap: 0.8,
        },
      );
      doc.moveDown(0.22);
    });
  }

  return bufferPdfDocument(doc);
}

async function renderFallbackPdfDocument(data: ResumeData) {
  const doc = await createPdfDocument();
  const { left, width } = getContentBounds(doc);
  const contactLines = buildContactLines(data);
  const sections = buildFallbackSectionLines(data);

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827").text(data.name || "Resume", left, doc.y, {
    width,
  });

  if (data.headline) {
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(8.8).fillColor("#4B5563").text(data.headline, left, doc.y, {
      width,
      lineGap: 0.8,
    });
  }

  if (data.location) {
    doc.moveDown(0.1);
    doc.font("Helvetica").fontSize(8.6).fillColor("#4B5563").text(data.location, left, doc.y, {
      width,
    });
  }

  contactLines.forEach((line, index) => {
    doc.moveDown(index === 0 ? 0.1 : 0.08);
    doc.font("Helvetica").fontSize(8.25).fillColor("#4B5563").text(line, left, doc.y, {
      width,
      lineGap: 0.8,
    });
  });

  sections.forEach((section) => {
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(9.1).fillColor("#111827").text(section.title.toUpperCase(), left, doc.y, {
      width,
      characterSpacing: 0.7,
    });

    section.lines.forEach((line) => {
      doc.font("Helvetica").fontSize(8.7).fillColor("#1F2937").text(line, left, doc.y, {
        width,
        lineGap: 1,
      });
    });
  });

  return bufferPdfDocument(doc);
}

export function buildResumePdfData(data: unknown) {
  const normalized = normalizeResumeDataForExport(data);

  return {
    ...normalized,
    summary: normalizeResumeText(normalized.summary),
    stats: [],
  } satisfies ResumeData;
}

export const buildAtsPdfData = buildResumePdfData;

export function countPdfPages(buffer: Uint8Array | ArrayBuffer) {
  const pdfBytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const body = Buffer.from(pdfBytes).toString("latin1");
  return Math.max(1, (body.match(/\/Type\s*\/Page\b/g) ?? []).length);
}

export function getFriendlyResumePdfError(
  exportCheck: Partial<AtsExportCheck> | null | undefined,
  fallback = "Unable to generate the Resume PDF right now. Please try again.",
) {
  return (
    exportCheck?.renderFailureReason ??
    exportCheck?.recommendedFixes?.[0] ??
    exportCheck?.overflowReasons?.[0] ??
    fallback
  );
}

export const getFriendlyAtsPdfError = getFriendlyResumePdfError;

export async function checkResumeExport(data: unknown): Promise<AtsExportCheck> {
  const exportData = buildResumePdfData(data);
  const heuristics = countOverflowReasons(exportData);

  try {
    const buffer = await renderResumePdf(exportData);
    const pageCount = countPdfPages(buffer);

    return {
      renderable: true,
      renderFailureReason: null,
      pageCount,
      fitsOnOnePage: pageCount === 1,
      overflowReasons:
        pageCount === 1
          ? []
          : heuristics.overflowReasons.length
            ? heuristics.overflowReasons
            : ["The exported resume still spans more than one page."],
      recommendedFixes:
        pageCount === 1
          ? []
          : heuristics.recommendedFixes.length
            ? heuristics.recommendedFixes
            : ["Trim lower-priority sections and shorten long bullets before exporting again."],
    };
  } catch {
    return {
      renderable: false,
      renderFailureReason:
        "The Resume PDF could not render cleanly from the current content.",
      pageCount: null,
      fitsOnOnePage: null,
      overflowReasons: [],
      recommendedFixes: [],
    };
  }
}

export const checkAtsResumeExport = checkResumeExport;

export async function renderResumePdf(data: unknown) {
  const exportData = buildResumePdfData(data);
  return renderPrimaryPdfDocument(exportData);
}

export const renderAtsResumePdf = renderResumePdf;

export async function renderFallbackResumePdf(data: unknown) {
  const exportData = buildResumePdfData(data);
  return renderFallbackPdfDocument(exportData);
}
