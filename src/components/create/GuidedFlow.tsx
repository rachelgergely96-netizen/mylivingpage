"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import DelimitedListInput from "@/components/create/DelimitedListInput";
import type { ResumeData } from "@/types/resume";

/* ── Types ─────────────────────────────────────────────── */

interface GuidedFlowProps {
  guidedData: Partial<ResumeData>;
  onUpdate: (data: Partial<ResumeData>) => void;
  onComplete: (data: ResumeData) => void;
  onBack: () => void;
  consolidatedReview?: boolean;
}

interface ExperienceEntry {
  title: string;
  company: string;
  dates: string;
  highlights: string[];
  url: string | null;
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
  "site-field px-4 py-3 text-sm";

const labelClass = "mb-1.5 block text-sm font-semibold text-site-secondary";

const addBtnClass =
  "site-button site-button-secondary border-dashed";

const removeBtnClass =
  "site-button site-button-danger px-3 py-2 text-xs";

/* ── Component ──────────────────────────────────────────── */

export default function GuidedFlow({
  guidedData,
  onUpdate,
  onComplete,
  onBack,
  consolidatedReview = false,
}: GuidedFlowProps) {
  const [step, setStep] = useState(0);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const entryIdPrefix = useId();
  const newEntryCounterRef = useRef(0);
  const createNewEntryId = (kind: string) => {
    newEntryCounterRef.current += 1;
    return `${entryIdPrefix}-${kind}-new-${newEntryCounterRef.current}`;
  };

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
  const [experienceIds, setExperienceIds] = useState(() => experience.map((_, index) => `${entryIdPrefix}-role-${index}`));
  const [educationIds, setEducationIds] = useState(() => education.map((_, index) => `${entryIdPrefix}-education-${index}`));
  const [certificationIds, setCertificationIds] = useState(() => certifications.map((_, index) => `${entryIdPrefix}-certification-${index}`));
  const [skillIds, setSkillIds] = useState(() => skills.map((_, index) => `${entryIdPrefix}-skill-${index}`));
  const [projectIds, setProjectIds] = useState(() => projects.map((_, index) => `${entryIdPrefix}-project-${index}`));
  const [statIds, setStatIds] = useState(() => stats.map((_, index) => `${entryIdPrefix}-stat-${index}`));

  const set = (patch: Partial<ResumeData>) => onUpdate({ ...guidedData, ...patch });

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [step]);

  /* ── Navigation ─────────────────────────────────────── */
  const canContinue = () => {
    if (step === 0) return name.trim().length > 0 && headline.trim().length > 0;
    return true; // all other steps are skippable
  };

  const completeFlow = () => {
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
      experience: experience.filter((entry) => entry.title.trim() && entry.company.trim()),
      education: education.filter((entry) => entry.degree.trim() && entry.school.trim()),
      projects: projects.filter((project) => project.name.trim()),
      skills: skills
        .map((group) => ({
          category: group.category.trim() || "General",
          items: group.items.filter((item) => item.trim()),
        }))
        .filter((group) => group.items.length > 0),
      certifications: certifications.filter((certification) => certification.name.trim()),
      stats: stats.filter((stat) => stat.value.trim() && stat.label.trim()),
    };
    onComplete(assembled);
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      completeFlow();
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
          className="h-1.5 transition-all duration-300"
          style={{
            width: i <= step ? 20 : 12,
            background: i <= step ? "var(--site-action)" : "var(--site-border)",
          }}
        />
      ))}
    </div>
  );

  /* ── Step 0: Basics ─────────────────────────────────── */
  const renderBasics = () => (
    <div className="space-y-4">
      <div>
        <label htmlFor="guided-full-name" className={labelClass}>Full Name *</label>
        <input
          id="guided-full-name"
          type="text"
          value={name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Jane Smith"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="guided-headline" className={labelClass}>Professional Headline *</label>
        <input
          id="guided-headline"
          type="text"
          value={headline}
          onChange={(e) => set({ headline: e.target.value })}
          placeholder="Senior Software Engineer"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="guided-location" className={labelClass}>Location</label>
        <input
          id="guided-location"
          type="text"
          value={location}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="San Francisco, CA"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="guided-email" className={labelClass}>Email</label>
        <input
          id="guided-email"
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
        <label htmlFor="guided-linkedin" className={labelClass}>LinkedIn</label>
        <input
          id="guided-linkedin"
          type="text"
          value={linkedin}
          onChange={(e) => set({ linkedin: e.target.value })}
          placeholder="linkedin.com/in/janesmith"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="guided-github" className={labelClass}>GitHub</label>
        <input
          id="guided-github"
          type="text"
          value={github}
          onChange={(e) => set({ github: e.target.value })}
          placeholder="janesmith"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="guided-website" className={labelClass}>Website</label>
        <input
          id="guided-website"
          type="text"
          value={website}
          onChange={(e) => set({ website: e.target.value })}
          placeholder="janesmith.dev"
          className={inputClass}
        />
      </div>
      <p className="text-xs text-site-muted">All links are optional — skip if none apply.</p>
    </div>
  );

  /* ── Step 2: Experience ─────────────────────────────── */
  const updateExp = (index: number, patch: Partial<ExperienceEntry>) => {
    const next = [...experience];
    next[index] = { ...next[index], ...patch };
    set({ experience: next });
  };

  const addExp = () => {
    setExperienceIds((current) => [...current, createNewEntryId("role")]);
    set({ experience: [...experience, { title: "", company: "", dates: "", highlights: [], url: null }] });
  };

  const removeExp = (index: number) => {
    setExperienceIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
    set({ experience: experience.filter((_, itemIndex) => itemIndex !== index) });
  };

  const renderExperience = () => (
    <div className="space-y-4">
      {experience.map((exp, i) => (
        <div key={experienceIds[i]} className="space-y-3 border border-site-border bg-site-canvas-alt p-4">
          <div className="flex items-center justify-between">
            <p className="site-eyebrow text-site-muted">Role {i + 1}</p>
            <button type="button" onClick={() => removeExp(i)} className={removeBtnClass} aria-label={`Remove role ${i + 1}`}>Remove</button>
          </div>
          <input
            aria-label={`Role ${i + 1} job title`}
            type="text"
            value={exp.title}
            onChange={(e) => updateExp(i, { title: e.target.value })}
            placeholder="Job Title"
            className={inputClass}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              aria-label={`Role ${i + 1} company`}
              type="text"
              value={exp.company}
              onChange={(e) => updateExp(i, { company: e.target.value })}
              placeholder="Company"
              className={inputClass}
            />
            <input
              aria-label={`Role ${i + 1} dates`}
              type="text"
              value={exp.dates}
              onChange={(e) => updateExp(i, { dates: e.target.value })}
              placeholder="2022 – Present"
              className={inputClass}
            />
          </div>
          <input
            aria-label={`Role ${i + 1} company website URL`}
            type="text"
            value={exp.url ?? ""}
            onChange={(e) => updateExp(i, { url: e.target.value || null })}
            placeholder="Company website URL (optional)"
            className={inputClass}
          />
          <div>
            <label htmlFor={`${experienceIds[i]}-highlights`} className={labelClass}>Key highlights (one per line)</label>
            <textarea
              id={`${experienceIds[i]}-highlights`}
              value={exp.highlights.join("\n")}
              onChange={(e) => updateExp(i, { highlights: e.target.value.split("\n") })}
              placeholder={"Led migration to microservices\nReduced API latency by 40%"}
              rows={3}
              className={`${inputClass} min-h-[80px] resize-y text-sm leading-6`}
            />
          </div>
        </div>
      ))}
      <button type="button" onClick={addExp} className={addBtnClass}>+ Add a role</button>
      {experience.length === 0 && (
        <p className="text-xs text-site-muted">No experience yet? You can skip this step.</p>
      )}
    </div>
  );

  /* ── Step 3: Education & Certs ──────────────────────── */
  const updateEdu = (index: number, patch: Partial<EducationEntry>) => {
    const next = [...education];
    next[index] = { ...next[index], ...patch };
    set({ education: next });
  };

  const addEdu = () => {
    setEducationIds((current) => [...current, createNewEntryId("education")]);
    set({ education: [...education, { degree: "", school: "", year: "" }] });
  };
  const removeEdu = (index: number) => {
    setEducationIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
    set({ education: education.filter((_, itemIndex) => itemIndex !== index) });
  };

  const updateCert = (index: number, patch: Partial<CertEntry>) => {
    const next = [...certifications];
    next[index] = { ...next[index], ...patch };
    set({ certifications: next });
  };

  const addCert = () => {
    setCertificationIds((current) => [...current, createNewEntryId("certification")]);
    set({ certifications: [...certifications, { name: "", issuer: null, date: null }] });
  };
  const removeCert = (index: number) => {
    setCertificationIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
    set({ certifications: certifications.filter((_, itemIndex) => itemIndex !== index) });
  };

  const renderEducation = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-site-text">Education</p>
        {education.map((edu, i) => (
          <div key={educationIds[i]} className="space-y-3 border border-site-border bg-site-canvas-alt p-4">
            <div className="flex items-center justify-between">
              <p className="site-eyebrow text-site-muted">Degree {i + 1}</p>
              <button type="button" onClick={() => removeEdu(i)} className={removeBtnClass} aria-label={`Remove degree ${i + 1}`}>Remove</button>
            </div>
            <input
              aria-label={`Degree ${i + 1} name`}
              type="text"
              value={edu.degree}
              onChange={(e) => updateEdu(i, { degree: e.target.value })}
              placeholder="B.S. Computer Science"
              className={inputClass}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                aria-label={`Degree ${i + 1} school`}
                type="text"
                value={edu.school}
                onChange={(e) => updateEdu(i, { school: e.target.value })}
                placeholder="University Name"
                className={inputClass}
              />
              <input
                aria-label={`Degree ${i + 1} year`}
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
        <p className="text-sm font-semibold text-site-text">Certifications</p>
        {certifications.map((cert, i) => (
          <div key={certificationIds[i]} className="space-y-3 border border-site-border bg-site-canvas-alt p-4">
            <div className="flex items-center justify-between">
              <p className="site-eyebrow text-site-muted">Certification {i + 1}</p>
              <button type="button" onClick={() => removeCert(i)} className={removeBtnClass} aria-label={`Remove certification ${i + 1}`}>Remove</button>
            </div>
            <input
              aria-label={`Certification ${i + 1} name`}
              type="text"
              value={cert.name}
              onChange={(e) => updateCert(i, { name: e.target.value })}
              placeholder="AWS Solutions Architect"
              className={inputClass}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                aria-label={`Certification ${i + 1} issuer`}
                type="text"
                value={cert.issuer ?? ""}
                onChange={(e) => updateCert(i, { issuer: e.target.value || null })}
                placeholder="Issuing organization"
                className={inputClass}
              />
              <input
                aria-label={`Certification ${i + 1} date`}
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

  const addSkillGroup = () => {
    setSkillIds((current) => [...current, createNewEntryId("skill")]);
    set({ skills: [...skills, { category: "", items: [] }] });
  };
  const removeSkillGroup = (index: number) => {
    setSkillIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
    set({ skills: skills.filter((_, itemIndex) => itemIndex !== index) });
  };

  const updateProject = (index: number, patch: Partial<ProjectEntry>) => {
    const next = [...projects];
    next[index] = { ...next[index], ...patch };
    set({ projects: next });
  };

  const addProject = () => {
    setProjectIds((current) => [...current, createNewEntryId("project")]);
    set({ projects: [...projects, { name: "", description: "", tech: [], url: null }] });
  };
  const removeProject = (index: number) => {
    setProjectIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
    set({ projects: projects.filter((_, itemIndex) => itemIndex !== index) });
  };

  const renderSkillsProjects = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-site-text">Skills</p>
        {skills.map((group, i) => (
          <div key={skillIds[i]} className="space-y-3 border border-site-border bg-site-canvas-alt p-4">
            <div className="flex items-center justify-between">
              <input
                aria-label={`Skill category ${i + 1} name`}
                type="text"
                value={group.category}
                onChange={(e) => updateSkill(i, { category: e.target.value })}
                placeholder="Category (e.g. Languages, Tools)"
                className="site-field min-w-0 px-3 py-2 text-sm font-semibold"
              />
              {skills.length > 1 && (
                <button type="button" onClick={() => removeSkillGroup(i)} className={removeBtnClass} aria-label={`Remove skill category ${i + 1}`}>Remove</button>
              )}
            </div>
            <DelimitedListInput
              id={`${skillIds[i]}-items`}
              label={`Skills in category ${i + 1}`}
              value={group.items}
              onChange={(items) => updateSkill(i, { items })}
              placeholder="TypeScript, React, Node.js"
              className={inputClass}
            />
            <p className="text-xs text-site-muted">Separate skills with commas</p>
          </div>
        ))}
        <button type="button" onClick={addSkillGroup} className={addBtnClass}>+ Add skill category</button>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-site-text">Projects</p>
        {projects.map((proj, i) => (
          <div key={projectIds[i]} className="space-y-3 border border-site-border bg-site-canvas-alt p-4">
            <div className="flex items-center justify-between">
              <p className="site-eyebrow text-site-muted">Project {i + 1}</p>
              <button type="button" onClick={() => removeProject(i)} className={removeBtnClass} aria-label={`Remove project ${i + 1}`}>Remove</button>
            </div>
            <input
              aria-label={`Project ${i + 1} name`}
              type="text"
              value={proj.name}
              onChange={(e) => updateProject(i, { name: e.target.value })}
              placeholder="Project Name"
              className={inputClass}
            />
            <textarea
              aria-label={`Project ${i + 1} description`}
              value={proj.description}
              onChange={(e) => updateProject(i, { description: e.target.value })}
              placeholder="A brief description of the project"
              rows={2}
              className={`${inputClass} min-h-[60px] resize-y`}
            />
            <DelimitedListInput
              id={`${projectIds[i]}-technologies`}
              label={`Project ${i + 1} technologies`}
              value={proj.tech}
              onChange={(tech) => updateProject(i, { tech })}
              placeholder="Next.js, Supabase, Stripe"
              className={inputClass}
            />
            <p className="text-xs text-site-muted">Separate technologies with commas</p>
            <input
              aria-label={`Project ${i + 1} URL`}
              type="text"
              value={proj.url ?? ""}
              onChange={(e) => updateProject(i, { url: e.target.value || null })}
              placeholder="Project URL (optional)"
              className={inputClass}
            />
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
    if (stats.length < 4) {
      setStatIds((current) => [...current, createNewEntryId("stat")]);
      set({ stats: [...stats, { value: "", label: "" }] });
    }
  };

  const removeStat = (index: number) => {
    setStatIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
    set({ stats: stats.filter((_, itemIndex) => itemIndex !== index) });
  };

  const renderSummaryStats = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="guided-summary" className={labelClass}>Professional Summary</label>
        <p className="mb-2 text-xs text-site-muted">In 2-3 sentences, what makes you great at what you do?</p>
        <textarea
          id="guided-summary"
          value={summary}
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="Full-stack engineer with 8 years of experience building scalable web applications..."
          rows={4}
          className={`${inputClass} min-h-[100px] resize-y`}
        />
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-site-text">Highlight stats</p>
          <p className="mt-1 text-xs text-site-muted">Up to 4 standout numbers (e.g. {'"'}8+{'"'} / {'"'}Years Experience{'"'})</p>
        </div>
        {stats.map((stat, i) => (
          <div key={statIds[i]} className="flex items-center gap-3">
            <input
              aria-label={`Highlight stat ${i + 1} value`}
              type="text"
              value={stat.value}
              onChange={(e) => updateStat(i, { value: e.target.value })}
              placeholder="8+"
              className={`${inputClass} w-24 shrink-0 text-center`}
            />
            <input
              aria-label={`Highlight stat ${i + 1} label`}
              type="text"
              value={stat.label}
              onChange={(e) => updateStat(i, { label: e.target.value })}
              placeholder="Years Experience"
              className={`${inputClass} flex-1`}
            />
            <button type="button" onClick={() => removeStat(i)} className={removeBtnClass} aria-label={`Remove highlight stat ${i + 1}`}>Remove</button>
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

  if (consolidatedReview) {
    return (
      <section className="site-panel p-4 sm:p-6 md:p-8">
        <p className="site-eyebrow">Autofill review</p>
        <h2 className="site-section-title mt-2">Review what we found</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-site-secondary">
          We filled these fields from your résumé. Correct anything that needs context, leave
          optional sections blank, then continue to choose a theme and preview the finished page.
        </p>

        <div className="mt-8 space-y-10">
          {stepRenderers.map((renderStep, index) => (
            <section key={STEP_PROMPTS[index].heading} aria-labelledby={`autofill-section-${index}`}>
              <h3 id={`autofill-section-${index}`} className="site-panel-title">
                {STEP_PROMPTS[index].heading}
              </h3>
              <p className="mb-4 mt-1 text-sm text-site-secondary">
                {STEP_PROMPTS[index].sub}
              </p>
              {renderStep()}
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-site-border pt-6">
          <button type="button" onClick={onBack} className="site-button site-button-secondary">
            Back to dashboard
          </button>
          <button
            type="button"
            disabled={!name.trim() || !headline.trim()}
            onClick={completeFlow}
            className="site-button site-button-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to theme and preview
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="site-panel p-4 sm:p-6 md:p-8">
      {progressDots}
      <p className="site-eyebrow">Step 1 · {step + 1} of {TOTAL_STEPS}</p>
      <h2 ref={stepHeadingRef} tabIndex={-1} className="site-section-title mt-2 outline-none">{STEP_PROMPTS[step].heading}</h2>
      <p className="mb-6 mt-2 text-sm text-site-secondary">{STEP_PROMPTS[step].sub}</p>

      {stepRenderers[step]()}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={goBack}
          className="site-button site-button-secondary"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue()}
          onClick={goNext}
          className="site-button site-button-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step < TOTAL_STEPS - 1 ? "Continue" : "Continue to Theme Selection"}
        </button>
      </div>
    </section>
  );
}
