import type { ResumeData } from "@/types/resume";

interface ResumeLayoutProps {
  data: ResumeData;
  compact?: boolean;
}

/* ── Backward-compat helpers ───────────────────────────────────────── */

/** Old pages stored skills as string[]; new pages use {category,items}[]. */
function normalizeSkills(raw: ResumeData["skills"]): Array<{ category: string; items: string[] }> {
  if (!raw?.length) return [];
  if (typeof raw[0] === "string") {
    return [{ category: "General", items: raw as unknown as string[] }];
  }
  return raw as Array<{ category: string; items: string[] }>;
}

/** Old pages stored certifications as string[]; new pages use {name,issuer,date}[]. */
function normalizeCerts(raw: ResumeData["certifications"]): Array<{ name: string; issuer: string | null; date: string | null }> {
  if (!raw?.length) return [];
  if (typeof raw[0] === "string") {
    return (raw as unknown as string[]).map((c) => ({ name: c, issuer: null, date: null }));
  }
  return raw as Array<{ name: string; issuer: string | null; date: string | null }>;
}

export default function ResumeLayout({ data, compact = false }: ResumeLayoutProps) {
  const statCount = Math.min(Math.max(data.stats?.length ?? 0, 1), 4);
  const headingSize = compact ? "text-3xl" : "text-4xl";
  const summarySize = compact ? "text-sm" : "text-base";
  const skills = normalizeSkills(data.skills);
  const certs = normalizeCerts(data.certifications);

  const hasContact = data.email || data.linkedin || data.github || data.website;

  return (
    <div className="relative z-10 h-full overflow-y-auto p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className={`${headingSize} font-heading font-bold text-[#F5F0EB] drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]`}>
              {data.name}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#D4A654]">{data.headline}</p>
            {data.location ? <p className="mt-1 text-sm text-[rgba(245,240,235,0.4)]">{data.location}</p> : null}
            {hasContact ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {data.email ? (
                  <a href={`mailto:${data.email}`} className="pointer-events-auto flex items-center gap-1.5 text-xs text-[rgba(245,240,235,0.5)] transition-colors hover:text-[#F0D48A]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    {data.email}
                  </a>
                ) : null}
                {data.linkedin ? (
                  <a href={data.linkedin.startsWith("http") ? data.linkedin : `https://${data.linkedin}`} target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1.5 text-xs text-[rgba(245,240,235,0.5)] transition-colors hover:text-[#F0D48A]">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    LinkedIn
                  </a>
                ) : null}
                {data.github ? (
                  <a href={data.github.startsWith("http") ? data.github : `https://github.com/${data.github}`} target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1.5 text-xs text-[rgba(245,240,235,0.5)] transition-colors hover:text-[#F0D48A]">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                    GitHub
                  </a>
                ) : null}
                {data.website ? (
                  <a href={data.website.startsWith("http") ? data.website : `https://${data.website}`} target="_blank" rel="noopener noreferrer" className="pointer-events-auto flex items-center gap-1.5 text-xs text-[rgba(245,240,235,0.5)] transition-colors hover:text-[#F0D48A]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.757 8.243a4.5 4.5 0 003.182 7.685" /></svg>
                    Website
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          {data.avatar_url ? (
            <img
              src={data.avatar_url}
              alt={data.name}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[#D4A654] shadow-[0_0_28px_rgba(212,166,84,0.3)]"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A654] to-[#E8845C] font-heading text-2xl font-bold text-[#1A0A2E] shadow-[0_0_28px_rgba(212,166,84,0.3)]">
              {(data.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </header>

        {/* ── Summary ─────────────────────────────────────────────── */}
        {data.summary ? <p className={`${summarySize} mb-6 leading-7 text-[rgba(245,240,235,0.6)]`}>{data.summary}</p> : null}

        {/* ── Stats Bar ──────────────────────────────────────────── */}
        {data.stats?.length ? (
          <section className="mb-6 grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${statCount}, minmax(0, 1fr))` }}>
            {data.stats.slice(0, 4).map((stat) => (
              <article
                key={`${stat.label}-${stat.value}`}
                className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] p-3 text-center backdrop-blur-md"
              >
                <div className="font-mono text-xl text-[#F0D48A]">{stat.value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.45)]">{stat.label}</div>
              </article>
            ))}
          </section>
        ) : null}

        {/* ── Experience ──────────────────────────────────────────── */}
        {data.experience?.length ? (
          <section className="mb-5">
            <h2 className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D4A654]">Experience</h2>
            <div className="space-y-2">
              {data.experience.map((experience) => (
                <article
                  key={`${experience.company}-${experience.title}-${experience.dates}`}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4 backdrop-blur-md"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-[#F5F0EB]">
                      {experience.title} <span className="text-[rgba(245,240,235,0.45)]">· {experience.company}</span>
                    </p>
                    <p className="font-mono text-[11px] text-[rgba(245,240,235,0.35)]">{experience.dates}</p>
                  </div>
                  {experience.highlights?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {experience.highlights.map((highlight) => (
                        <span
                          key={`${experience.company}-${highlight}`}
                          className="rounded-md bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[11px] text-[rgba(245,240,235,0.5)]"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Projects ───────────────────────────────────────────── */}
        {data.projects?.length ? (
          <section className="mb-5">
            <h2 className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D4A654]">Projects</h2>
            <div className="space-y-2">
              {data.projects.map((project) => (
                <article
                  key={project.name}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4 backdrop-blur-md"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-[#F5F0EB]">
                      {project.url ? (
                        <a href={project.url.startsWith("http") ? project.url : `https://${project.url}`} target="_blank" rel="noopener noreferrer" className="pointer-events-auto underline decoration-[rgba(212,166,84,0.3)] underline-offset-2 transition-colors hover:text-[#F0D48A]">
                          {project.name}
                        </a>
                      ) : project.name}
                    </p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[rgba(245,240,235,0.5)]">{project.description}</p>
                  {project.tech?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {project.tech.map((t) => (
                        <span
                          key={`${project.name}-${t}`}
                          className="rounded-md border border-[rgba(212,166,84,0.15)] bg-[rgba(212,166,84,0.06)] px-2 py-0.5 text-[10px] text-[#F0D48A]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Education ──────────────────────────────────────────── */}
        {data.education?.length ? (
          <section className="mb-5">
            <h2 className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D4A654]">Education</h2>
            <div className="space-y-2">
              {data.education.map((education) => (
                <article
                  key={`${education.school}-${education.degree}-${education.year}`}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-3"
                >
                  <p className="text-sm font-medium text-[#F5F0EB]">
                    {education.degree} <span className="text-[rgba(245,240,235,0.45)]">· {education.school}</span>
                    {education.year ? (
                      <span className="ml-2 font-mono text-[11px] text-[rgba(245,240,235,0.35)]">{education.year}</span>
                    ) : null}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Skills (grouped by category) ───────────────────────── */}
        {skills.length ? (
          <section className="mb-5">
            <h2 className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D4A654]">Skills</h2>
            <div className="space-y-3">
              {skills.map((group) => (
                <div key={group.category}>
                  {skills.length > 1 ? (
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[rgba(245,240,235,0.35)]">{group.category}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-[rgba(212,166,84,0.25)] bg-[rgba(212,166,84,0.08)] px-3 py-1 text-xs text-[#F0D48A]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Certifications ─────────────────────────────────────── */}
        {certs.length ? (
          <section>
            <h2 className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D4A654]">Certifications</h2>
            <div className="space-y-2">
              {certs.map((cert) => (
                <div
                  key={cert.name}
                  className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(212,166,84,0.1)]">
                    <svg className="h-4 w-4 text-[#D4A654]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F5F0EB]">{cert.name}</p>
                    {(cert.issuer || cert.date) ? (
                      <p className="mt-0.5 text-[11px] text-[rgba(245,240,235,0.4)]">
                        {cert.issuer}{cert.issuer && cert.date ? " · " : ""}{cert.date}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
