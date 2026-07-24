import Image from "next/image";
import type { ResumeData } from "@/types/resume";

interface ResumeLayoutProps {
  data: ResumeData;
  compact?: boolean;
  headingLevel?: "h1" | "h2";
  disableExternalLinks?: boolean;
  useExternalScrollRoot?: boolean;
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

function normalizeProofs(raw: ResumeData["proofs"]) {
  if (!Array.isArray(raw)) return [];

  return raw.filter((proof) =>
    Boolean(
      proof &&
        (proof.title?.trim() ||
          proof.summary?.trim() ||
          proof.outcome?.trim() ||
          proof.url?.trim()),
    ),
  );
}

function normalizeTestimonials(raw: ResumeData["testimonials"]) {
  if (!Array.isArray(raw)) return [];

  return raw.filter((testimonial) =>
    Boolean(
      testimonial &&
        testimonial.status === "approved" &&
        testimonial.name?.trim() &&
        testimonial.quote?.trim(),
    ),
  );
}

function formatProofTypeLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ResumeLayout({
  data,
  compact = false,
  headingLevel = "h1",
  disableExternalLinks = false,
  useExternalScrollRoot = false,
}: ResumeLayoutProps) {
  const NameHeading = headingLevel;
  const headingSize = compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl md:text-4xl";
  const summarySize = compact ? "text-xs" : "text-sm sm:text-base";
  const allSkills = normalizeSkills(data.skills);
  const skills = compact ? allSkills.slice(0, 2).map(g => ({ ...g, items: g.items.slice(0, 4) })) : allSkills;
  const certs = normalizeCerts(data.certifications);
  const experience = compact ? data.experience?.slice(0, 2) : data.experience;
  const proofs = compact ? normalizeProofs(data.proofs).slice(0, 1) : normalizeProofs(data.proofs).slice(0, 3);
  const testimonials = compact
    ? normalizeTestimonials(data.testimonials).slice(0, 1)
    : normalizeTestimonials(data.testimonials).slice(0, 3);

  const hasContact = data.email || data.linkedin || data.github || data.website;

  return (
    <div
      data-living-output
      data-analytics-scroll-root={useExternalScrollRoot ? undefined : "true"}
      className={`resume-theme relative z-10 ${
        useExternalScrollRoot ? "" : "h-full overflow-y-auto scrollbar-hide"
      } ${compact ? "px-3 py-4 sm:px-4 sm:py-5" : "px-4 py-5 sm:p-6 md:p-8"}`}
    >
      <div className="resume-theme-content mx-auto max-w-4xl">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header data-resume-header className={`${compact ? "mb-3 sm:mb-4" : "mb-5 sm:mb-6"} flex items-start justify-between gap-3 sm:gap-4`}>
          <div className="min-w-0">
            <NameHeading data-resume-name className={`${headingSize} resume-theme-name font-bold leading-tight`}>
              {data.name}
            </NameHeading>
            <p className="resume-theme-accent mt-1 text-[10px] uppercase tracking-[0.2em] sm:text-xs">{data.headline}</p>
            {data.location ? <p className="resume-theme-subtle mt-1 text-xs sm:text-sm">{data.location}</p> : null}
            {hasContact ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                {data.email ? (
                  disableExternalLinks ? (
                    <span className="resume-theme-muted flex items-center gap-1.5 py-1 text-[10px] sm:text-xs">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      <span className="truncate">{data.email}</span>
                    </span>
                  ) : (
                    <a
                      href={`mailto:${data.email}`}
                      data-analytics-target-key="email"
                      data-analytics-target-label={data.email}
                      className="resume-theme-link pointer-events-auto flex items-center gap-1.5 py-1 text-[10px] transition-colors sm:text-xs"
                    >
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      <span className="truncate">{data.email}</span>
                    </a>
                  )
                ) : null}
                {data.linkedin ? (
                  disableExternalLinks ? (
                    <span title="LinkedIn" aria-label="LinkedIn profile" className="resume-theme-muted flex items-center justify-center rounded-none p-1">
                      <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    </span>
                  ) : (
                    <a
                      href={data.linkedin.startsWith("http") ? data.linkedin : `https://${data.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="LinkedIn"
                      aria-label="LinkedIn profile"
                      data-analytics-target-key="linkedin"
                      data-analytics-target-label="LinkedIn"
                      className="resume-theme-link pointer-events-auto flex items-center justify-center rounded-none p-1 transition-colors"
                    >
                      <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    </a>
                  )
                ) : null}
                {data.github ? (
                  disableExternalLinks ? (
                    <span className="resume-theme-muted flex items-center gap-1.5 py-1 text-[10px] sm:text-xs">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                      GitHub
                    </span>
                  ) : (
                    <a
                      href={data.github.startsWith("http") ? data.github : `https://github.com/${data.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-analytics-target-key="github"
                      data-analytics-target-label="GitHub"
                      className="resume-theme-link pointer-events-auto flex items-center gap-1.5 py-1 text-[10px] transition-colors sm:text-xs"
                    >
                      <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                      GitHub
                    </a>
                  )
                ) : null}
                {data.website ? (
                  disableExternalLinks ? (
                    <span className="resume-theme-muted flex items-center gap-1.5 py-1 text-[10px] sm:text-xs">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.757 8.243a4.5 4.5 0 003.182 7.685" /></svg>
                      Website
                    </span>
                  ) : (
                    <a
                      href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-analytics-target-key="website"
                      data-analytics-target-label="Website"
                      className="resume-theme-link pointer-events-auto flex items-center gap-1.5 py-1 text-[10px] transition-colors sm:text-xs"
                    >
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.757 8.243a4.5 4.5 0 003.182 7.685" /></svg>
                      Website
                    </a>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
          {data.avatar_url ? (
            <Image
              src={data.avatar_url}
              alt={data.name}
              data-motion-item="profile-photo"
              data-motion-kind="profile"
              width={56}
              height={56}
              sizes="(min-width: 640px) 56px, 44px"
              className="resume-theme-avatar h-11 w-11 shrink-0 rounded-none object-cover sm:h-14 sm:w-14"
            />
          ) : (
            <div
              data-motion-item="profile-monogram"
              data-motion-kind="profile"
              className="resume-theme-monogram flex h-11 w-11 shrink-0 items-center justify-center rounded-none font-heading text-xl font-bold sm:h-14 sm:w-14 sm:text-2xl"
            >
              {(data.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </header>

        {/* ── Summary ─────────────────────────────────────────────── */}
        {data.summary ? (
          <section data-resume-summary data-analytics-section="summary">
            <p className={`${summarySize} resume-theme-muted ${compact ? "mb-3 line-clamp-2 leading-5 sm:mb-4" : "mb-5 leading-6 sm:mb-6 sm:leading-7"}`}>
              {data.summary}
            </p>
          </section>
        ) : null}

        {/* ── Stats Bar ──────────────────────────────────────────── */}
        {data.stats?.length ? (
          <section
            data-resume-stats
            data-motion-section="stats"
            className={`${compact ? "mb-3 sm:mb-4" : "mb-5 sm:mb-6"} grid grid-cols-2 gap-2 md:gap-3 sm:grid-cols-3 md:grid-cols-4`}
          >
            {data.stats.slice(0, 4).map((stat) => (
              <article
                key={`${stat.label}-${stat.value}`}
                data-motion-item={`stat-${stat.label}`}
                data-motion-kind="stat"
                className="resume-theme-card rounded-none border p-2.5 text-center sm:p-3"
              >
                <div className="resume-theme-accent-bright font-mono text-base sm:text-xl">{stat.value}</div>
                <div className="resume-theme-subtle mt-0.5 text-[8px] uppercase leading-tight tracking-[0.14em] sm:mt-1 sm:text-[9px]">{stat.label}</div>
              </article>
            ))}
          </section>
        ) : null}

        {/* ── Experience ──────────────────────────────────────────── */}
        {proofs.length ? (
          <section
            data-analytics-section="proof"
            className={compact ? "mb-3 sm:mb-4" : "mb-5 sm:mb-6"}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="resume-theme-section-title resume-theme-accent text-[10px] uppercase tracking-[0.24em]">Proof</h2>
              {!compact ? (
                <span className="resume-theme-subtle text-[10px] uppercase tracking-[0.14em]">
                  Proof over claims
                </span>
              ) : null}
            </div>
            <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
              {proofs.map((proof) => {
                const proofUrl =
                  !disableExternalLinks && proof.url
                    ? (proof.url.startsWith("http") ? proof.url : `https://${proof.url}`)
                    : null;

                return (
                  <article
                    key={proof.id}
                    data-motion-item={`proof-${proof.id}`}
                    data-motion-kind="proof"
                    className="resume-theme-card-accent rounded-none border p-3 sm:p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="resume-theme-pill rounded-none border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                        {formatProofTypeLabel(proof.type)}
                      </span>
                      {proof.source_label ? (
                        <span className="resume-theme-subtle text-[10px] uppercase tracking-[0.14em]">
                          {proof.source_label}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-medium">{proof.title}</p>
                    {proof.summary ? (
                      <p className="resume-theme-muted mt-2 text-xs leading-5">
                        {proof.summary}
                      </p>
                    ) : null}
                    {proof.outcome ? (
                      <p className="resume-theme-accent-bright mt-3 text-xs leading-5">{proof.outcome}</p>
                    ) : null}
                    {proofUrl ? (
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-analytics-target-key="proof_item"
                        data-analytics-target-label={proof.title}
                        className="resume-theme-link pointer-events-auto mt-3 inline-flex items-center gap-1.5 text-xs transition-colors"
                      >
                        Open proof link
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {testimonials.length ? (
          <section
            data-analytics-section="testimonials"
            className={compact ? "mb-3 sm:mb-4" : "mb-5 sm:mb-6"}
          >
            <h2 className="resume-theme-section-title resume-theme-accent mb-2 text-[10px] uppercase tracking-[0.24em]">Testimonials</h2>
            <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.id}
                  data-motion-item={`testimonial-${testimonial.id}`}
                  data-motion-kind="testimonial"
                  className="resume-theme-card rounded-none border p-3 sm:p-4"
                >
                  <p className="resume-theme-muted text-sm leading-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <p className="mt-3 text-xs font-medium">{testimonial.name}</p>
                  <p className="resume-theme-subtle mt-1 text-[11px]">
                    {[testimonial.role, testimonial.company].filter(Boolean).join(" · ")}
                    {testimonial.approved_at ? ` · Approved ${testimonial.approved_at}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {experience?.length ? (
          <section
            data-analytics-section="experience"
            className={compact ? "mb-3 sm:mb-4" : "mb-4 sm:mb-5"}
          >
            <h2 className="resume-theme-section-title resume-theme-accent mb-2 text-[10px] uppercase tracking-[0.24em]">Experience</h2>
            <div className="space-y-2">
              {experience.map((exp) => (
                <article
                  key={`${exp.company}-${exp.title}-${exp.dates}`}
                  data-motion-item={`experience-${exp.company}-${exp.title}`}
                  data-motion-kind="experience"
                  className={`resume-theme-card rounded-none border ${compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4"}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-1.5 sm:gap-2">
                    <p className="text-xs font-medium sm:text-sm">
                      {exp.title}{" "}
                      <span className="resume-theme-subtle">
                        ·{" "}
                        {exp.url && !disableExternalLinks ? (
                          <a
                            href={exp.url.startsWith("http") ? exp.url : `https://${exp.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-analytics-target-key="experience_company"
                            data-analytics-target-label={exp.company}
                            className="resume-theme-link pointer-events-auto inline-flex items-center gap-0.5 transition-colors"
                          >
                            {exp.company}
                            <svg className="inline h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                        ) : exp.company}
                      </span>
                    </p>
                    <p className="resume-theme-subtle font-mono text-[11px]">{exp.dates}</p>
                  </div>
                  {!compact && exp.highlights?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exp.highlights.map((highlight) => (
                        <span
                          key={`${exp.company}-${highlight}`}
                          className="resume-theme-chip rounded-none px-2 py-1 text-[11px]"
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
        {!compact && data.projects?.length ? (
          <section data-analytics-section="projects" className="mb-5">
            <h2 className="resume-theme-section-title resume-theme-accent mb-2 text-[10px] uppercase tracking-[0.24em]">Projects</h2>
            <div className="space-y-2">
              {data.projects.map((project) => {
                const projectUrl = !disableExternalLinks && project.url
                  ? (project.url.startsWith("http") ? project.url : `https://${project.url}`)
                  : null;

                const cardClassName = `block rounded-none border p-3 transition-all duration-200 sm:p-4 ${
                  projectUrl
                    ? "resume-theme-card-accent pointer-events-auto"
                    : "resume-theme-card"
                }`;

                return (
                  <article
                    key={project.name}
                    data-motion-item={`project-${project.name}`}
                    data-motion-kind="project"
                  >
                    {projectUrl ? (
                      <a
                        href={projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-analytics-target-key="project"
                        data-analytics-target-label={project.name}
                        className={cardClassName}
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="resume-theme-accent text-xs font-medium sm:text-sm">
                            {project.name}
                          </p>
                          <svg className="resume-theme-accent h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </div>
                        <p className="resume-theme-muted mt-1.5 text-xs leading-5">{project.description}</p>
                        {project.tech?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {project.tech.map((t) => (
                              <span
                                key={`${project.name}-${t}`}
                                className="resume-theme-pill rounded-none border px-2 py-0.5 text-[10px]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </a>
                    ) : (
                      <div className={cardClassName}>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium sm:text-sm">
                            {project.name}
                          </p>
                        </div>
                        <p className="resume-theme-muted mt-1.5 text-xs leading-5">{project.description}</p>
                        {project.tech?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {project.tech.map((t) => (
                              <span
                                key={`${project.name}-${t}`}
                                className="resume-theme-pill rounded-none border px-2 py-0.5 text-[10px]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ── Education ──────────────────────────────────────────── */}
        {!compact && data.education?.length ? (
          <section data-analytics-section="education" className="mb-5">
            <h2 className="resume-theme-section-title resume-theme-accent mb-2 text-[10px] uppercase tracking-[0.24em]">Education</h2>
            <div className="space-y-2">
              {data.education.map((education) => (
                <article
                  key={`${education.school}-${education.degree}-${education.year}`}
                  data-motion-item={`education-${education.school}-${education.degree}`}
                  data-motion-kind="education"
                  className="resume-theme-card rounded-none border p-3"
                >
                  <p className="text-sm font-medium">
                    {education.degree} <span className="resume-theme-subtle">· {education.school}</span>
                    {education.year ? (
                      <span className="resume-theme-subtle ml-2 font-mono text-[11px]">{education.year}</span>
                    ) : null}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Skills (grouped by category) ───────────────────────── */}
        {skills.length ? (
          <section
            data-analytics-section="skills"
            className={compact ? "mb-3" : "mb-5"}
          >
            <h2 className="resume-theme-section-title resume-theme-accent mb-2 text-[10px] uppercase tracking-[0.24em]">Skills</h2>
            <div className="space-y-3">
              {skills.map((group) => (
                <div key={group.category}>
                  {skills.length > 1 ? (
                    <p className="resume-theme-subtle mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em]">{group.category}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {group.items.map((skill) => (
                      <span
                        key={skill}
                        data-motion-item={`skill-${skill}`}
                        data-motion-kind="skill"
                        className="resume-theme-pill rounded-none border px-2.5 py-0.5 text-[11px] sm:px-3 sm:py-1 sm:text-xs"
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
        {!compact && certs.length ? (
          <section data-analytics-section="certifications">
            <h2 className="resume-theme-section-title resume-theme-accent mb-2 text-[10px] uppercase tracking-[0.24em]">Certifications</h2>
            <div className="space-y-2">
              {certs.map((cert) => (
                <div
                  key={cert.name}
                  data-motion-item={`certification-${cert.name}`}
                  data-motion-kind="certification"
                  className="resume-theme-card flex items-center gap-2.5 rounded-none border px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
                >
                  <div className="resume-theme-icon-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-none sm:h-8 sm:w-8">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{cert.name}</p>
                    {(cert.issuer || cert.date) ? (
                      <p className="resume-theme-subtle mt-0.5 text-[11px]">
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
