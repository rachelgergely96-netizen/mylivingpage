"use client";

import React from "react";
import {
  createEmptyProofItem,
  createEmptyTestimonialRecord,
} from "@/lib/job-seeker-starter";
import type { ResumeData } from "@/types/resume";

interface ResumeEditorFieldsProps {
  data: ResumeData;
  onChange: (next: ResumeData) => void;
  mode?: "living" | "compact";
}

const fieldsetClass =
  "site-panel scroll-mt-24 space-y-3 rounded-none p-4 sm:p-6 xl:scroll-mt-72";
const legendClass = "site-eyebrow px-1";
const fieldLabelClass =
  "mb-1.5 block text-xs font-semibold text-site-secondary";
const sectionNoteClass = "text-xs leading-5 text-site-muted";
const inputClass =
  "site-field w-full rounded-none px-3 py-2 text-base sm:text-sm";
const textAreaClass =
  "site-field w-full rounded-none px-3 py-2 text-base leading-6 sm:text-sm";
const recordCardClass =
  "space-y-3 rounded-none border border-site-border bg-site-canvas-alt p-3 sm:p-4";
const textRemoveButtonClass = "site-button site-button-danger px-3 text-xs";
const addButtonClass =
  "site-button site-button-secondary rounded-none border-dashed px-4 py-2 text-xs";

interface SectionLegendProps {
  number: string;
  label: string;
}

function SectionLegend({ number, label }: SectionLegendProps) {
  return (
    <legend className={`${legendClass} inline-flex items-center gap-2`}>
      <span className="font-mono text-site-muted">{number}</span>
      <span>{label}</span>
    </legend>
  );
}

interface LabeledControlProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

function LabeledControl({ label, className = "", children }: LabeledControlProps) {
  return (
    <label className={`block min-w-0 ${className}`.trim()}>
      <span className={fieldLabelClass}>{label}</span>
      {children}
    </label>
  );
}

interface RecordHeaderProps {
  id: string;
  label: string;
  removeLabel: string;
  onRemove: () => void;
}

function RecordHeader({ id, label, removeLabel, onRemove }: RecordHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p
        id={id}
        className="text-xs font-semibold tracking-[0.06em] text-site-secondary"
      >
        {label}
      </p>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className={textRemoveButtonClass}
      >
        Remove
      </button>
    </div>
  );
}

export default function ResumeEditorFields({
  data,
  onChange,
  mode = "living",
}: ResumeEditorFieldsProps) {
  const includeStats = mode === "living";
  const proofs = data.proofs ?? [];
  const testimonials = data.testimonials ?? [];

  const updateField = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-6">
      <fieldset
        id="editor-section-profile"
        data-editor-section="profile"
        className={fieldsetClass}
      >
        <SectionLegend number="02" label="Profile" />
        <p className={sectionNoteClass}>
          Make your role and the next step obvious in the first five seconds.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledControl label="Full name">
            <input
              type="text"
              value={data.name}
              onChange={(event) => updateField("name", event.target.value)}
              aria-label="Full name"
              autoComplete="name"
              placeholder="Avery Morgan"
              className={inputClass}
            />
          </LabeledControl>
          <LabeledControl label="Headline · target role">
            <input
              type="text"
              value={data.headline}
              onChange={(event) => updateField("headline", event.target.value)}
              aria-label="Headline"
              placeholder="Senior product designer"
              className={inputClass}
            />
          </LabeledControl>
          <LabeledControl label="Location">
            <input
              type="text"
              value={data.location}
              onChange={(event) => updateField("location", event.target.value)}
              aria-label="Location"
              autoComplete="address-level2"
              placeholder="Brooklyn, NY"
              className={inputClass}
            />
          </LabeledControl>
          <LabeledControl label="Public email">
            <input
              type="email"
              value={data.email ?? ""}
              onChange={(event) => updateField("email", event.target.value || null)}
              aria-label="Email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass}
            />
          </LabeledControl>
          <LabeledControl label="LinkedIn">
            <input
              type="text"
              value={data.linkedin ?? ""}
              onChange={(event) => updateField("linkedin", event.target.value || null)}
              aria-label="LinkedIn URL"
              placeholder="linkedin.com/in/you"
              className={inputClass}
            />
          </LabeledControl>
          <LabeledControl label="GitHub">
            <input
              type="text"
              value={data.github ?? ""}
              onChange={(event) => updateField("github", event.target.value || null)}
              aria-label="GitHub URL or username"
              placeholder="github.com/you"
              className={inputClass}
            />
          </LabeledControl>
          <LabeledControl label="Portfolio or website" className="sm:col-span-2">
            <input
              type="text"
              value={data.website ?? ""}
              onChange={(event) => updateField("website", event.target.value || null)}
              aria-label="Website"
              placeholder="yourwork.com"
              className={inputClass}
            />
          </LabeledControl>
        </div>
      </fieldset>

      <fieldset
        id="editor-section-summary"
        data-editor-section="summary"
        className={fieldsetClass}
      >
        <SectionLegend number="03" label="Intro" />
        <p className={sectionNoteClass}>
          Give a skimmer the through-line: what you do, where you are strongest, and what comes next.
        </p>
        <LabeledControl label="Opening summary">
          <textarea
            aria-label="Professional summary"
            value={data.summary}
            onChange={(event) => updateField("summary", event.target.value)}
            rows={mode === "living" ? 4 : 5}
            placeholder="Connect your experience, strengths, and direction in a few clear lines."
            className={textAreaClass}
          />
        </LabeledControl>
      </fieldset>

      {includeStats ? (
        <fieldset
          id="editor-section-stats"
          data-editor-section="stats"
          className={fieldsetClass}
        >
          <SectionLegend number="04" label="Impact" />
          <p className={sectionNoteClass}>
            Choose up to four numbers that make your scope or results believable at a glance.
          </p>
          {data.stats.map((stat, index) => (
            <div
              key={index}
              role="group"
              aria-labelledby={`editor-stat-${index + 1}-title`}
              className={recordCardClass}
            >
              <RecordHeader
                id={`editor-stat-${index + 1}-title`}
                label={stat.label.trim() || `Impact signal ${index + 1}`}
                removeLabel={`Remove stat ${index + 1}`}
                onRemove={() =>
                  updateField(
                    "stats",
                    data.stats.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
              <div className="grid min-w-0 gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <input
                  type="text"
                  value={stat.value}
                  onChange={(event) => {
                    const next = [...data.stats];
                    next[index] = { ...next[index], value: event.target.value };
                    updateField("stats", next);
                  }}
                  aria-label="Stat value"
                  placeholder="Value"
                  className="site-field min-w-0 rounded-none px-3 py-2 text-base text-site-action sm:text-sm"
                />
                <input
                  type="text"
                  value={stat.label}
                  onChange={(event) => {
                    const next = [...data.stats];
                    next[index] = { ...next[index], label: event.target.value };
                    updateField("stats", next);
                  }}
                  aria-label="Stat label"
                  placeholder="Label"
                  className="site-field min-w-0 rounded-none px-3 py-2 text-base sm:text-sm"
                />
              </div>
            </div>
          ))}
          {data.stats.length < 4 ? (
            <button
              type="button"
              onClick={() => updateField("stats", [...data.stats, { value: "", label: "" }])}
              className={addButtonClass}
            >
              + Add stat
            </button>
          ) : null}
        </fieldset>
      ) : null}

      <fieldset
        id="editor-section-experience"
        data-editor-section="experience"
        className={fieldsetClass}
      >
        <SectionLegend number="05" label="Experience" />
        <p className={sectionNoteClass}>
          Lead with outcomes and visible scope, not a list of responsibilities.
        </p>
        {data.experience.map((experience, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-experience-${index + 1}-title`}
            className={recordCardClass}
          >
            <RecordHeader
              id={`editor-experience-${index + 1}-title`}
              label={
                experience.title.trim()
                  ? `${experience.title}${experience.company.trim() ? ` · ${experience.company}` : ""}`
                  : `Experience ${index + 1}`
              }
              removeLabel={`Remove experience ${index + 1}`}
              onRemove={() =>
                updateField(
                  "experience",
                  data.experience.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                value={experience.title}
                onChange={(event) => {
                  const next = [...data.experience];
                  next[index] = { ...next[index], title: event.target.value };
                  updateField("experience", next);
                }}
                aria-label="Title"
                placeholder="Title"
                className={inputClass}
              />
              <input
                type="text"
                value={experience.company}
                onChange={(event) => {
                  const next = [...data.experience];
                  next[index] = { ...next[index], company: event.target.value };
                  updateField("experience", next);
                }}
                aria-label="Company"
                placeholder="Company"
                className={inputClass}
              />
              <input
                type="text"
                value={experience.dates}
                onChange={(event) => {
                  const next = [...data.experience];
                  next[index] = { ...next[index], dates: event.target.value };
                  updateField("experience", next);
                }}
                aria-label="Dates"
                placeholder="Dates"
                className={inputClass}
              />
            </div>
            <input
              type="text"
              value={experience.url ?? ""}
              onChange={(event) => {
                const next = [...data.experience];
                next[index] = { ...next[index], url: event.target.value || null };
                updateField("experience", next);
              }}
              aria-label="Company website URL (optional)"
              placeholder="Company website URL (optional)"
              className={inputClass}
            />
            <textarea
              value={experience.highlights.join("\n")}
              onChange={(event) => {
                const next = [...data.experience];
                next[index] = {
                  ...next[index],
                  highlights: event.target.value.split("\n"),
                };
                updateField("experience", next);
              }}
              onBlur={(event) => {
                const next = [...data.experience];
                next[index] = {
                  ...next[index],
                  highlights: event.target.value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                };
                updateField("experience", next);
              }}
              rows={3}
              aria-label="Highlights (one per line)"
              placeholder="Highlights (one per line)"
              className={textAreaClass}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            updateField("experience", [
              ...data.experience,
              { title: "", company: "", dates: "", highlights: [], url: null },
            ])
          }
          className={addButtonClass}
        >
          + Add experience
        </button>
      </fieldset>

      <fieldset
        id="editor-section-education"
        data-editor-section="education"
        className={fieldsetClass}
      >
        <SectionLegend number="06" label="Education" />
        <p className={sectionNoteClass}>
          Keep the credentials that help someone understand your foundation.
        </p>
        {data.education.map((education, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-education-${index + 1}-title`}
            className={recordCardClass}
          >
            <RecordHeader
              id={`editor-education-${index + 1}-title`}
              label={education.degree.trim() || education.school.trim() || `Education ${index + 1}`}
              removeLabel={`Remove education ${index + 1}`}
              onRemove={() =>
                updateField(
                  "education",
                  data.education.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]">
              <input
                type="text"
                value={education.degree}
                onChange={(event) => {
                  const next = [...data.education];
                  next[index] = { ...next[index], degree: event.target.value };
                  updateField("education", next);
                }}
                aria-label="Degree"
                placeholder="Degree"
                className={inputClass}
              />
              <input
                type="text"
                value={education.school}
                onChange={(event) => {
                  const next = [...data.education];
                  next[index] = { ...next[index], school: event.target.value };
                  updateField("education", next);
                }}
                aria-label="School"
                placeholder="School"
                className={inputClass}
              />
              <input
                type="text"
                value={education.year}
                onChange={(event) => {
                  const next = [...data.education];
                  next[index] = { ...next[index], year: event.target.value };
                  updateField("education", next);
                }}
                aria-label="Year"
                placeholder="Year"
                className={inputClass}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateField("education", [...data.education, { degree: "", school: "", year: "" }])}
          className={addButtonClass}
        >
          + Add education
        </button>
      </fieldset>

      <fieldset
        id="editor-section-skills"
        data-editor-section="skills"
        className={fieldsetClass}
      >
        <SectionLegend number="07" label="Skills" />
        <p className={sectionNoteClass}>
          Group the terms recruiters search for so expertise is easy to scan.
        </p>
        {data.skills.map((group, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-skill-category-${index + 1}-title`}
            className={recordCardClass}
          >
            <RecordHeader
              id={`editor-skill-category-${index + 1}-title`}
              label={group.category.trim() || `Skill category ${index + 1}`}
              removeLabel={`Remove skill category ${index + 1}`}
              onRemove={() =>
                updateField(
                  "skills",
                  data.skills.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
            <input
              type="text"
              value={group.category}
              onChange={(event) => {
                const next = [...data.skills];
                next[index] = { ...next[index], category: event.target.value };
                updateField("skills", next);
              }}
              aria-label="Skill category name"
              placeholder="Category (e.g. Languages, Tools)"
              className={inputClass}
            />
            <input
              type="text"
              value={group.items.join(", ")}
              onChange={(event) => {
                const next = [...data.skills];
                next[index] = {
                  ...next[index],
                  items: event.target.value
                    .split(",")
                    .map((item) => item.trimStart()),
                };
                updateField("skills", next);
              }}
              onBlur={(event) => {
                const next = [...data.skills];
                next[index] = {
                  ...next[index],
                  items: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                };
                updateField("skills", next);
              }}
              aria-label="Skills in this category (comma separated)"
              placeholder="TypeScript, React, Node.js"
              className={inputClass}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateField("skills", [...data.skills, { category: "", items: [] }])}
          className={addButtonClass}
        >
          + Add skill category
        </button>
      </fieldset>

      <fieldset
        id="editor-section-projects"
        data-editor-section="projects"
        className={fieldsetClass}
      >
        <SectionLegend number="08" label="Projects" />
        <p className={sectionNoteClass}>
          Feature work that proves how you think, build, or lead beyond a job title.
        </p>
        {data.projects.map((project, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-project-${index + 1}-title`}
            className={recordCardClass}
          >
            <RecordHeader
              id={`editor-project-${index + 1}-title`}
              label={project.name.trim() || `Project ${index + 1}`}
              removeLabel={`Remove project ${index + 1}`}
              onRemove={() =>
                updateField(
                  "projects",
                  data.projects.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
            <input
              type="text"
              value={project.name}
              onChange={(event) => {
                const next = [...data.projects];
                next[index] = { ...next[index], name: event.target.value };
                updateField("projects", next);
              }}
              aria-label="Project name"
              placeholder="Project name"
              className={inputClass}
            />
            <textarea
              value={project.description}
              onChange={(event) => {
                const next = [...data.projects];
                next[index] = { ...next[index], description: event.target.value };
                updateField("projects", next);
              }}
              rows={2}
              aria-label="Brief description"
              placeholder="Brief description"
              className={textAreaClass}
            />
            <input
              type="text"
              value={project.tech.join(", ")}
              onChange={(event) => {
                const next = [...data.projects];
                next[index] = {
                  ...next[index],
                  tech: event.target.value
                    .split(",")
                    .map((item) => item.trimStart()),
                };
                updateField("projects", next);
              }}
              onBlur={(event) => {
                const next = [...data.projects];
                next[index] = {
                  ...next[index],
                  tech: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                };
                updateField("projects", next);
              }}
              aria-label="Technologies (comma separated)"
              placeholder="Technologies (comma separated)"
              className={inputClass}
            />
            <input
              type="text"
              value={project.url ?? ""}
              onChange={(event) => {
                const next = [...data.projects];
                next[index] = { ...next[index], url: event.target.value || null };
                updateField("projects", next);
              }}
              aria-label="Project URL (optional)"
              placeholder="Project URL (optional)"
              className={inputClass}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            updateField("projects", [
              ...data.projects,
              { name: "", description: "", tech: [], url: null },
            ])
          }
          className={addButtonClass}
        >
          + Add project
        </button>
      </fieldset>

      {mode === "living" ? (
        <fieldset
          id="editor-section-proof"
          data-editor-section="proof"
          className={fieldsetClass}
        >
          <SectionLegend number="09" label="Proof" />
          <p className={sectionNoteClass}>
            Add a case study, launch, publication, or result someone can inspect for themselves.
          </p>
          <p className="text-sm leading-6 text-site-secondary">
            Add proof blocks that show work, outcomes, and artifacts directly on the page.
          </p>
          {proofs.map((proof, index) => (
            <div
              key={proof.id || index}
              role="group"
              aria-labelledby={`editor-proof-${index + 1}-title`}
              className={recordCardClass}
            >
              <RecordHeader
                id={`editor-proof-${index + 1}-title`}
                label={proof.title.trim() || `Proof block ${index + 1}`}
                removeLabel={`Remove proof block ${index + 1}`}
                onRemove={() =>
                  updateField(
                    "proofs",
                    proofs.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  aria-label="Proof type"
                  value={proof.type}
                  onChange={(event) => {
                    const next = [...proofs];
                    next[index] = { ...next[index], type: event.target.value as typeof proof.type };
                    updateField("proofs", next);
                  }}
                  className={inputClass}
                >
                  <option value="case_study">Case study</option>
                  <option value="quantified_result">Quantified result</option>
                  <option value="project_artifact">Project artifact</option>
                  <option value="writing_sample">Writing sample</option>
                  <option value="selected_win">Selected win</option>
                </select>
                <input
                  type="text"
                  value={proof.source_label ?? ""}
                  onChange={(event) => {
                    const next = [...proofs];
                    next[index] = { ...next[index], source_label: event.target.value || null };
                    updateField("proofs", next);
                  }}
                  aria-label="Label (optional)"
                  placeholder="Label (optional)"
                  className={inputClass}
                />
              </div>
              <input
                type="text"
                value={proof.title}
                onChange={(event) => {
                  const next = [...proofs];
                  next[index] = { ...next[index], title: event.target.value };
                  updateField("proofs", next);
                }}
                aria-label="Proof title"
                placeholder="Proof title"
                className={inputClass}
              />
              <textarea
                value={proof.summary}
                onChange={(event) => {
                  const next = [...proofs];
                  next[index] = { ...next[index], summary: event.target.value };
                  updateField("proofs", next);
                }}
                rows={3}
                aria-label="What was the work?"
                placeholder="What was the work?"
                className={textAreaClass}
              />
              <textarea
                value={proof.outcome}
                onChange={(event) => {
                  const next = [...proofs];
                  next[index] = { ...next[index], outcome: event.target.value };
                  updateField("proofs", next);
                }}
                rows={2}
                aria-label="What changed, improved, or shipped?"
                placeholder="What changed, improved, or shipped?"
                className={textAreaClass}
              />
              <input
                type="text"
                value={proof.url ?? ""}
                onChange={(event) => {
                  const next = [...proofs];
                  next[index] = { ...next[index], url: event.target.value || null };
                  updateField("proofs", next);
                }}
                aria-label="Supporting URL (optional)"
                placeholder="Supporting URL (optional)"
                className={inputClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateField("proofs", [...proofs, createEmptyProofItem()])}
            className={addButtonClass}
          >
            + Add proof block
          </button>
        </fieldset>
      ) : null}

      {mode === "living" ? (
        <fieldset
          id="editor-section-testimonials"
          data-editor-section="testimonials"
          className={fieldsetClass}
        >
          <SectionLegend number="10" label="Voices" />
          <p className={sectionNoteClass}>
            Let a trusted collaborator describe the value of working with you in their own words.
          </p>
          <p className="text-sm leading-6 text-site-secondary">
            Collect and approve quotes here. Only approved testimonials appear on the public page.
          </p>
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id || index}
              role="group"
              aria-labelledby={`editor-testimonial-${index + 1}-title`}
              className={recordCardClass}
            >
              <RecordHeader
                id={`editor-testimonial-${index + 1}-title`}
                label={testimonial.name.trim() || `Voice ${index + 1}`}
                removeLabel={`Remove testimonial ${index + 1}`}
                onRemove={() =>
                  updateField(
                    "testimonials",
                    testimonials.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={testimonial.name}
                  onChange={(event) => {
                    const next = [...testimonials];
                    next[index] = { ...next[index], name: event.target.value };
                    updateField("testimonials", next);
                  }}
                  aria-label="Name"
                  placeholder="Name"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={testimonial.role}
                  onChange={(event) => {
                    const next = [...testimonials];
                    next[index] = { ...next[index], role: event.target.value };
                    updateField("testimonials", next);
                  }}
                  aria-label="Role"
                  placeholder="Role"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={testimonial.company}
                  onChange={(event) => {
                    const next = [...testimonials];
                    next[index] = { ...next[index], company: event.target.value };
                    updateField("testimonials", next);
                  }}
                  aria-label="Company"
                  placeholder="Company"
                  className={inputClass}
                />
              </div>
              <LabeledControl label="Quote shown on the page">
                <textarea
                  value={testimonial.quote}
                  onChange={(event) => {
                    const next = [...testimonials];
                    next[index] = { ...next[index], quote: event.target.value };
                    updateField("testimonials", next);
                  }}
                  rows={3}
                  aria-label="What should appear on the page once approved?"
                  placeholder="A specific observation about the value of working with you."
                  className={textAreaClass}
                />
              </LabeledControl>
              <details className="border border-site-border bg-site-surface px-3 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-site-secondary">
                  Visibility &amp; request tracking
                  <span className="font-mono text-xs text-site-action-hover">
                    {testimonial.status}
                  </span>
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <LabeledControl label="Relationship">
                    <input
                      type="text"
                      value={testimonial.relationship ?? ""}
                      onChange={(event) => {
                        const next = [...testimonials];
                        next[index] = { ...next[index], relationship: event.target.value || null };
                        updateField("testimonials", next);
                      }}
                      aria-label="Relationship"
                      placeholder="Former manager"
                      className={inputClass}
                    />
                  </LabeledControl>
                  <LabeledControl label="Public status">
                    <select
                      aria-label="Testimonial status"
                      value={testimonial.status}
                      onChange={(event) => {
                        const next = [...testimonials];
                        next[index] = {
                          ...next[index],
                          status: event.target.value as typeof testimonial.status,
                        };
                        updateField("testimonials", next);
                      }}
                      className={inputClass}
                    >
                      <option value="draft">Draft · hidden</option>
                      <option value="requested">Requested · hidden</option>
                      <option value="approved">Approved · public</option>
                    </select>
                  </LabeledControl>
                  <LabeledControl label="Requested on">
                    <input
                      aria-label="Testimonial request date"
                      type="date"
                      value={testimonial.requested_at ?? ""}
                      onChange={(event) => {
                        const next = [...testimonials];
                        next[index] = { ...next[index], requested_at: event.target.value || null };
                        updateField("testimonials", next);
                      }}
                      className={inputClass}
                    />
                  </LabeledControl>
                  <LabeledControl label="Approved on">
                    <input
                      aria-label="Testimonial approval date"
                      type="date"
                      value={testimonial.approved_at ?? ""}
                      onChange={(event) => {
                        const next = [...testimonials];
                        next[index] = { ...next[index], approved_at: event.target.value || null };
                        updateField("testimonials", next);
                      }}
                      className={inputClass}
                    />
                  </LabeledControl>
                </div>
              </details>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateField("testimonials", [
                ...testimonials,
                createEmptyTestimonialRecord(),
              ])
            }
            className={addButtonClass}
          >
            + Add testimonial
          </button>
        </fieldset>
      ) : null}

      <fieldset
        id="editor-section-certifications"
        data-editor-section="certifications"
        className={fieldsetClass}
      >
        <SectionLegend number="11" label="Credentials" />
        <p className={sectionNoteClass}>
          Include current certifications that add trust or clarify a specialized skill.
        </p>
        {data.certifications.map((certification, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-certification-${index + 1}-title`}
            className={recordCardClass}
          >
            <RecordHeader
              id={`editor-certification-${index + 1}-title`}
              label={certification.name.trim() || `Credential ${index + 1}`}
              removeLabel={`Remove certification ${index + 1}`}
              onRemove={() =>
                updateField(
                  "certifications",
                  data.certifications.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]">
              <input
                type="text"
                value={certification.name}
                onChange={(event) => {
                  const next = [...data.certifications];
                  next[index] = { ...next[index], name: event.target.value };
                  updateField("certifications", next);
                }}
                aria-label="Certification name"
                placeholder="Certification name"
                className={inputClass}
              />
              <input
                type="text"
                value={certification.issuer ?? ""}
                onChange={(event) => {
                  const next = [...data.certifications];
                  next[index] = { ...next[index], issuer: event.target.value || null };
                  updateField("certifications", next);
                }}
                aria-label="Issuer"
                placeholder="Issuer"
                className={inputClass}
              />
              <input
                type="text"
                value={certification.date ?? ""}
                onChange={(event) => {
                  const next = [...data.certifications];
                  next[index] = { ...next[index], date: event.target.value || null };
                  updateField("certifications", next);
                }}
                aria-label="Date"
                placeholder="Date"
                className={inputClass}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            updateField("certifications", [
              ...data.certifications,
              { name: "", issuer: null, date: null },
            ])
          }
          className={addButtonClass}
        >
          + Add certification
        </button>
      </fieldset>
    </div>
  );
}
