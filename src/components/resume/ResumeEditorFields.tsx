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
  "site-panel scroll-mt-72 space-y-3 rounded-none p-4 sm:p-5 xl:scroll-mt-40";
const legendClass = "site-eyebrow px-1";
const inputClass =
  "site-field w-full rounded-none px-3 py-2 text-sm";
const textAreaClass =
  "site-field w-full rounded-none px-3 py-2 text-sm leading-6";
const subtleTextAreaClass =
  "site-field w-full rounded-none px-3 py-2 text-xs leading-5 text-site-secondary";
const textRemoveButtonClass = "site-button site-button-danger px-3 text-xs";
const addButtonClass =
  "site-button site-button-secondary rounded-none border-dashed px-4 py-2 text-xs";

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
    <div className="space-y-5">
      <fieldset
        id="editor-section-profile"
        data-editor-section="profile"
        className={fieldsetClass}
      >
        <legend className={legendClass}>Profile</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={data.name}
            onChange={(event) => updateField("name", event.target.value)}
            aria-label="Full name"
            placeholder="Full name"
            className={inputClass}
          />
          <input
            type="text"
            value={data.headline}
            onChange={(event) => updateField("headline", event.target.value)}
            aria-label="Headline"
            placeholder="Headline"
            className={inputClass}
          />
          <input
            type="text"
            value={data.location}
            onChange={(event) => updateField("location", event.target.value)}
            aria-label="Location"
            placeholder="Location"
            className={inputClass}
          />
          <input
            type="email"
            value={data.email ?? ""}
            onChange={(event) => updateField("email", event.target.value || null)}
            aria-label="Email"
            placeholder="Email"
            className={inputClass}
          />
          <input
            type="text"
            value={data.linkedin ?? ""}
            onChange={(event) => updateField("linkedin", event.target.value || null)}
            aria-label="LinkedIn URL"
            placeholder="LinkedIn URL"
            className={inputClass}
          />
          <input
            type="text"
            value={data.github ?? ""}
            onChange={(event) => updateField("github", event.target.value || null)}
            aria-label="GitHub URL or username"
            placeholder="GitHub URL or username"
            className={inputClass}
          />
          <input
            type="text"
            value={data.website ?? ""}
            onChange={(event) => updateField("website", event.target.value || null)}
            aria-label="Website"
            placeholder="Website"
            className="sm:col-span-2 w-full rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
          />
        </div>
      </fieldset>

      <fieldset
        id="editor-section-summary"
        data-editor-section="summary"
        className={fieldsetClass}
      >
        <legend className={legendClass}>Summary</legend>
        <textarea
          aria-label="Professional summary"
          value={data.summary}
          onChange={(event) => updateField("summary", event.target.value)}
          rows={mode === "living" ? 4 : 5}
          className={textAreaClass}
        />
      </fieldset>

      {includeStats ? (
        <fieldset
          id="editor-section-stats"
          data-editor-section="stats"
          className={fieldsetClass}
        >
          <legend className={legendClass}>Stats</legend>
          {data.stats.map((stat, index) => (
            <div
              key={index}
              role="group"
              aria-labelledby={`editor-stat-${index + 1}-title`}
              className="space-y-3 rounded-none border border-site-border bg-site-canvas-alt p-3 sm:p-4"
            >
              <RecordHeader
                id={`editor-stat-${index + 1}-title`}
                label={`Stat ${index + 1}`}
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
                  aria-label={`Stat ${index + 1} value`}
                  placeholder="Value"
                  className="site-field min-w-0 rounded-none px-3 py-2 text-sm text-site-action"
                />
                <input
                  type="text"
                  value={stat.label}
                  onChange={(event) => {
                    const next = [...data.stats];
                    next[index] = { ...next[index], label: event.target.value };
                    updateField("stats", next);
                  }}
                  aria-label={`Stat ${index + 1} label`}
                  placeholder="Label"
                  className="site-field min-w-0 rounded-none px-3 py-2 text-sm"
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
              + Add Stat
            </button>
          ) : null}
        </fieldset>
      ) : null}

      <fieldset
        id="editor-section-experience"
        data-editor-section="experience"
        className={fieldsetClass}
      >
        <legend className={legendClass}>Experience</legend>
        {data.experience.map((experience, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-experience-${index + 1}-title`}
            className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
          >
            <RecordHeader
              id={`editor-experience-${index + 1}-title`}
              label={`Experience ${index + 1}`}
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
                aria-label={`Experience ${index + 1} title`}
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
                aria-label={`Experience ${index + 1} company`}
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
                aria-label={`Experience ${index + 1} dates`}
                placeholder="Dates"
                className="rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
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
              aria-label={`Experience ${index + 1} company website URL (optional)`}
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
              aria-label={`Experience ${index + 1} highlights (one per line)`}
              placeholder="Highlights (one per line)"
              className={subtleTextAreaClass}
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
          + Add Experience
        </button>
      </fieldset>

      <fieldset
        id="editor-section-education"
        data-editor-section="education"
        className={fieldsetClass}
      >
        <legend className={legendClass}>Education</legend>
        {data.education.map((education, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-education-${index + 1}-title`}
            className="space-y-3 rounded-none border border-site-border bg-site-canvas-alt p-3 sm:p-4"
          >
            <RecordHeader
              id={`editor-education-${index + 1}-title`}
              label={`Education ${index + 1}`}
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
                aria-label={`Education ${index + 1} degree`}
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
                aria-label={`Education ${index + 1} school`}
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
                aria-label={`Education ${index + 1} year`}
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
          + Add Education
        </button>
      </fieldset>

      <fieldset
        id="editor-section-skills"
        data-editor-section="skills"
        className={fieldsetClass}
      >
        <legend className={legendClass}>Skills</legend>
        {data.skills.map((group, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-skill-category-${index + 1}-title`}
            className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
          >
            <RecordHeader
              id={`editor-skill-category-${index + 1}-title`}
              label={`Skill category ${index + 1}`}
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
              aria-label="Category (e.g. Languages, Tools)"
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
              aria-label="TypeScript, React, Node.js"
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
          + Add Skill Category
        </button>
      </fieldset>

      <fieldset
        id="editor-section-projects"
        data-editor-section="projects"
        className={fieldsetClass}
      >
        <legend className={legendClass}>Projects</legend>
        {data.projects.map((project, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-project-${index + 1}-title`}
            className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
          >
            <RecordHeader
              id={`editor-project-${index + 1}-title`}
              label={`Project ${index + 1}`}
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
              aria-label={`Project ${index + 1} name`}
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
              aria-label={`Project ${index + 1} description`}
              placeholder="Brief description"
              className={subtleTextAreaClass}
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
              aria-label={`Project ${index + 1} technologies (comma separated)`}
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
              aria-label={`Project ${index + 1} URL (optional)`}
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
          + Add Project
        </button>
      </fieldset>

      {mode === "living" ? (
        <fieldset
          id="editor-section-proof"
          data-editor-section="proof"
          className={fieldsetClass}
        >
          <legend className={legendClass}>Proof</legend>
          <p className="text-sm leading-6 text-site-secondary">
            Add proof blocks that show work, outcomes, and artifacts directly on the page.
          </p>
          {proofs.map((proof, index) => (
            <div
              key={proof.id || index}
              role="group"
              aria-labelledby={`editor-proof-${index + 1}-title`}
              className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
            >
              <RecordHeader
                id={`editor-proof-${index + 1}-title`}
                label={`Proof block ${index + 1}`}
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
                  aria-label={`Proof block ${index + 1} type`}
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
                  aria-label={`Proof block ${index + 1} label (optional)`}
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
                aria-label={`Proof block ${index + 1} title`}
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
                aria-label={`Proof block ${index + 1} work summary`}
                placeholder="What was the work?"
                className={subtleTextAreaClass}
              />
              <textarea
                value={proof.outcome}
                onChange={(event) => {
                  const next = [...proofs];
                  next[index] = { ...next[index], outcome: event.target.value };
                  updateField("proofs", next);
                }}
                rows={2}
                aria-label={`Proof block ${index + 1} outcome`}
                placeholder="What changed, improved, or shipped?"
                className={subtleTextAreaClass}
              />
              <input
                type="text"
                value={proof.url ?? ""}
                onChange={(event) => {
                  const next = [...proofs];
                  next[index] = { ...next[index], url: event.target.value || null };
                  updateField("proofs", next);
                }}
                aria-label={`Proof block ${index + 1} supporting URL (optional)`}
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
            + Add Proof Block
          </button>
        </fieldset>
      ) : null}

      {mode === "living" ? (
        <fieldset
          id="editor-section-testimonials"
          data-editor-section="testimonials"
          className={fieldsetClass}
        >
          <legend className={legendClass}>Testimonials</legend>
          <p className="text-sm leading-6 text-site-secondary">
            Collect and approve quotes here. Only approved testimonials appear on the public page.
          </p>
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id || index}
              role="group"
              aria-labelledby={`editor-testimonial-${index + 1}-title`}
              className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
            >
              <RecordHeader
                id={`editor-testimonial-${index + 1}-title`}
                label={`Testimonial ${index + 1}`}
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
                  aria-label={`Testimonial ${index + 1} name`}
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
                  aria-label={`Testimonial ${index + 1} role`}
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
                  aria-label={`Testimonial ${index + 1} company`}
                  placeholder="Company"
                  className={inputClass}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={testimonial.relationship ?? ""}
                  onChange={(event) => {
                    const next = [...testimonials];
                    next[index] = { ...next[index], relationship: event.target.value || null };
                    updateField("testimonials", next);
                  }}
                  aria-label={`Testimonial ${index + 1} relationship`}
                  placeholder="Relationship"
                  className={inputClass}
                />
                <input
                  aria-label={`Testimonial ${index + 1} request date`}
                  type="date"
                  value={testimonial.requested_at ?? ""}
                  onChange={(event) => {
                    const next = [...testimonials];
                    next[index] = { ...next[index], requested_at: event.target.value || null };
                    updateField("testimonials", next);
                  }}
                  className={inputClass}
                />
                <select
                  aria-label={`Testimonial ${index + 1} status`}
                  value={testimonial.status}
                  onChange={(event) => {
                    const next = [...testimonials];
                    next[index] = { ...next[index], status: event.target.value as typeof testimonial.status };
                    updateField("testimonials", next);
                  }}
                  className={inputClass}
                >
                  <option value="draft">Draft</option>
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <input
                aria-label={`Testimonial ${index + 1} approval date`}
                type="date"
                value={testimonial.approved_at ?? ""}
                onChange={(event) => {
                  const next = [...testimonials];
                  next[index] = { ...next[index], approved_at: event.target.value || null };
                  updateField("testimonials", next);
                }}
                className={inputClass}
              />
              <textarea
                value={testimonial.quote}
                onChange={(event) => {
                  const next = [...testimonials];
                  next[index] = { ...next[index], quote: event.target.value };
                  updateField("testimonials", next);
                }}
                rows={3}
                aria-label={`Testimonial ${index + 1} approved quote`}
                placeholder="What should appear on the page once approved?"
                className={subtleTextAreaClass}
              />
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
            + Add Testimonial
          </button>
        </fieldset>
      ) : null}

      <fieldset
        id="editor-section-certifications"
        data-editor-section="certifications"
        className={fieldsetClass}
      >
        <legend className={legendClass}>Certifications</legend>
        {data.certifications.map((certification, index) => (
          <div
            key={index}
            role="group"
            aria-labelledby={`editor-certification-${index + 1}-title`}
            className="space-y-3 rounded-none border border-site-border bg-site-canvas-alt p-3 sm:p-4"
          >
            <RecordHeader
              id={`editor-certification-${index + 1}-title`}
              label={`Certification ${index + 1}`}
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
                aria-label={`Certification ${index + 1} name`}
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
                aria-label={`Certification ${index + 1} issuer`}
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
                aria-label={`Certification ${index + 1} date`}
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
          + Add Certification
        </button>
      </fieldset>
    </div>
  );
}
