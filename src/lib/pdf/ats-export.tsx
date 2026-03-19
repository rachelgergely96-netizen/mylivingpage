import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { normalizeAtsText, normalizeResumeDataForAts } from "@/lib/ats-review";
import type { AtsExportCheck, ResumeData } from "@/types/resume";

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 38,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#1F2937",
    lineHeight: 1.35,
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 2,
  },
  headline: {
    fontSize: 10.5,
    color: "#374151",
    marginBottom: 2,
  },
  location: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 6,
  },
  contactRow: {
    marginBottom: 10,
  },
  contactText: {
    fontSize: 8.5,
    color: "#374151",
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#111827",
    marginTop: 9,
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#CBD5E1",
  },
  summary: {
    fontSize: 9.25,
    color: "#374151",
    marginBottom: 2,
  },
  entryBlock: {
    marginBottom: 6,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 1,
  },
  entryTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  entrySubtitle: {
    fontSize: 9.25,
    color: "#374151",
  },
  entryDate: {
    fontSize: 8.5,
    color: "#6B7280",
    textAlign: "right",
    minWidth: 74,
  },
  highlight: {
    fontSize: 8.9,
    color: "#374151",
    marginBottom: 1,
  },
  projectLine: {
    fontSize: 8.9,
    color: "#374151",
    marginBottom: 1,
  },
  skillLine: {
    fontSize: 8.9,
    color: "#374151",
    marginBottom: 2,
  },
});

function displayLink(value: string | null) {
  if (!value) {
    return null;
  }

  const clean = normalizeAtsText(value);
  return clean.replace(/^https?:\/\//i, "");
}

function buildContactLine(data: ResumeData) {
  return [data.email, displayLink(data.linkedin), displayLink(data.github), displayLink(data.website)]
    .filter(Boolean)
    .join(" | ");
}

function countOverflowReasons(data: ResumeData) {
  const reasons: string[] = [];
  const fixes: string[] = [];
  const totalHighlights = data.experience.reduce((count, entry) => count + entry.highlights.length, 0);

  if (data.summary.length > 320) {
    reasons.push("The summary is still too long for a one-page ATS resume.");
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
    fixes.push("Keep only the two most relevant projects in the ATS PDF.");
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

export function buildAtsPdfData(data: ResumeData) {
  const normalized = normalizeResumeDataForAts(data);

  return {
    ...normalized,
    summary: normalizeAtsText(normalized.summary),
    stats: [],
  } satisfies ResumeData;
}

export function countPdfPages(buffer: Uint8Array) {
  const body = Buffer.from(buffer).toString("latin1");
  return Math.max(1, (body.match(/\/Type\s*\/Page\b/g) ?? []).length);
}

export function getFriendlyAtsPdfError(
  exportCheck: Partial<AtsExportCheck> | null | undefined,
  fallback = "Unable to generate the ATS PDF right now. Save your latest edits or rerun ATS review and try again.",
) {
  return (
    exportCheck?.renderFailureReason ??
    exportCheck?.recommendedFixes?.[0] ??
    exportCheck?.overflowReasons?.[0] ??
    fallback
  );
}

export async function checkAtsResumeExport(data: ResumeData): Promise<AtsExportCheck> {
  const exportData = buildAtsPdfData(data);
  const heuristics = countOverflowReasons(exportData);

  try {
    const buffer = await renderToBuffer(<AtsResumePDFDocument data={exportData} />);
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
        "The ATS PDF could not render cleanly from the current content. Save your latest edits or rerun ATS review to rebuild it.",
      pageCount: null,
      fitsOnOnePage: null,
      overflowReasons: [],
      recommendedFixes: [],
    };
  }
}

export async function renderAtsResumePdf(data: ResumeData) {
  const exportData = buildAtsPdfData(data);
  return renderToBuffer(<AtsResumePDFDocument data={exportData} />);
}

export default function AtsResumePDFDocument({ data }: { data: ResumeData }) {
  const normalized = buildAtsPdfData(data);
  const contactLine = buildContactLine(normalized);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{normalized.name}</Text>
        {normalized.headline ? <Text style={styles.headline}>{normalized.headline}</Text> : null}
        {normalized.location ? <Text style={styles.location}>{normalized.location}</Text> : null}

        {contactLine ? (
          <View style={styles.contactRow}>
            <Text style={styles.contactText}>{contactLine}</Text>
          </View>
        ) : null}

        {normalized.summary ? (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{normalized.summary}</Text>
          </View>
        ) : null}

        {normalized.experience.length ? (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {normalized.experience.map((entry, index) => (
              <View key={`experience-${index}`} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.entryTitle}>{entry.title}</Text>
                    <Text style={styles.entrySubtitle}>
                      {`${entry.company}${entry.url ? ` | ${displayLink(entry.url)}` : ""}`}
                    </Text>
                  </View>
                  <Text style={styles.entryDate}>{entry.dates}</Text>
                </View>
                {entry.highlights.map((highlight, highlightIndex) => (
                  <Text key={`highlight-${index}-${highlightIndex}`} style={styles.highlight}>
                    {`- ${highlight}`}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {normalized.skills.length ? (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            {normalized.skills.map((group, index) => (
              <Text key={`skill-${index}`} style={styles.skillLine}>
                {`${group.category}: ${group.items.join(", ")}`}
              </Text>
            ))}
          </View>
        ) : null}

        {normalized.education.length ? (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {normalized.education.map((entry, index) => (
              <View key={`education-${index}`} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.entryTitle}>{entry.degree}</Text>
                    <Text style={styles.entrySubtitle}>{entry.school}</Text>
                  </View>
                  {entry.year ? <Text style={styles.entryDate}>{entry.year}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {normalized.projects.length ? (
          <View>
            <Text style={styles.sectionTitle}>Projects</Text>
            {normalized.projects.map((project, index) => (
              <View key={`project-${index}`} style={styles.entryBlock}>
                <Text style={styles.entryTitle}>{project.name}</Text>
                <Text style={styles.projectLine}>{project.description}</Text>
                {project.tech.length ? (
                  <Text style={styles.projectLine}>{project.tech.join(", ")}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {normalized.certifications.length ? (
          <View>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {normalized.certifications.map((certification, index) => (
              <View key={`certification-${index}`} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.entryTitle}>{certification.name}</Text>
                    <Text style={styles.entrySubtitle}>{[certification.issuer, certification.date].filter(Boolean).join(" | ")}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
