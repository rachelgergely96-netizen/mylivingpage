"use client";

import { useState } from "react";
import type { ResumeData } from "@/types/resume";

/* ── Types ─────────────────────────────────────────────── */

interface GuidedFlowProps {
  guidedData: Partial<ResumeData>;
  onUpdate: (data: Partial<ResumeData>) => void;
  onComplete: (data: ResumeData) => void;
  onBack: () => void;
}

interface ExperienceEntry {
  title: string;
  company: string;
  dates: string;
  highlights: string[];
}

interface EducationEntry {
  degree: string;
  school: string;
  year: string;
}

interface CertEntry {
  name: string;
  issuer: string | null;
  date: string | null;
}

interface SkillGroup {
  category: string;
  items: string[];
}

interface ProjectEntry {
  name: string;
  description: string;
  tech: string[];
  url: string | null;
}

/* ── Constants ─────────────────────────────────────────── */

const TOTAL_STEPS = 6;

const STEP_PROMPTS = [
  { heading: "Let's start with who you are", sub: "The basics that go at the top of your page." },
  { heading: "Where can people find you?", sub: "Add any professional links you'd like to share." },
  { heading: "Tell me about your experience", sub: "Add your roles, starting with the most recent." },
  { heading: "Education and credentials", sub: "Degrees, certifications, and licenses." },
  { heading: "Skills and projects", sub: "What you're great at and what you've built." },
  { heading: "The finishing touches", sub: "A summary and a few standout numbers." },
];

/* ── Helpers ────────────────────────────────────────────── */

const inputClass =
  "w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#F5F0EB] placeholder:text-[rgba(245,240,235,0.3)] focus:border-[#D4A654] focus:outline-none";

const labelClass = "mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(245,240,235,0.4)]";

const addBtnClass =
  "rounded-full border border-dashed border-[rgba(255,255,255,0.15)] px-4 py-2 text-xs text-[rgba(245,240,235,0.5)] hover:border-[rgba(212,166,84,0.35)] hover:text-[#F0D48A] transition-colors";

const removeBtnClass =
  "text-[10px] text-[rgba(245,240,235,0.3)] hover:text-[#ff8e8e] transition-colors";

/* ── Component ──────────────────────────────────────────── */

export default function GuidedFlow({ guidedData, onUpdate, onComplete, onBack }: GuidedFlowProps) {
  const [step, setStep] = useState(0);

  /* ── Local field state derived from guidedData ──────── */
  const name = guidedData.name ?? "";
  const headline = guidedData.headline ?? "";
  const location = guidedData.location ?? "";
  const email = guidedData.email ?? "";
  const linkedin = guidedData.linkedin ?? "";
  const github = guidedData.github ?? "";
  const website = guidedData.website ?? "";
  const experience = (guidedData.experience ?? []) as ExperienceEntry[];
  const education = (guidedData.education ?? []) as EducationEntry[];
  const certifications = (guidedData.certifications ?? []) as CertEntry[];
  const skills = (guidedData.skills ?? [{ category: "General", items: [] }]) as SkillGroup[];
  const projects = (guidedData.projects ?? []) as ProjectEntry[];
  const summary = guidedData.summary ?? "";
  const stats = (guidedData.stats ?? []) as Array<{ value: string; label: string }>;

  const set = (patch: Partial<ResumeData>) => onUpdate({ ...guidedData, ...patch });

  /* ── Navigation ─────────────────────────────────────── */
  const canContinue = () => {
    if (step === 0) return name.trim().length > 0 && headline.trim().length > 0;
    return true; // all other steps are skippable
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Final step — assemble and complete
      const assembled: ResumeData = {
        name: name.trim(),
        headline: headline.trim(),
        location: location.trim(),
        email: email.trim() || null,
        linkedin: linkedin.trim() || null,
        github: github.trim() || null,
        website: website.trim() || null,
        avatar_url: guidedData.avatar_url ?? null,
        summary: summary.trim(),
        experience: experience.filter((e) => e.title.trim() && e.company.trim()),
        education: education.filter((e) => e.degree.trim() && e.school.trim()),
        projects: projects.filter((p) => p.name.trim()),
        skills: skills
          .map((g) => ({ category: g.category.trim() || "General", items: g.items.filter((i) => i.trim()) }))
          .filter((g) => g.items.length > 0),
        certifications: certifications.filter((c) => c.name.trim()),
        stats: stats.filter((s) => s.value.trim() && s.label.trim()),
      };
      onComplete(assembled);
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else onBack();
  };

  /* ── Progress dots ──────────────────────────────────── */
  const progressDots = (
    <div className="mb-6 flex items-center justify-center gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i <= step ? 20 : 12,
            background: i <= step ? "linear-gradient(90deg, #D4A654, #F0D48A)" : "rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );

  /* ── Step 0: Basics ─────────────────────────────────── */
  const renderBasics = () => (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Full Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Jane Smith"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Professional Headline *</label>
        <input
          type="text"
          value={headline}
          onChange={(e) => set({ headline: e.target.value })}
          placeholder="Senior Software Engineer"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="San Francisco, CA"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="jane@example.com"
          className={inputClass}
        />
      </div>
    </div>
  );

  /* ── Step 1: Links ──────────────────────────────────── */
  const renderLinks = () => (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>LinkedIn</label>
        <input
          type="text"
          value={linkedin}
          onChange={(e) => set({ linkedin: e.target.value })}
          placeholder="linkedin.com/in/janesmith"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>GitHub</label>
        <input
          type="text"
          value={github}
          onChange={(e) => set({ github: e.target.value })}
          placeholder="janesmith"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Website</label>
        <input
          type="text"
          value={website}
          onChange={(e) => set({ website: e.target.value })}
          placeholder="janesmith.dev"
          className={inputClass}
        />
      </div>
      <p className="text-xs text-[rgba(245,240,235,0.35)]">All links are optional — skip if none apply.</p>
    </div>
  );

  /* ── Step 2: Experience ─────────────────────────────── */
  const updateExp = (index: number, patch: Partial<ExperienceEntry>) => {
    const next = [...experience];
    next[index] = { ...next[index], ...patch };
    set({ experience: next });
  };

  const addExp = () => set({ experience: [...experience, { title: "", company: "", dates: "", highlights: [] }] });

  const removeExp = (index: number) => set({ experience: experience.filter((_, i) => i !== index) });

  const renderExperience = () => (
    <div className="space-y-4">
      {experience.map((exp, i) => (
        <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(245,240,235,0.35)]">Role {i + 1}</p>
            <button type="button" onClick={() => removeExp(i)} className={removeBtnClass}>Remove</button>
          </div>
          <input
            type="text"
            value={exp.title}
            onChange={(e) => updateExp(i, { title: e.target.value })}
            placeholder="Job Title"
            className={inputClass}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={exp.company}
              onChange={(e) => updateExp(i, { company: e.target.value })}
              placeholder="Company"
              className={inputClass}
            />
            <input
              type="text"
              value={exp.dates}
              onChange={(e) => updateExp(i, { dates: e.target.value })}
              placeholder="2022 – Present"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Key highlights (one per line)</label>
            <textarea
              value={exp.highlights.join("\n")}
              onChange={(e) => updateExp(i, { highlights: e.target.value.split("\n") })}
              placeholder={"Led migration to microservices\nReduced API latency by 40%"}
              rows={3}
              className={`${inputClass} min-h-[80px] resize-y font-mono text-xs leading-6`}
            />
          </div>
        </div>
      ))}
      <button type="button" onClick={addExp} className={addBtnClass}>+ Add a role</button>
      {experience.length === 0 && (
        <p className="text-xs text-[rgba(245,240,235,0.35)]">No experience yet? You can skip this step.</p>
      )}
    </div>
  );

  /* ── Step 3: Education & Certs ──────────────────────── */
  const updateEdu = (index: number, patch: Partial<EducationEntry>) => {
    const next = [...education];
    next[index] = { ...next[index], ...patch };
    set({ education: next });
  };

  const addEdu = () => set({ education: [...education, { degree: "", school: "", year: "" }] });
  const removeEdu = (index: number) => set({ education: education.filter((_, i) => i !== index) });

  const updateCert = (index: number, patch: Partial<CertEntry>) => {
    const next = [...certifications];
    next[index] = { ...next[index], ...patch };
    set({ certifications: next });
  };

  const addCert = () => set({ certifications: [...certifications, { name: "", issuer: null, date: null }] });
  const removeCert = (index: number) => set({ certifications: certifications.filter((_, i) => i !== index) });

  const renderEducation = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[rgba(245,240,235,0.5)]">Education</p>
        {education.map((edu, i) => (
          <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(245,240,235,0.35)]">Degree {i + 1}</p>
              <button type="button" onClick={() => removeEdu(i)} className={removeBtnClass}>Remove</button>
            </div>
            <input
              type="text"
              value={edu.degree}
              onChange={(e) => updateEdu(i, { degree: e.target.value })}
              placeholder="B.S. Computer Science"
              className={inputClass}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={edu.school}
                onChange={(e) => updateEdu(i, { school: e.target.value })}
                placeholder="University Name"
                className={inputClass}
              />
              <input
                type="text"
                value={edu.year}
                onChange={(e) => updateEdu(i, { year: e.target.value })}
                placeholder="2020"
                className={inputClass}
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addEdu} className={addBtnClass}>+ Add education</button>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[rgba(245,240,235,0.5)]">Certifications</p>
        {certifications.map((cert, i) => (
          <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(245,240,235,0.35)]">Certification {i + 1}</p>
              <button type="button" onClick={() => removeCert(i)} className={removeBtnClass}>Remove</button>
            </div>
            <input
              type="text"
              value={cert.name}
              onChange={(e) => updateCert(i, { name: e.target.value })}
              placeholder="AWS Solutions Architect"
              className={inputClass}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={cert.issuer ?? ""}
                onChange={(e) => updateCert(i, { issuer: e.target.value || null })}
                placeholder="Issuing organization"
                className={inputClass}
              />
              <input
                type="text"
                value={cert.date ?? ""}
                onChange={(e) => updateCert(i, { date: e.target.value || null })}
                placeholder="2023"
                className={inputClass}
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addCert} className={addBtnClass}>+ Add certification</button>
      </div>
    </div>
  );

  /* ── Step 4: Skills & Projects ──────────────────────── */
  const updateSkill = (index: number, patch: Partial<SkillGroup>) => {
    const next = [...skills];
    next[index] = { ...next[index], ...patch };
    set({ skills: next });
  };

  const addSkillGroup = () => set({ skills: [...skills, { category: "", items: [] }] });
  const removeSkillGroup = (index: number) => set({ skills: skills.filter((_, i) => i !== index) });

  const updateProject = (index: number, patch: Partial<ProjectEntry>) => {
    const next = [...projects];
    next[index] = { ...next[index], ...patch };
    set({ projects: next });
  };

  const addProject = () => set({ projects: [...projects, { name: "", description: "", tech: [], url: null }] });
  const removeProject = (index: number) => set({ projects: projects.filter((_, i) => i !== index) });

  const renderSkillsProjects = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[rgba(245,240,235,0.5)]">Skills</p>
        {skills.map((group, i) => (
          <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={group.category}
                onChange={(e) => updateSkill(i, { category: e.target.value })}
                placeholder="Category (e.g. Languages, Tools)"
                className="bg-transparent text-xs font-medium uppercase tracking-[0.14em] text-[rgba(245,240,235,0.5)] placeholder:text-[rgba(245,240,235,0.25)] focus:outline-none"
              />
              {skills.length > 1 && (
                <button type="button" onClick={() => removeSkillGroup(i)} className={removeBtnClass}>Remove</button>
              )}
            </div>
            <input
              type="text"
              value={group.items.join(", ")}
              onChange={(e) => updateSkill(i, { items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="TypeScript, React, Node.js"
              className={inputClass}
            />
            <p className="text-[10px] text-[rgba(245,240,235,0.25)]">Separate skills with commas</p>
          </div>
        ))}
        <button type="button" onClick={addSkillGroup} className={addBtnClass}>+ Add skill category</button>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[rgba(245,240,235,0.5)]">Projects</p>
        {projects.map((proj, i) => (
          <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(245,240,235,0.35)]">Project {i + 1}</p>
              <button type="button" onClick={() => removeProject(i)} className={removeBtnClass}>Remove</button>
            </div>
            <input
              type="text"
              value={proj.name}
              onChange={(e) => updateProject(i, { name: e.target.value })}
              placeholder="Project Name"
              className={inputClass}
            />
            <textarea
              value={proj.description}
              onChange={(e) => updateProject(i, { description: e.target.value })}
              placeholder="A brief description of the project"
              rows={2}
              className={`${inputClass} min-h-[60px] resize-y`}
            />
            <input
              type="text"
              value={proj.tech.join(", ")}
              onChange={(e) => updateProject(i, { tech: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="Next.js, Supabase, Stripe"
              className={inputClass}
            />
            <p className="text-[10px] text-[rgba(245,240,235,0.25)]">Separate technologies with commas</p>
          </div>
        ))}
        <button type="button" onClick={addProject} className={addBtnClass}>+ Add project</button>
      </div>
    </div>
  );

  /* ── Step 5: Summary & Stats ────────────────────────── */
  const updateStat = (index: number, patch: Partial<{ value: string; label: string }>) => {
    const next = [...stats];
    next[index] = { ...next[index], ...patch };
    set({ stats: next });
  };

  const addStat = () => {
    if (stats.length < 4) set({ stats: [...stats, { value: "", label: "" }] });
  };

  const removeStat = (index: number) => set({ stats: stats.filter((_, i) => i !== index) });

  const renderSummaryStats = () => (
    <div className="space-y-6">
      <div>
        <label className={labelClass}>Professional Summary</label>
        <p className="mb-2 text-xs text-[rgba(245,240,235,0.35)]">In 2-3 sentences, what makes you great at what you do?</p>
        <textarea
          value={summary}
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="Full-stack engineer with 8 years of experience building scalable web applications..."
          rows={4}
          className={`${inputClass} min-h-[100px] resize-y`}
        />
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[rgba(245,240,235,0.5)]">Highlight Stats</p>
          <p className="mt-1 text-xs text-[rgba(245,240,235,0.35)]">Up to 4 standout numbers (e.g. "8+" / "Years Experience")</p>
        </div>
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="text"
              value={stat.value}
              onChange={(e) => updateStat(i, { value: e.target.value })}
              placeholder="8+"
              className={`${inputClass} w-24 shrink-0 text-center`}
            />
            <input
              type="text"
              value={stat.label}
              onChange={(e) => updateStat(i, { label: e.target.value })}
              placeholder="Years Experience"
              className={`${inputClass} flex-1`}
            />
            <button type="button" onClick={() => removeStat(i)} className={removeBtnClass}>Remove</button>
          </div>
        ))}
        {stats.length < 4 && (
          <button type="button" onClick={addStat} className={addBtnClass}>+ Add stat</button>
        )}
      </div>
    </div>
  );

  /* ── Render ─────────────────────────────────────────── */
  const stepRenderers = [renderBasics, renderLinks, renderExperience, renderEducation, renderSkillsProjects, renderSummaryStats];

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
      {progressDots}
      <p className="text-xs uppercase tracking-[0.2em] text-[#D4A654]">Step 1 · {step + 1} of {TOTAL_STEPS}</p>
      <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#F5F0EB]">{STEP_PROMPTS[step].heading}</h2>
      <p className="mt-2 mb-6 text-xs sm:text-sm text-[rgba(245,240,235,0.55)]">{STEP_PROMPTS[step].sub}</p>

      {stepRenderers[step]()}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={goBack}
          className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(245,240,235,0.7)] hover:border-[rgba(212,166,84,0.35)] hover:text-[#F0D48A]"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue()}
          onClick={goNext}
          className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(212,166,84,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step < TOTAL_STEPS - 1 ? "Continue" : "Continue to Theme Selection"}
        </button>
      </div>
    </section>
  );
}
