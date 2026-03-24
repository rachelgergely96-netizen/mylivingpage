/* eslint-disable @typescript-eslint/no-explicit-any */

import { normalizeResumeDataForExport, normalizeResumeText } from "@/lib/resume-export";
import type { AtsExportCheck, ResumeData } from "@/types/resume";

type PdfKitModule = {
  default: new (options?: Record<string, unknown>) => PdfDocumentInstance;
};
type PdfDocumentInstance = any;

const FONT_REGULAR = "Times-Roman";
const FONT_BOLD = "Times-Bold";
const PAGE_MARGIN = 34;
const CONTENT_GUTTER = 0;
const SECTION_TITLE_GAP = 2;
const SECTION_CONTENT_GAP = 4;
const ENTRY_COLUMN_GAP = 8;
const ENTRY_DATE_WIDTH = 64;
const NAME_FONT_SIZE = 17;
const META_FONT_SIZE = 11;
const SECTION_TITLE_FONT_SIZE = 9.6;
const BODY_FONT_SIZE = 11;
const DATE_FONT_SIZE = 10;
const BODY_LINE_GAP = 0.45;
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

export function formatExperienceHighlightsAsParagraph(highlights: string[]) {
  const normalized = highlights
    .map((highlight) => normalizeResumeText(highlight).replace(/^[-*\u2022\s]+/, "").trim())
    .filter(Boolean)
    .map((highlight) => highlight.replace(/[.!?]+$/, "").trim())
    .filter(Boolean)
    .map((highlight) => `${highlight}.`);

  return normalized.length ? normalized.join(" ") : null;
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
        const highlightsParagraph = formatExperienceHighlightsAsParagraph(entry.highlights);
        return [heading, highlightsParagraph].filter((line): line is string => Boolean(line));
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
    reasons.push("There are too many experience details across roles.");
    fixes.push("Trim each role to the strongest one or two statements.");
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

function pageBottom(doc: PdfDocumentInstance) {
  const pageHeight = typeof doc.page.height === "number" ? doc.page.height : 792;
  return pageHeight - PAGE_MARGIN;
}

function ensureSpace(doc: PdfDocumentInstance, requiredHeight: number) {
  if (doc.y + requiredHeight > pageBottom(doc)) {
    doc.addPage();
  }
}

function getContentBounds(doc: PdfDocumentInstance) {
  return {
    left: PAGE_MARGIN + CONTENT_GUTTER,
    width: safePageWidth(doc) - CONTENT_GUTTER * 2,
  };
}

function applyRegularFont(doc: PdfDocumentInstance) {
  return doc.font(FONT_REGULAR);
}

function applyBoldFont(doc: PdfDocumentInstance) {
  return doc.font(FONT_BOLD);
}

function getTextHeight(
  doc: PdfDocumentInstance,
  text: string,
  options: Record<string, unknown>,
  {
    bold = false,
    fontSize = BODY_FONT_SIZE,
  }: {
    bold?: boolean;
    fontSize?: number;
  } = {},
) {
  (bold ? applyBoldFont : applyRegularFont)(doc).fontSize(fontSize);
  return doc.heightOfString(text, options);
}

function estimateSectionTitleHeight(doc: PdfDocumentInstance, title: string) {
  const { width } = getContentBounds(doc);
  const headingHeight = getTextHeight(
    doc,
    title.toUpperCase(),
    {
      width,
      characterSpacing: 0.8,
    },
    {
      bold: true,
      fontSize: SECTION_TITLE_FONT_SIZE,
    },
  );

  return headingHeight + SECTION_TITLE_GAP + SECTION_CONTENT_GAP + 4;
}

function getEntryContentWidth(doc: PdfDocumentInstance) {
  const { width } = getContentBounds(doc);
  return Math.max(170, width - ENTRY_DATE_WIDTH - ENTRY_COLUMN_GAP);
}

function estimateEntryDateLineHeight(
  doc: PdfDocumentInstance,
  title: string,
  subtitle: string,
  dates: string,
) {
  const contentWidth = getEntryContentWidth(doc);
  const titleHeight = getTextHeight(
    doc,
    title,
    {
      width: contentWidth,
      lineGap: 0.2,
    },
    {
      bold: true,
      fontSize: BODY_FONT_SIZE,
    },
  );
  const subtitleHeight = subtitle
    ? getTextHeight(
        doc,
        subtitle,
        {
          width: contentWidth,
          lineGap: 0.2,
        },
        {
          fontSize: BODY_FONT_SIZE,
        },
      ) + 1.5
    : 0;
  const dateHeight = dates
    ? getTextHeight(
        doc,
        dates,
        {
          width: ENTRY_DATE_WIDTH,
          align: "right",
        },
        {
          fontSize: DATE_FONT_SIZE,
        },
      )
    : 0;

  return Math.max(titleHeight + subtitleHeight + 3, dateHeight);
}

function estimateParagraphHeight(doc: PdfDocumentInstance, text: string) {
  const { width } = getContentBounds(doc);
  return getTextHeight(
    doc,
    text,
    {
      width,
      lineGap: BODY_LINE_GAP,
      align: "justify",
    },
    {
      fontSize: BODY_FONT_SIZE,
    },
  );
}

function estimateExperienceEntryHeight(doc: PdfDocumentInstance, entry: ResumeData["experience"][number]) {
  let height = estimateEntryDateLineHeight(
    doc,
    entry.title,
    `${entry.company}${entry.url ? ` | ${displayLink(entry.url)}` : ""}`,
    entry.dates,
  );

  const highlightsParagraph = formatExperienceHighlightsAsParagraph(entry.highlights);
  if (highlightsParagraph) {
    height +=
      getTextHeight(
        doc,
        highlightsParagraph,
        {
          width: getContentBounds(doc).width,
          lineGap: BODY_LINE_GAP,
          align: "justify",
        },
        {
          fontSize: BODY_FONT_SIZE,
        },
      ) + 1.5;
  }

  return height + 4;
}

function estimateSkillsGroupHeight(doc: PdfDocumentInstance, group: ResumeData["skills"][number]) {
  return estimateParagraphHeight(doc, `${group.category}: ${group.items.join(", ")}`) + 1;
}

function estimateEducationEntryHeight(doc: PdfDocumentInstance, entry: ResumeData["education"][number]) {
  return estimateEntryDateLineHeight(doc, entry.degree, entry.school, entry.year) + 2;
}

function estimateProjectHeight(doc: PdfDocumentInstance, project: ResumeData["projects"][number]) {
  let height = getTextHeight(
    doc,
    project.name,
    {
      width: getContentBounds(doc).width,
    },
    {
      bold: true,
      fontSize: BODY_FONT_SIZE,
    },
  );

  if (project.description) {
    height += estimateParagraphHeight(doc, project.description);
  }

  if (project.tech.length) {
    height += estimateParagraphHeight(doc, project.tech.join(", "));
  }

  return height + 3;
}

function estimateCertificationHeight(
  doc: PdfDocumentInstance,
  certification: ResumeData["certifications"][number],
) {
  let height = getTextHeight(
    doc,
    certification.name,
    {
      width: getContentBounds(doc).width,
    },
    {
      bold: true,
      fontSize: BODY_FONT_SIZE,
    },
  );

  const details = [certification.issuer, certification.date].filter(Boolean).join(" | ");
  if (details) {
    height += estimateParagraphHeight(doc, details);
  }

  return height + 2;
}

function renderSectionTitle(doc: PdfDocumentInstance, title: string) {
  const { left, width } = getContentBounds(doc);
  ensureSpace(doc, estimateSectionTitleHeight(doc, title));
  doc.moveDown(0.45);
  applyBoldFont(doc).fontSize(SECTION_TITLE_FONT_SIZE).fillColor("#111827").text(title.toUpperCase(), left, doc.y, {
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

  applyBoldFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#111827").text(title, startX, startY, {
    width: contentWidth,
    lineGap: 0.2,
  });

  const titleHeight = doc.heightOfString(title, {
    width: contentWidth,
    lineGap: 0.2,
  });

  applyRegularFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#374151").text(subtitle, startX, startY + titleHeight + 1.5, {
    width: contentWidth,
    lineGap: 0.2,
  });

  applyRegularFont(doc).fontSize(DATE_FONT_SIZE).fillColor("#6B7280").text(dates, startX + contentWidth + ENTRY_COLUMN_GAP, startY, {
    width: ENTRY_DATE_WIDTH,
    align: "right",
  });

  const subtitleHeight = doc.heightOfString(subtitle, {
    width: contentWidth,
    lineGap: 0.2,
  });
  doc.y = startY + titleHeight + subtitleHeight + 3.5;
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

  applyBoldFont(doc).fontSize(NAME_FONT_SIZE).fillColor("#111827").text(data.name, left, doc.y, {
    width,
    lineGap: 0.2,
  });

  if (data.headline) {
    doc.moveDown(0.08);
    applyRegularFont(doc).fontSize(META_FONT_SIZE).fillColor("#374151").text(data.headline, left, doc.y, {
      width,
      lineGap: 0.2,
    });
  }

  if (data.location) {
    doc.moveDown(0.05);
    applyRegularFont(doc).fontSize(META_FONT_SIZE).fillColor("#6B7280").text(data.location, left, doc.y, {
      width,
    });
  }

  contactLines.forEach((line, index) => {
    doc.moveDown(index === 0 ? 0.14 : 0.06);
    applyRegularFont(doc).fontSize(10).fillColor("#374151").text(line, left, doc.y, {
      width,
      lineGap: 0.1,
    });
  });

  if (data.summary) {
    ensureSpace(doc, estimateSectionTitleHeight(doc, "Summary") + estimateParagraphHeight(doc, data.summary));
    renderSectionTitle(doc, "Summary");
    applyRegularFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#374151").text(data.summary, left, doc.y, {
      width,
      lineGap: BODY_LINE_GAP,
      align: "justify",
    });
  }

  if (data.experience.length) {
    ensureSpace(
      doc,
      estimateSectionTitleHeight(doc, "Experience") + estimateExperienceEntryHeight(doc, data.experience[0]),
    );
    renderSectionTitle(doc, "Experience");
    data.experience.forEach((entry) => {
      ensureSpace(doc, estimateExperienceEntryHeight(doc, entry));
      renderEntryDateLine(
        doc,
        entry.title,
        `${entry.company}${entry.url ? ` | ${displayLink(entry.url)}` : ""}`,
        entry.dates,
      );

      const highlightsParagraph = formatExperienceHighlightsAsParagraph(entry.highlights);
      if (highlightsParagraph) {
        applyRegularFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#374151").text(highlightsParagraph, left, doc.y, {
          width,
          lineGap: BODY_LINE_GAP,
          align: "justify",
        });
      }

      doc.moveDown(0.12);
    });
  }

  if (data.skills.length) {
    ensureSpace(
      doc,
      estimateSectionTitleHeight(doc, "Skills") + estimateSkillsGroupHeight(doc, data.skills[0]),
    );
    renderSectionTitle(doc, "Skills");
    data.skills.forEach((group) => {
      ensureSpace(doc, estimateSkillsGroupHeight(doc, group));
      applyRegularFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#374151").text(
        `${group.category}: ${group.items.join(", ")}`,
        left,
        doc.y,
        {
          width,
          lineGap: BODY_LINE_GAP,
          align: "justify",
        },
      );
      doc.moveDown(0.02);
    });
  }

  if (data.education.length) {
    ensureSpace(
      doc,
      estimateSectionTitleHeight(doc, "Education") + estimateEducationEntryHeight(doc, data.education[0]),
    );
    renderSectionTitle(doc, "Education");
    data.education.forEach((entry) => {
      ensureSpace(doc, estimateEducationEntryHeight(doc, entry));
      renderEntryDateLine(doc, entry.degree, entry.school, entry.year);
      doc.moveDown(0.04);
    });
  }

  if (data.projects.length) {
    ensureSpace(
      doc,
      estimateSectionTitleHeight(doc, "Projects") + estimateProjectHeight(doc, data.projects[0]),
    );
    renderSectionTitle(doc, "Projects");
    data.projects.forEach((project) => {
      ensureSpace(doc, estimateProjectHeight(doc, project));
      applyBoldFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#111827").text(project.name, left, doc.y, {
        width,
      });
      applyRegularFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#374151").text(project.description, left, doc.y, {
        width,
        lineGap: BODY_LINE_GAP,
        align: "justify",
      });
      if (project.tech.length) {
        applyRegularFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#374151").text(project.tech.join(", "), left, doc.y, {
          width,
          lineGap: BODY_LINE_GAP,
          align: "justify",
        });
      }
      doc.moveDown(0.12);
    });
  }

  if (data.certifications.length) {
    ensureSpace(
      doc,
      estimateSectionTitleHeight(doc, "Certifications") +
        estimateCertificationHeight(doc, data.certifications[0]),
    );
    renderSectionTitle(doc, "Certifications");
    data.certifications.forEach((certification) => {
      ensureSpace(doc, estimateCertificationHeight(doc, certification));
      applyBoldFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#111827").text(certification.name, left, doc.y, {
        width,
      });
      applyRegularFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#374151").text(
        [certification.issuer, certification.date].filter(Boolean).join(" | "),
        left,
        doc.y,
        {
          width,
          lineGap: BODY_LINE_GAP,
          align: "justify",
        },
      );
      doc.moveDown(0.08);
    });
  }

  return bufferPdfDocument(doc);
}

async function renderFallbackPdfDocument(data: ResumeData) {
  const doc = await createPdfDocument();
  const { left, width } = getContentBounds(doc);
  const contactLines = buildContactLines(data);
  const sections = buildFallbackSectionLines(data);

  applyBoldFont(doc).fontSize(NAME_FONT_SIZE).fillColor("#111827").text(data.name || "Resume", left, doc.y, {
    width,
  });

  if (data.headline) {
    doc.moveDown(0.08);
    applyRegularFont(doc).fontSize(META_FONT_SIZE).fillColor("#4B5563").text(data.headline, left, doc.y, {
      width,
      lineGap: 0.2,
    });
  }

  if (data.location) {
    doc.moveDown(0.05);
    applyRegularFont(doc).fontSize(META_FONT_SIZE).fillColor("#4B5563").text(data.location, left, doc.y, {
      width,
    });
  }

  contactLines.forEach((line, index) => {
    doc.moveDown(index === 0 ? 0.12 : 0.05);
    applyRegularFont(doc).fontSize(10).fillColor("#4B5563").text(line, left, doc.y, {
      width,
      lineGap: 0.1,
    });
  });

  sections.forEach((section) => {
    ensureSpace(
      doc,
      estimateSectionTitleHeight(doc, section.title) +
        (section.lines[0] ? estimateParagraphHeight(doc, section.lines[0]) : 0),
    );
    doc.moveDown(0.4);
    applyBoldFont(doc).fontSize(SECTION_TITLE_FONT_SIZE).fillColor("#111827").text(section.title.toUpperCase(), left, doc.y, {
      width,
      characterSpacing: 0.7,
    });

    section.lines.forEach((line) => {
      ensureSpace(doc, estimateParagraphHeight(doc, line));
      applyRegularFont(doc).fontSize(BODY_FONT_SIZE).fillColor("#1F2937").text(line, left, doc.y, {
        width,
        lineGap: BODY_LINE_GAP,
        align: "justify",
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
            : ["Trim lower-priority sections and shorten long role descriptions before exporting again."],
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
