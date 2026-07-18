"use client";

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

const fieldsetClass = "site-panel space-y-3 rounded-none p-4 sm:p-5";
const legendClass = "site-eyebrow px-1";
const inputClass =
  "site-field w-full rounded-none px-3 py-2 text-sm";
const textAreaClass =
  "site-field w-full rounded-none px-3 py-2 text-sm leading-6";
const subtleTextAreaClass =
  "site-field w-full rounded-none px-3 py-2 text-xs leading-5 text-site-secondary";
const removeButtonClass =
  "site-button site-button-danger rounded-none px-3 py-2 text-xs";
const textRemoveButtonClass = "site-button site-button-danger px-3 text-xs";
const addButtonClass =
  "site-button site-button-secondary rounded-none border-dashed px-4 py-2 text-xs";

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
      <fieldset className={fieldsetClass}>
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

      <fieldset className={fieldsetClass}>
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
        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Stats</legend>
          {data.stats.map((stat, index) => (
            <div key={index} className="flex gap-3">
              <input
                type="text"
                value={stat.value}
                onChange={(event) => {
                  const next = [...data.stats];
                  next[index] = { ...next[index], value: event.target.value };
                  updateField("stats", next);
                }}
                aria-label="Value"
                placeholder="Value"
                className="w-28 rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-action focus:border-site-focus"
              />
              <input
                type="text"
                value={stat.label}
                onChange={(event) => {
                  const next = [...data.stats];
                  next[index] = { ...next[index], label: event.target.value };
                  updateField("stats", next);
                }}
                aria-label="Label"
                placeholder="Label"
                className="flex-1 rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
              />
              <button
                type="button"
                aria-label={`Remove stat ${index + 1}`}
                onClick={() => updateField("stats", data.stats.filter((_, itemIndex) => itemIndex !== index))}
                className={removeButtonClass}
              >
                Remove
              </button>
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

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Experience</legend>
        {data.experience.map((experience, index) => (
          <div
            key={index}
            className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
          >
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
              className={subtleTextAreaClass}
            />
            <button
              type="button"
              aria-label={`Remove experience ${index + 1}`}
              onClick={() => updateField("experience", data.experience.filter((_, itemIndex) => itemIndex !== index))}
              className={textRemoveButtonClass}
            >
              Remove
            </button>
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

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Education</legend>
        {data.education.map((education, index) => (
          <div key={index} className="flex flex-wrap gap-2">
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
              className="flex-1 rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
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
              className="flex-1 rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
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
              className="w-24 rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
            />
            <button
              type="button"
              aria-label={`Remove education ${index + 1}`}
              onClick={() => updateField("education", data.education.filter((_, itemIndex) => itemIndex !== index))}
              className={removeButtonClass}
            >
              Remove
            </button>
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

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Skills</legend>
        {data.skills.map((group, index) => (
          <div
            key={index}
            className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
          >
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
            <button
              type="button"
              aria-label={`Remove skill category ${index + 1}`}
              onClick={() => updateField("skills", data.skills.filter((_, itemIndex) => itemIndex !== index))}
              className={textRemoveButtonClass}
            >
              Remove
            </button>
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

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Projects</legend>
        {data.projects.map((project, index) => (
          <div
            key={index}
            className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
          >
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
            <button
              type="button"
              aria-label={`Remove project ${index + 1}`}
              onClick={() => updateField("projects", data.projects.filter((_, itemIndex) => itemIndex !== index))}
              className={textRemoveButtonClass}
            >
              Remove
            </button>
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
        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Proof</legend>
          <p className="text-sm leading-6 text-site-secondary">
            Add proof blocks that show work, outcomes, and artifacts directly on the page.
          </p>
          {proofs.map((proof, index) => (
            <div
              key={proof.id || index}
              className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
            >
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
                aria-label="What changed, improved, or shipped?"
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
                aria-label="Supporting URL (optional)"
                placeholder="Supporting URL (optional)"
                className={inputClass}
              />
              <button
                type="button"
                aria-label={`Remove proof block ${index + 1}`}
                onClick={() => updateField("proofs", proofs.filter((_, itemIndex) => itemIndex !== index))}
                className={textRemoveButtonClass}
              >
                Remove
              </button>
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
        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Testimonials</legend>
          <p className="text-sm leading-6 text-site-secondary">
            Collect and approve quotes here. Only approved testimonials appear on the public page.
          </p>
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id || index}
              className="space-y-2 rounded-none border border-site-border bg-site-canvas-alt p-4"
            >
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
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={testimonial.relationship ?? ""}
                  onChange={(event) => {
                    const next = [...testimonials];
                    next[index] = { ...next[index], relationship: event.target.value || null };
                    updateField("testimonials", next);
                  }}
                  aria-label="Relationship"
                  placeholder="Relationship"
                  className={inputClass}
                />
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
                <select
                  aria-label="Testimonial status"
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
              <textarea
                value={testimonial.quote}
                onChange={(event) => {
                  const next = [...testimonials];
                  next[index] = { ...next[index], quote: event.target.value };
                  updateField("testimonials", next);
                }}
                rows={3}
                aria-label="What should appear on the page once approved?"
                placeholder="What should appear on the page once approved?"
                className={subtleTextAreaClass}
              />
              <button
                type="button"
                aria-label={`Remove testimonial ${index + 1}`}
                onClick={() =>
                  updateField(
                    "testimonials",
                    testimonials.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className={textRemoveButtonClass}
              >
                Remove
              </button>
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

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Certifications</legend>
        {data.certifications.map((certification, index) => (
          <div key={index} className="flex flex-wrap gap-2">
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
              className="flex-1 rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
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
              className="flex-1 rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
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
              className="w-24 rounded-none border border-site-border-strong bg-site-canvas-alt px-3 py-2 text-sm text-site-text focus:border-site-focus"
            />
            <button
              type="button"
              aria-label={`Remove certification ${index + 1}`}
              onClick={() =>
                updateField("certifications", data.certifications.filter((_, itemIndex) => itemIndex !== index))
              }
              className={removeButtonClass}
            >
              Remove
            </button>
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
