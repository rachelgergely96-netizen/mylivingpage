import React from "react";

export const LIVING_PAGE_EDITOR_SECTIONS = [
  { id: "editor-section-setup", label: "Setup" },
  { id: "editor-section-profile", label: "Profile" },
  { id: "editor-section-summary", label: "Summary" },
  { id: "editor-section-stats", label: "Impact" },
  { id: "editor-section-experience", label: "Experience" },
  { id: "editor-section-education", label: "Education" },
  { id: "editor-section-skills", label: "Skills" },
  { id: "editor-section-projects", label: "Projects" },
  { id: "editor-section-proof", label: "Proof" },
  { id: "editor-section-testimonials", label: "Voices" },
  { id: "editor-section-certifications", label: "Credentials" },
  { id: "editor-section-design", label: "Design" },
  { id: "editor-section-ats", label: "ATS check" },
] as const;

export default function EditorSectionNav() {
  return (
    <nav
      aria-label="Editor sections"
      data-editor-section-nav
      className="site-panel overflow-hidden"
    >
      <div className="flex items-center justify-between gap-4 border-b border-site-border px-4 py-3">
        <div>
          <p className="site-eyebrow">Page sections</p>
          <p className="mt-1 text-xs text-site-muted">Jump directly to what you want to change.</p>
        </div>
        <span className="hidden font-mono text-[10px] tracking-[0.08em] text-site-muted sm:block">
          {LIVING_PAGE_EDITOR_SECTIONS.length} stops
        </span>
      </div>
      <ol className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {LIVING_PAGE_EDITOR_SECTIONS.map((section, index) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-none border border-site-border bg-site-canvas-alt px-3 py-2 text-xs font-semibold text-site-secondary transition-colors hover:border-site-border-strong hover:bg-site-surface-raised hover:text-site-text"
            >
              <span aria-hidden="true" className="font-mono text-[9px] text-site-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              {section.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
