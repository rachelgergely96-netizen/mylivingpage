import Image from "next/image";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
import type { ResumeData } from "@/types/resume";

interface ResumeLayoutProps {
  data: ResumeData;
  compact?: boolean;
  headingLevel?: "h1" | "h2";
  disableExternalLinks?: boolean;
  useExternalScrollRoot?: boolean;
}

/** Old pages stored skills as string[]; new pages use {category,items}[]. */
function normalizeSkills(raw: ResumeData["skills"]): Array<{ category: string; items: string[] }> {
  if (!raw?.length) return [];
  if (typeof raw[0] === "string") {
    return [{ category: "General", items: raw as unknown as string[] }];
  }
  return raw as Array<{ category: string; items: string[] }>;
}

/** Old pages stored certifications as string[]; new pages use {name,issuer,date}[]. */
function normalizeCerts(
  raw: ResumeData["certifications"],
): Array<{ name: string; issuer: string | null; date: string | null }> {
  if (!raw?.length) return [];
  if (typeof raw[0] === "string") {
    return (raw as unknown as string[]).map((certification) => ({
      name: certification,
      issuer: null,
      date: null,
    }));
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

function buildProfileHandle(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

  return `@${normalized || "profile"}`;
}

function toExternalHref(value: string) {
  return value.startsWith("http") ? value : `https://${value}`;
}

export default function ResumeLayout({
  data,
  compact = false,
  headingLevel = "h1",
  disableExternalLinks = false,
  useExternalScrollRoot = false,
}: ResumeLayoutProps) {
  const NameHeading = headingLevel;
  const SectionHeading = headingLevel === "h1" ? "h2" : "h3";
  const allSkills = normalizeSkills(data.skills);
  const skills = compact
    ? allSkills.slice(0, 2).map((group) => ({ ...group, items: group.items.slice(0, 4) }))
    : allSkills;
  const certs = normalizeCerts(data.certifications);
  const experience = compact ? data.experience?.slice(0, 2) : data.experience;
  const proofs = compact
    ? normalizeProofs(data.proofs).slice(0, 1)
    : normalizeProofs(data.proofs).slice(0, 3);
  const testimonials = compact
    ? normalizeTestimonials(data.testimonials).slice(0, 1)
    : normalizeTestimonials(data.testimonials).slice(0, 3);
  const hasContact = Boolean(data.email || data.linkedin || data.github || data.website);
  const handle = buildProfileHandle(data.name);
  const firstName = data.name.trim().split(/\s+/)[0] || "This member";
  const initial = (data.name || "?").slice(0, 1).toUpperCase();

  const contactLinkClass = "profile-action pointer-events-auto w-full";
  const disabledContactClass = "profile-action w-full cursor-default opacity-70";

  return (
    <div
      data-analytics-scroll-root={useExternalScrollRoot ? undefined : "true"}
      className={`relative z-10 ${
        useExternalScrollRoot ? "" : "h-full overflow-y-auto scrollbar-hide"
      } ${compact ? "px-2 py-3 sm:px-3 sm:py-4" : "px-3 py-5 sm:p-6 md:p-8"}`}
    >
      <div className={`mx-auto max-w-6xl ${compact ? "space-y-2.5" : "space-y-4"}`}>
        <ProfileWindow
          as="div"
          title={`${handle} // living profile`}
          status={<span className="profile-status">Profile page</span>}
          contentClassName={compact ? "p-3 sm:p-4" : "p-4 sm:p-6"}
        >
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(191,219,254,0.58)]">
                {handle}
              </p>
              <NameHeading
                className={`${
                  compact ? "mt-1 text-2xl sm:text-3xl" : "mt-1.5 text-3xl sm:text-4xl md:text-5xl"
                } font-heading font-bold leading-[0.98] text-[#F0F4FF] drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]`}
              >
                {data.name}
              </NameHeading>
              <p
                className={`${
                  compact ? "mt-1.5 text-[10px]" : "mt-2 text-xs sm:text-sm"
                } font-mono uppercase tracking-[0.16em] text-[var(--profile-accent)]`}
              >
                {data.headline}
              </p>
            </div>
            {data.location ? (
              <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(240,244,255,0.48)] sm:text-right sm:text-xs">
                Based in {data.location}
              </p>
            ) : null}
          </header>
        </ProfileWindow>

        <div
          className={`grid items-start ${
            compact
              ? "gap-2.5 sm:grid-cols-[minmax(180px,0.34fr)_minmax(0,0.66fr)]"
              : "gap-4 lg:grid-cols-[280px_minmax(0,1fr)]"
          }`}
        >
          <aside className={compact ? "space-y-2.5" : "space-y-4"}>
            <ProfilePanel
              title={`${firstName}'s profile`}
              meta={handle}
              contentClassName={compact ? "p-3" : "p-4"}
            >
              <SectionHeading className="sr-only">Profile</SectionHeading>
              <div className="mx-auto max-w-[15rem]">
                <div className={`profile-avatar-frame relative aspect-square w-full ${compact ? "max-w-32" : "max-w-56"} mx-auto`}>
                  {data.avatar_url ? (
                    <Image
                      src={data.avatar_url}
                      alt={data.name}
                      fill
                      sizes={compact ? "128px" : "224px"}
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,rgba(59,130,246,0.72),rgba(240,171,252,0.5))] font-heading text-5xl font-bold text-[#eff6ff] sm:text-6xl">
                      {initial}
                    </div>
                  )}
                </div>
              </div>

              <div className={`${compact ? "mt-3" : "mt-4"} profile-meta-grid`}>
                <span className="profile-meta-label">Name</span>
                <span className="profile-meta-value">{data.name}</span>
                <span className="profile-meta-label">Role</span>
                <span className="profile-meta-value">{data.headline}</span>
                {data.location ? (
                  <>
                    <span className="profile-meta-label">Location</span>
                    <span className="profile-meta-value">{data.location}</span>
                  </>
                ) : null}
                <span className="profile-meta-label">Profile</span>
                <span className="profile-meta-value">{handle}</span>
              </div>
            </ProfilePanel>

            {hasContact ? (
              <ProfilePanel
                title={`Contact ${firstName}`}
                contentClassName={compact ? "p-3" : "p-4"}
              >
                <SectionHeading className="sr-only">Contact {firstName}</SectionHeading>
                <div className="grid grid-cols-2 gap-2">
                  {data.email ? (
                    disableExternalLinks ? (
                      <span className={disabledContactClass}>Email</span>
                    ) : (
                      <a
                        href={`mailto:${data.email}`}
                        data-analytics-target-key="email"
                        data-analytics-target-label={data.email}
                        className={contactLinkClass}
                      >
                        Email
                      </a>
                    )
                  ) : null}
                  {data.linkedin ? (
                    disableExternalLinks ? (
                      <span title="LinkedIn" aria-label="LinkedIn profile" className={disabledContactClass}>
                        LinkedIn
                      </span>
                    ) : (
                      <a
                        href={toExternalHref(data.linkedin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="LinkedIn"
                        aria-label="LinkedIn profile"
                        data-analytics-target-key="linkedin"
                        data-analytics-target-label="LinkedIn"
                        className={contactLinkClass}
                      >
                        LinkedIn
                      </a>
                    )
                  ) : null}
                  {data.github ? (
                    disableExternalLinks ? (
                      <span className={disabledContactClass}>GitHub</span>
                    ) : (
                      <a
                        href={data.github.startsWith("http") ? data.github : `https://github.com/${data.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-analytics-target-key="github"
                        data-analytics-target-label="GitHub"
                        className={contactLinkClass}
                      >
                        GitHub
                      </a>
                    )
                  ) : null}
                  {data.website ? (
                    disableExternalLinks ? (
                      <span className={disabledContactClass}>Website</span>
                    ) : (
                      <a
                        href={toExternalHref(data.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-analytics-target-key="website"
                        data-analytics-target-label="Website"
                        className={contactLinkClass}
                      >
                        Website
                      </a>
                    )
                  ) : null}
                </div>
                {data.email ? (
                  <p className="mt-3 break-all text-[10px] leading-5 text-[rgba(240,244,255,0.42)]">
                    {data.email}
                  </p>
                ) : null}
              </ProfilePanel>
            ) : null}

            {skills.length ? (
              <ProfilePanel
                title="Skills & interests"
                contentClassName={compact ? "p-3" : "p-4"}
                className="scroll-mt-4"
              >
                <section data-analytics-section="skills">
                  <SectionHeading className="sr-only">Skills</SectionHeading>
                  <div className={compact ? "space-y-2.5" : "space-y-3.5"}>
                    {skills.map((group) => (
                      <div key={group.category}>
                        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[rgba(191,219,254,0.54)]">
                          {group.category}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((skill) => (
                            <span
                              key={skill}
                              className="border border-[var(--profile-border)] bg-[rgba(59,130,246,0.09)] px-2 py-1 text-[10px] leading-4 text-[var(--profile-accent)]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </ProfilePanel>
            ) : null}

            {!compact && data.education?.length ? (
              <ProfilePanel title="Education" contentClassName="p-4">
                <section data-analytics-section="education">
                  <SectionHeading className="sr-only">Education</SectionHeading>
                  <div className="space-y-3">
                    {data.education.map((education) => (
                      <article key={`${education.school}-${education.degree}-${education.year}`}>
                        <p className="text-sm font-semibold leading-5 text-[#F0F4FF]">{education.degree}</p>
                        <p className="mt-1 text-xs leading-5 text-[rgba(240,244,255,0.62)]">
                          {education.school}
                        </p>
                        {education.year ? (
                          <p className="mt-1 font-mono text-[10px] text-[rgba(240,244,255,0.4)]">
                            {education.year}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              </ProfilePanel>
            ) : null}

            {!compact && certs.length ? (
              <ProfilePanel title="Credentials" contentClassName="p-4">
                <section data-analytics-section="certifications">
                  <SectionHeading className="sr-only">Certifications</SectionHeading>
                  <div className="space-y-3">
                    {certs.map((certification) => (
                      <article
                        key={certification.name}
                        className="border-l-2 border-[var(--profile-title-bright)] pl-3"
                      >
                        <p className="text-sm font-semibold leading-5 text-[#F0F4FF]">
                          {certification.name}
                        </p>
                        {certification.issuer || certification.date ? (
                          <p className="mt-1 text-[11px] leading-5 text-[rgba(240,244,255,0.5)]">
                            {certification.issuer}
                            {certification.issuer && certification.date ? " · " : ""}
                            {certification.date}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              </ProfilePanel>
            ) : null}
          </aside>

          <div className={compact ? "space-y-2.5" : "space-y-4"}>
            {data.summary ? (
              <ProfilePanel
                title={`About ${firstName}`}
                meta="About me"
                contentClassName={compact ? "p-3" : "p-4 sm:p-5"}
              >
                <section data-analytics-section="summary">
                  <SectionHeading className="sr-only">About {firstName}</SectionHeading>
                  <p
                    className={`${
                      compact ? "line-clamp-2 text-xs leading-5" : "text-sm leading-6 sm:text-base sm:leading-7"
                    } text-[rgba(240,244,255,0.76)]`}
                  >
                    {data.summary}
                  </p>
                </section>
              </ProfilePanel>
            ) : null}

            {data.stats?.length ? (
              <ProfilePanel
                title="Profile highlights"
                meta={`${Math.min(data.stats.length, 4)} pinned`}
                contentClassName={compact ? "p-3" : "p-4"}
              >
                <SectionHeading className="sr-only">Profile highlights</SectionHeading>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {data.stats.slice(0, 4).map((stat) => (
                    <article
                      key={`${stat.label}-${stat.value}`}
                      className="border border-[rgba(255,255,255,0.08)] bg-[rgba(3,10,23,0.45)] p-2.5 text-center"
                    >
                      <p className="font-mono text-base text-[var(--profile-accent)] sm:text-lg">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-[8px] uppercase leading-4 tracking-[0.12em] text-[rgba(240,244,255,0.46)]">
                        {stat.label}
                      </p>
                    </article>
                  ))}
                </div>
              </ProfilePanel>
            ) : null}

            {proofs.length ? (
              <ProfilePanel
                title="Featured proof"
                meta="Proof over claims"
                contentClassName={compact ? "p-3" : "p-4 sm:p-5"}
              >
                <section data-analytics-section="proof">
                  <SectionHeading className="sr-only">Proof</SectionHeading>
                  <div className={`grid ${compact ? "gap-2" : "gap-3 md:grid-cols-2"}`}>
                    {proofs.map((proof) => {
                      const proofUrl =
                        !disableExternalLinks && proof.url ? toExternalHref(proof.url) : null;

                      return (
                        <article
                          key={proof.id}
                          className="border border-[rgba(96,165,250,0.2)] bg-[rgba(59,130,246,0.06)] p-3 sm:p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-[rgba(59,130,246,0.14)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--profile-accent)]">
                              {formatProofTypeLabel(proof.type)}
                            </span>
                            {proof.source_label ? (
                              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[rgba(240,244,255,0.38)]">
                                {proof.source_label}
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-3 text-sm font-semibold text-[#F0F4FF]">{proof.title}</h3>
                          {proof.summary ? (
                            <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.62)]">
                              {proof.summary}
                            </p>
                          ) : null}
                          {proof.outcome ? (
                            <p className="mt-3 text-xs font-medium leading-5 text-[var(--profile-accent)]">
                              {proof.outcome}
                            </p>
                          ) : null}
                          {proofUrl ? (
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-analytics-target-key="proof_item"
                              data-analytics-target-label={proof.title}
                              className="profile-link pointer-events-auto mt-3 inline-flex text-xs"
                            >
                              Open proof link →
                            </a>
                          ) : proof.url ? (
                            <span className="mt-3 inline-flex text-xs text-[rgba(191,219,254,0.52)]">
                              Proof link included
                            </span>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              </ProfilePanel>
            ) : null}

            {experience?.length ? (
              <ProfilePanel
                title="Experience"
                meta={`${experience.length} ${experience.length === 1 ? "role" : "roles"}`}
                contentClassName={compact ? "p-3" : "p-4 sm:p-5"}
              >
                <section data-analytics-section="experience">
                  <SectionHeading className="sr-only">Experience</SectionHeading>
                  <div className={compact ? "space-y-2" : "space-y-3"}>
                    {experience.map((role) => (
                      <article
                        key={`${role.company}-${role.title}-${role.dates}`}
                        className="border-l-2 border-[var(--profile-title-bright)] bg-[rgba(3,10,23,0.32)] p-3 sm:p-4"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-[#F0F4FF] sm:text-base">
                              {role.title}
                            </h3>
                            <p className="mt-1 text-xs text-[rgba(240,244,255,0.58)]">
                              {role.url && !disableExternalLinks ? (
                                <a
                                  href={toExternalHref(role.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-analytics-target-key="experience_company"
                                  data-analytics-target-label={role.company}
                                  className="profile-link pointer-events-auto"
                                >
                                  {role.company}
                                </a>
                              ) : (
                                role.company
                              )}
                            </p>
                          </div>
                          <p className="shrink-0 font-mono text-[10px] text-[rgba(240,244,255,0.42)]">
                            {role.dates}
                          </p>
                        </div>
                        {!compact && role.highlights?.length ? (
                          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-[rgba(240,244,255,0.62)]">
                            {role.highlights.map((highlight) => (
                              <li key={`${role.company}-${highlight}`} className="flex gap-2">
                                <span aria-hidden="true" className="text-[var(--profile-accent)]">
                                  →
                                </span>
                                <span>{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              </ProfilePanel>
            ) : null}

            {!compact && data.projects?.length ? (
              <ProfilePanel
                title="Top work"
                meta={`${data.projects.length} ${data.projects.length === 1 ? "project" : "projects"}`}
                contentClassName="p-4 sm:p-5"
              >
                <section data-analytics-section="projects">
                  <SectionHeading className="sr-only">Projects</SectionHeading>
                  <div className="grid gap-3 md:grid-cols-2">
                    {data.projects.map((project) => {
                      const projectUrl =
                        !disableExternalLinks && project.url ? toExternalHref(project.url) : null;
                      const content = (
                        <>
                          <h3 className="text-sm font-semibold text-[#F0F4FF]">{project.name}</h3>
                          <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.6)]">
                            {project.description}
                          </p>
                          {project.tech?.length ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {project.tech.map((technology) => (
                                <span
                                  key={`${project.name}-${technology}`}
                                  className="border border-[rgba(96,165,250,0.18)] bg-[rgba(59,130,246,0.08)] px-2 py-1 font-mono text-[9px] text-[var(--profile-accent)]"
                                >
                                  {technology}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </>
                      );

                      return (
                        <article key={project.name}>
                          {projectUrl ? (
                            <a
                              href={projectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-analytics-target-key="project"
                              data-analytics-target-label={project.name}
                              className="pointer-events-auto block h-full border border-[rgba(96,165,250,0.22)] bg-[rgba(59,130,246,0.05)] p-4 transition-colors hover:bg-[rgba(59,130,246,0.1)]"
                            >
                              {content}
                              <span className="profile-link mt-3 inline-flex text-xs">Open project →</span>
                            </a>
                          ) : (
                            <div className="h-full border border-[rgba(255,255,255,0.08)] bg-[rgba(3,10,23,0.32)] p-4">
                              {content}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              </ProfilePanel>
            ) : null}

            {testimonials.length ? (
              <ProfilePanel
                title="People I've worked with"
                meta="Approved notes"
                contentClassName={compact ? "p-3" : "p-4 sm:p-5"}
              >
                <section data-analytics-section="testimonials">
                  <SectionHeading className="sr-only">Testimonials</SectionHeading>
                  <div className={`grid ${compact ? "gap-2" : "gap-3 md:grid-cols-2"}`}>
                    {testimonials.map((testimonial) => (
                      <article
                        key={testimonial.id}
                        className="border border-[rgba(255,255,255,0.08)] bg-[rgba(3,10,23,0.34)] p-3 sm:p-4"
                      >
                        <p className="text-sm leading-6 text-[rgba(240,244,255,0.76)]">
                          &ldquo;{testimonial.quote}&rdquo;
                        </p>
                        <p className="mt-3 text-xs font-semibold text-[#F0F4FF]">
                          {testimonial.name}
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-[rgba(240,244,255,0.42)]">
                          {[testimonial.role, testimonial.company].filter(Boolean).join(" · ")}
                          {testimonial.approved_at ? ` · Approved ${testimonial.approved_at}` : ""}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              </ProfilePanel>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
