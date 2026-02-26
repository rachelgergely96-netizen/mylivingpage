import type { ResumeData } from "@/types/resume";

interface ResumeLayoutProps {
  data: ResumeData;
  compact?: boolean;
}

export default function ResumeLayout({ data, compact = false }: ResumeLayoutProps) {
  const statCount = Math.min(Math.max(data.stats?.length ?? 0, 1), 4);
  const headingSize = compact ? "text-3xl" : "text-4xl";
  const summarySize = compact ? "text-sm" : "text-base";

  return (
    <div className="relative z-10 h-full overflow-y-auto p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className={`${headingSize} font-heading font-bold text-[#F5F0EB] drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]`}>
              {data.name}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#D4A654]">{data.headline}</p>
            {data.location ? <p className="mt-1 text-sm text-[rgba(245,240,235,0.4)]">{data.location}</p> : null}
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A654] to-[#E8845C] font-heading text-2xl font-bold text-[#1A0A2E] shadow-[0_0_28px_rgba(212,166,84,0.3)]">
            {(data.name || "?").slice(0, 1).toUpperCase()}
          </div>
        </header>

        {data.summary ? <p className={`${summarySize} mb-6 leading-7 text-[rgba(245,240,235,0.6)]`}>{data.summary}</p> : null}

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

        {data.skills?.length ? (
          <section className="mb-4">
            <h2 className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D4A654]">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[rgba(212,166,84,0.25)] bg-[rgba(212,166,84,0.08)] px-3 py-1 text-xs text-[#F0D48A]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {data.certifications?.length ? (
          <section>
            <h2 className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#D4A654]">Certifications</h2>
            <div className="flex flex-wrap gap-2">
              {data.certifications.map((certification) => (
                <span
                  key={certification}
                  className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs text-[rgba(245,240,235,0.6)]"
                >
                  {certification}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
