import { Document, Page, Text, View, Link, StyleSheet } from "@react-pdf/renderer";
import type { ResumeData } from "@/types/resume";

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#222",
    lineHeight: 1.5,
  },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginBottom: 2,
  },
  headline: {
    fontSize: 11,
    color: "#555",
    marginBottom: 2,
  },
  location: {
    fontSize: 9,
    color: "#888",
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  contactLink: {
    fontSize: 9,
    color: "#2563EB",
    textDecoration: "none",
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#444",
    marginTop: 14,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  summary: {
    fontSize: 10,
    color: "#444",
    lineHeight: 1.6,
    marginBottom: 4,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 1,
  },
  entryTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#222",
  },
  entrySubtitle: {
    fontSize: 10,
    color: "#666",
  },
  entryDate: {
    fontSize: 9,
    color: "#888",
    textAlign: "right",
    minWidth: 80,
  },
  highlight: {
    fontSize: 9.5,
    color: "#444",
    paddingLeft: 10,
    marginBottom: 1,
  },
  entryBlock: {
    marginBottom: 8,
  },
  skillRow: {
    marginBottom: 3,
  },
  skillCategory: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#555",
  },
  skillItems: {
    fontSize: 9.5,
    color: "#444",
  },
  projectDescription: {
    fontSize: 9.5,
    color: "#555",
    marginTop: 1,
  },
  techLine: {
    fontSize: 9,
    color: "#777",
    marginTop: 1,
  },
  certEntry: {
    marginBottom: 4,
  },
});

function normalizeSkills(
  raw: ResumeData["skills"]
): Array<{ category: string; items: string[] }> {
  if (!raw?.length) return [];
  if (typeof raw[0] === "string") {
    return [{ category: "General", items: raw as unknown as string[] }];
  }
  return raw as Array<{ category: string; items: string[] }>;
}

function normalizeCerts(
  raw: ResumeData["certifications"]
): Array<{ name: string; issuer: string | null; date: string | null }> {
  if (!raw?.length) return [];
  if (typeof raw[0] === "string") {
    return (raw as unknown as string[]).map((c) => ({
      name: c,
      issuer: null,
      date: null,
    }));
  }
  return raw as Array<{
    name: string;
    issuer: string | null;
    date: string | null;
  }>;
}

function formatUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

interface ResumePDFDocumentProps {
  data: ResumeData;
}

export default function ResumePDFDocument({ data }: ResumePDFDocumentProps) {
  const skills = normalizeSkills(data.skills);
  const certs = normalizeCerts(data.certifications);

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        {/* Header */}
        <Text style={styles.name}>{data.name}</Text>
        {data.headline ? (
          <Text style={styles.headline}>{data.headline}</Text>
        ) : null}
        {data.location ? (
          <Text style={styles.location}>{data.location}</Text>
        ) : null}

        {/* Contact */}
        {(data.email || data.linkedin || data.github || data.website) ? (
          <View style={styles.contactRow}>
            {data.email ? (
              <Link src={`mailto:${data.email}`} style={styles.contactLink}>
                {data.email}
              </Link>
            ) : null}
            {data.linkedin ? (
              <Link src={formatUrl(data.linkedin)} style={styles.contactLink}>
                LinkedIn
              </Link>
            ) : null}
            {data.github ? (
              <Link
                src={
                  data.github.startsWith("http")
                    ? data.github
                    : `https://github.com/${data.github}`
                }
                style={styles.contactLink}
              >
                GitHub
              </Link>
            ) : null}
            {data.website ? (
              <Link src={formatUrl(data.website)} style={styles.contactLink}>
                Website
              </Link>
            ) : null}
          </View>
        ) : null}

        {/* Summary */}
        {data.summary ? (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{data.summary}</Text>
          </>
        ) : null}

        {/* Experience */}
        {data.experience?.length ? (
          <>
            <Text style={styles.sectionTitle}>Experience</Text>
            {data.experience.map((exp, i) => (
              <View key={`exp-${i}`} style={styles.entryBlock} wrap={false}>
                <View style={styles.entryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle}>
                      {exp.title}
                      <Text style={styles.entrySubtitle}>
                        {"  "}· {exp.company}
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.entryDate}>{exp.dates}</Text>
                </View>
                {exp.highlights?.map((h, j) => (
                  <Text key={`h-${i}-${j}`} style={styles.highlight}>
                    • {h}
                  </Text>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {/* Projects */}
        {data.projects?.length ? (
          <>
            <Text style={styles.sectionTitle}>Projects</Text>
            {data.projects.map((proj, i) => (
              <View key={`proj-${i}`} style={styles.entryBlock} wrap={false}>
                {proj.url ? (
                  <Link src={formatUrl(proj.url)} style={{ textDecoration: "none" }}>
                    <Text style={styles.entryTitle}>{proj.name}</Text>
                  </Link>
                ) : (
                  <Text style={styles.entryTitle}>{proj.name}</Text>
                )}
                <Text style={styles.projectDescription}>
                  {proj.description}
                </Text>
                {proj.tech?.length ? (
                  <Text style={styles.techLine}>
                    {proj.tech.join(" · ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Education */}
        {data.education?.length ? (
          <>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((edu, i) => (
              <View key={`edu-${i}`} style={styles.entryBlock} wrap={false}>
                <View style={styles.entryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle}>
                      {edu.degree}
                      <Text style={styles.entrySubtitle}>
                        {"  "}· {edu.school}
                      </Text>
                    </Text>
                  </View>
                  {edu.year ? (
                    <Text style={styles.entryDate}>{edu.year}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        ) : null}

        {/* Skills */}
        {skills.length ? (
          <>
            <Text style={styles.sectionTitle}>Skills</Text>
            {skills.map((group, i) => (
              <View key={`skill-${i}`} style={styles.skillRow}>
                <Text>
                  {skills.length > 1 ? (
                    <Text style={styles.skillCategory}>
                      {group.category}:{" "}
                    </Text>
                  ) : null}
                  <Text style={styles.skillItems}>
                    {group.items.join(", ")}
                  </Text>
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Certifications */}
        {certs.length ? (
          <>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certs.map((cert, i) => (
              <View key={`cert-${i}`} style={styles.certEntry}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>
                    {cert.name}
                    {cert.issuer ? (
                      <Text style={styles.entrySubtitle}>
                        {"  "}· {cert.issuer}
                      </Text>
                    ) : null}
                  </Text>
                  {cert.date ? (
                    <Text style={styles.entryDate}>{cert.date}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}
