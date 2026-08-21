"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import DelimitedListInput from "@/components/create/DelimitedListInput";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { MOTION_EVENTS, MOTION_MODE_POLICIES } from "@/lib/motion";
import type { ResumeImportField } from "@/lib/resume-import";
import type { ResumeData } from "@/types/resume";

/* ── Types ─────────────────────────────────────────────── */

interface GuidedFlowProps {
  guidedData: Partial<ResumeData>;
  onUpdate: (data: Partial<ResumeData>) => void;
  onComplete: (data: ResumeData) => void;
  onBack: () => void;
  consolidatedReview?: boolean;
  motionSequence?: number;
  autofilledFields?: ResumeImportField[];
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

const AUTOFILL_STEP_FIELDS: ReadonlyArray<ReadonlyArray<ResumeImportField>> = [
  ["name", "headline", "location"],
  ["contact"],
  ["experience"],
  ["education", "certifications"],
  ["skills", "projects"],
  ["summary"],
];

/* ── Helpers ────────────────────────────────────────────── */

const inputClass =
  "site-field px-4 py-3 text-base sm:text-sm";

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
  motionSequence = 0,
  autofilledFields = [],
}: GuidedFlowProps) {
  const { mode } = useMotionPreference();
  const allowsSmoothScroll = MOTION_MODE_POLICIES[mode].allowsSmoothScroll;
  const [step, setStep] = useState(0);
  const stepPanelRef = useRef<HTMLElement | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const previousStepRef = useRef<number | null>(null);
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

  /* ── Navigation ─────────────────────────────────────── */
  const missingBasics = !name.trim() || !headline.trim();
  const basicsHintId = `${entryIdPrefix}-basics-hint`;

  const canContinue = () => {
    if (step === 0) return !missingBasics;
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

  // Mirror the outer create-page step pattern: when the sub-step changes,
  // bring the panel back into view and move focus to the new step heading.
  useEffect(() => {
    if (previousStepRef.current === null || previousStepRef.current === step) {
      previousStepRef.current = step;
      return;
    }

    previousStepRef.current = step;
    stepPanelRef.current?.scrollIntoView({
      behavior: allowsSmoothScroll ? "smooth" : "auto",
      block: "start",
    });
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [allowsSmoothScroll, step]);

  /* ── Progress dots ──────────────────────────────────── */
  const progressDots = (
    <div className="mb-6 flex items-center gap-2">
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
        <label htmlFor="guided-full-name" className={labelClass}>Full name *</label>
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
        <label htmlFor="guided-headline" className={labelClass}>Professional headline *</label>
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
          <div>
            <label htmlFor={`${experienceIds[i]}-title`} className={labelClass}>Job title</label>
            <input
              id={`${experienceIds[i]}-title`}
              aria-label={`Role ${i + 1} job title`}
              type="text"
              value={exp.title}
              onChange={(e) => updateExp(i, { title: e.target.value })}
              placeholder="Job Title"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${experienceIds[i]}-company`} className={labelClass}>Company</label>
              <input
                id={`${experienceIds[i]}-company`}
                aria-label={`Role ${i + 1} company`}
                type="text"
                value={exp.company}
                onChange={(e) => updateExp(i, { company: e.target.value })}
                placeholder="Company"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${experienceIds[i]}-dates`} className={labelClass}>Dates</label>
              <input
                id={`${experienceIds[i]}-dates`}
                aria-label={`Role ${i + 1} dates`}
                type="text"
                value={exp.dates}
                onChange={(e) => updateExp(i, { dates: e.target.value })}
                placeholder="2022 – Present"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${experienceIds[i]}-url`} className={labelClass}>Company URL (optional)</label>
            <input
              id={`${experienceIds[i]}-url`}
              aria-label={`Role ${i + 1} company website URL`}
              type="text"
              value={exp.url ?? ""}
              onChange={(e) => updateExp(i, { url: e.target.value || null })}
              placeholder="Company website URL (optional)"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${experienceIds[i]}-highlights`} className={labelClass}>Key highlights (one per line)</label>
            <textarea
              id={`${experienceIds[i]}-highlights`}
              value={exp.highlights.join("\n")}
              onChange={(e) => updateExp(i, { highlights: e.target.value.split("\n") })}
              placeholder={"Led migration to microservices\nReduced API latency by 40%"}
              rows={3}
              className={`${inputClass} min-h-[80px] resize-y leading-6`}
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
            <div>
              <label htmlFor={`${educationIds[i]}-degree`} className={labelClass}>Degree</label>
              <input
                id={`${educationIds[i]}-degree`}
                aria-label={`Degree ${i + 1} name`}
                type="text"
                value={edu.degree}
                onChange={(e) => updateEdu(i, { degree: e.target.value })}
                placeholder="B.S. Computer Science"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${educationIds[i]}-school`} className={labelClass}>School</label>
                <input
                  id={`${educationIds[i]}-school`}
                  aria-label={`Degree ${i + 1} school`}
                  type="text"
                  value={edu.school}
                  onChange={(e) => updateEdu(i, { school: e.target.value })}
                  placeholder="University Name"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${educationIds[i]}-year`} className={labelClass}>Year</label>
                <input
                  id={`${educationIds[i]}-year`}
                  aria-label={`Degree ${i + 1} year`}
                  type="text"
                  value={edu.year}
                  onChange={(e) => updateEdu(i, { year: e.target.value })}
                  placeholder="2020"
                  className={inputClass}
                />
              </div>
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
            <div>
              <label htmlFor={`${certificationIds[i]}-name`} className={labelClass}>Certification name</label>
              <input
                id={`${certificationIds[i]}-name`}
                aria-label={`Certification ${i + 1} name`}
                type="text"
                value={cert.name}
                onChange={(e) => updateCert(i, { name: e.target.value })}
                placeholder="AWS Solutions Architect"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${certificationIds[i]}-issuer`} className={labelClass}>Issuer</label>
                <input
                  id={`${certificationIds[i]}-issuer`}
                  aria-label={`Certification ${i + 1} issuer`}
                  type="text"
                  value={cert.issuer ?? ""}
                  onChange={(e) => updateCert(i, { issuer: e.target.value || null })}
                  placeholder="Issuing organization"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${certificationIds[i]}-date`} className={labelClass}>Date</label>
                <input
                  id={`${certificationIds[i]}-date`}
                  aria-label={`Certification ${i + 1} date`}
                  type="text"
                  value={cert.date ?? ""}
                  onChange={(e) => updateCert(i, { date: e.target.value || null })}
                  placeholder="2023"
                  className={inputClass}
                />
              </div>
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
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor={`${skillIds[i]}-category`} className={labelClass}>Category</label>
                <input
                  id={`${skillIds[i]}-category`}
                  aria-label={`Skill category ${i + 1} name`}
                  type="text"
                  value={group.category}
                  onChange={(e) => updateSkill(i, { category: e.target.value })}
                  placeholder="Category (e.g. Languages, Tools)"
                  className="site-field min-w-0 px-3 py-2 text-base font-semibold sm:text-sm"
                />
              </div>
              {skills.length > 1 && (
                <button type="button" onClick={() => removeSkillGroup(i)} className={removeBtnClass} aria-label={`Remove skill category ${i + 1}`}>Remove</button>
              )}
            </div>
            <div>
              <label htmlFor={`${skillIds[i]}-items`} className={labelClass}>Skills</label>
              <DelimitedListInput
                id={`${skillIds[i]}-items`}
                label={`Skills in category ${i + 1}`}
                value={group.items}
                onChange={(items) => updateSkill(i, { items })}
                placeholder="TypeScript, React, Node.js"
                className={inputClass}
              />
            </div>
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
            <div>
              <label htmlFor={`${projectIds[i]}-name`} className={labelClass}>Project name</label>
              <input
                id={`${projectIds[i]}-name`}
                aria-label={`Project ${i + 1} name`}
                type="text"
                value={proj.name}
                onChange={(e) => updateProject(i, { name: e.target.value })}
                placeholder="Project Name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${projectIds[i]}-description`} className={labelClass}>Description</label>
              <textarea
                id={`${projectIds[i]}-description`}
                aria-label={`Project ${i + 1} description`}
                value={proj.description}
                onChange={(e) => updateProject(i, { description: e.target.value })}
                placeholder="A brief description of the project"
                rows={2}
                className={`${inputClass} min-h-[60px] resize-y`}
              />
            </div>
            <div>
              <label htmlFor={`${projectIds[i]}-technologies`} className={labelClass}>Technologies</label>
              <DelimitedListInput
                id={`${projectIds[i]}-technologies`}
                label={`Project ${i + 1} technologies`}
                value={proj.tech}
                onChange={(tech) => updateProject(i, { tech })}
                placeholder="Next.js, Supabase, Stripe"
                className={inputClass}
              />
            </div>
            <p className="text-xs text-site-muted">Separate technologies with commas</p>
            <div>
              <label htmlFor={`${projectIds[i]}-url`} className={labelClass}>Project URL (optional)</label>
              <input
                id={`${projectIds[i]}-url`}
                aria-label={`Project ${i + 1} URL`}
                type="text"
                value={proj.url ?? ""}
                onChange={(e) => updateProject(i, { url: e.target.value || null })}
                placeholder="Project URL (optional)"
                className={inputClass}
              />
            </div>
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
        <label htmlFor="guided-summary" className={labelClass}>Professional summary</label>
        <p className="mb-2 text-xs text-site-muted">In 2-3 sentences, what makes you great at what you do?</p>
        <textarea
          id="guided-summary"
          value={summary}
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="Full-stack engineer with 8 years of experience building scalable web applications…"
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
          <div key={statIds[i]} className="flex flex-wrap items-end gap-3">
            <div className="w-24 shrink-0">
              <label htmlFor={`${statIds[i]}-value`} className={labelClass}>Value</label>
              <input
                id={`${statIds[i]}-value`}
                aria-label={`Highlight stat ${i + 1} value`}
                type="text"
                value={stat.value}
                onChange={(e) => updateStat(i, { value: e.target.value })}
                placeholder="8+"
                className={`${inputClass} text-center`}
              />
            </div>
            <div className="min-w-40 flex-1">
              <label htmlFor={`${statIds[i]}-label`} className={labelClass}>Label</label>
              <input
                id={`${statIds[i]}-label`}
                aria-label={`Highlight stat ${i + 1} label`}
                type="text"
                value={stat.label}
                onChange={(e) => updateStat(i, { label: e.target.value })}
                placeholder="Years Experience"
                className={inputClass}
              />
            </div>
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
      <section
        className="site-panel p-4 sm:p-6 md:p-8"
        data-motion-event={MOTION_EVENTS.RESUME_IMPORT_REVIEW_REQUIRED}
        data-motion-signal="review-gate"
        data-motion-state="review-required"
        data-motion-sequence={motionSequence}
        data-motion-target="autofilled-fields"
      >
        <p className="site-eyebrow">Autofill review</p>
        <h2 className="site-section-title mt-2">Review what we found</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-site-secondary">
          We filled these fields from your résumé. Correct anything that needs context, leave
          optional sections blank, then continue to choose a theme and preview the finished page.
        </p>

        <div className="mt-8 space-y-10">
          {stepRenderers.map((renderStep, index) => {
            const detectedTargets = AUTOFILL_STEP_FIELDS[index].filter((field) =>
              autofilledFields.includes(field),
            );
            const wasAutofilled = detectedTargets.length > 0;

            return (
              <section
                key={STEP_PROMPTS[index].heading}
                aria-labelledby={`autofill-section-${index}`}
                data-motion-event={
                  wasAutofilled
                    ? MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED
                    : undefined
                }
                data-motion-signal={wasAutofilled ? "truth-transfer" : undefined}
                data-motion-state={wasAutofilled ? "autofilled" : undefined}
                data-motion-sequence={wasAutofilled ? motionSequence : undefined}
                data-motion-target={
                  wasAutofilled ? detectedTargets.join(",") : undefined
                }
              >
                <h3 id={`autofill-section-${index}`} className="site-panel-title">
                  {STEP_PROMPTS[index].heading}
                </h3>
                <p className="mb-4 mt-1 text-sm text-site-secondary">
                  {STEP_PROMPTS[index].sub}
                </p>
                {renderStep()}
              </section>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-site-border pt-6">
          <button type="button" onClick={onBack} className="site-button site-button-secondary">
            Back to dashboard
          </button>
          <button
            type="button"
            disabled={missingBasics}
            aria-describedby={missingBasics ? basicsHintId : undefined}
            onClick={completeFlow}
            className="site-button site-button-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to theme and preview
          </button>
          {missingBasics ? (
            <p id={basicsHintId} className="w-full text-sm text-site-secondary">
              Add your name and headline at the top to continue.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section ref={stepPanelRef} className="site-panel scroll-mt-24 p-4 sm:p-6 md:p-8">
      {progressDots}
      <p className="site-eyebrow">Details · part {step + 1} of {TOTAL_STEPS}</p>
      <h2 tabIndex={-1} ref={stepHeadingRef} className="site-section-title mt-2 outline-none">
        {STEP_PROMPTS[step].heading}
      </h2>
      <p className="mb-6 mt-2 text-sm text-site-secondary">{STEP_PROMPTS[step].sub}</p>

      {stepRenderers[step]()}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="site-button site-button-secondary"
        >
          {step === 0 ? "Back to dashboard" : "Back"}
        </button>
        <button
          type="button"
          disabled={!canContinue()}
          aria-describedby={step === 0 && missingBasics ? basicsHintId : undefined}
          onClick={goNext}
          className="site-button site-button-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step < TOTAL_STEPS - 1 ? "Continue" : "Continue to theme selection"}
        </button>
        {step === 0 && missingBasics ? (
          <p id={basicsHintId} className="w-full text-sm text-site-secondary">
            Add your name and headline to continue.
          </p>
        ) : null}
      </div>
    </section>
  );
}
