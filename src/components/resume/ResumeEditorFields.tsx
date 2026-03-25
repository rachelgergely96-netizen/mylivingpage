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

const fieldsetClass = "glass-card space-y-3 rounded-2xl p-4 sm:p-5";
const legendClass = "text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]";
const inputClass =
  "w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none";
const textAreaClass =
  "w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm leading-6 text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none";
const subtleTextAreaClass =
  "w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs leading-5 text-[rgba(240,244,255,0.6)] focus:border-[#3B82F6] focus:outline-none";
const removeButtonClass =
  "rounded-lg border border-[rgba(255,120,120,0.2)] px-3 py-2 text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]";
const textRemoveButtonClass = "text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]";
const addButtonClass =
  "rounded-full border border-dashed border-[rgba(59,130,246,0.3)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] transition-all hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#93C5FD]";

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
            placeholder="Full name"
            className={inputClass}
          />
          <input
            type="text"
            value={data.headline}
            onChange={(event) => updateField("headline", event.target.value)}
            placeholder="Headline"
            className={inputClass}
          />
          <input
            type="text"
            value={data.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="Location"
            className={inputClass}
          />
          <input
            type="email"
            value={data.email ?? ""}
            onChange={(event) => updateField("email", event.target.value || null)}
            placeholder="Email"
            className={inputClass}
          />
          <input
            type="text"
            value={data.linkedin ?? ""}
            onChange={(event) => updateField("linkedin", event.target.value || null)}
            placeholder="LinkedIn URL"
            className={inputClass}
          />
          <input
            type="text"
            value={data.github ?? ""}
            onChange={(event) => updateField("github", event.target.value || null)}
            placeholder="GitHub URL or username"
            className={inputClass}
          />
          <input
            type="text"
            value={data.website ?? ""}
            onChange={(event) => updateField("website", event.target.value || null)}
            placeholder="Website"
            className="sm:col-span-2 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Summary</legend>
        <textarea
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
            <div key={`${stat.label}-${index}`} className="flex gap-3">
              <input
                type="text"
                value={stat.value}
                onChange={(event) => {
                  const next = [...data.stats];
                  next[index] = { ...next[index], value: event.target.value };
                  updateField("stats", next);
                }}
                placeholder="Value"
                className="w-28 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD] focus:border-[#3B82F6] focus:outline-none"
              />
              <input
                type="text"
                value={stat.label}
                onChange={(event) => {
                  const next = [...data.stats];
                  next[index] = { ...next[index], label: event.target.value };
                  updateField("stats", next);
                }}
                placeholder="Label"
                className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
              />
              <button
                type="button"
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
            key={`${experience.title}-${experience.company}-${index}`}
            className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
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
                placeholder="Dates"
                className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
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
              placeholder="Company website URL (optional)"
              className={inputClass}
            />
            <textarea
              value={experience.highlights.join("\n")}
              onChange={(event) => {
                const next = [...data.experience];
                next[index] = {
                  ...next[index],
                  highlights: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                };
                updateField("experience", next);
              }}
              rows={3}
              placeholder="Highlights (one per line)"
              className={subtleTextAreaClass}
            />
            <button
              type="button"
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
          <div key={`${education.school}-${index}`} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={education.degree}
              onChange={(event) => {
                const next = [...data.education];
                next[index] = { ...next[index], degree: event.target.value };
                updateField("education", next);
              }}
              placeholder="Degree"
              className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
            />
            <input
              type="text"
              value={education.school}
              onChange={(event) => {
                const next = [...data.education];
                next[index] = { ...next[index], school: event.target.value };
                updateField("education", next);
              }}
              placeholder="School"
              className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
            />
            <input
              type="text"
              value={education.year}
              onChange={(event) => {
                const next = [...data.education];
                next[index] = { ...next[index], year: event.target.value };
                updateField("education", next);
              }}
              placeholder="Year"
              className="w-24 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="button"
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
            key={`${group.category}-${index}`}
            className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
          >
            <input
              type="text"
              value={group.category}
              onChange={(event) => {
                const next = [...data.skills];
                next[index] = { ...next[index], category: event.target.value };
                updateField("skills", next);
              }}
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
                    .map((item) => item.trim())
                    .filter(Boolean),
                };
                updateField("skills", next);
              }}
              placeholder="TypeScript, React, Node.js"
              className={inputClass}
            />
            <button
              type="button"
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
            key={`${project.name}-${index}`}
            className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
          >
            <input
              type="text"
              value={project.name}
              onChange={(event) => {
                const next = [...data.projects];
                next[index] = { ...next[index], name: event.target.value };
                updateField("projects", next);
              }}
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
                    .map((item) => item.trim())
                    .filter(Boolean),
                };
                updateField("projects", next);
              }}
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
              placeholder="Project URL (optional)"
              className={inputClass}
            />
            <button
              type="button"
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
          <p className="text-sm leading-6 text-[rgba(240,244,255,0.58)]">
            Add proof blocks that show work, outcomes, and artifacts directly on the page.
          </p>
          {proofs.map((proof, index) => (
            <div
              key={proof.id || `${proof.title}-${index}`}
              className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <select
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
                placeholder="Supporting URL (optional)"
                className={inputClass}
              />
              <button
                type="button"
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
          <p className="text-sm leading-6 text-[rgba(240,244,255,0.58)]">
            Collect and approve quotes here. Only approved testimonials appear on the public page.
          </p>
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id || `${testimonial.name}-${index}`}
              className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
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
                  placeholder="Relationship"
                  className={inputClass}
                />
                <input
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
                placeholder="What should appear on the page once approved?"
                className={subtleTextAreaClass}
              />
              <button
                type="button"
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
          <div key={`${certification.name}-${index}`} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={certification.name}
              onChange={(event) => {
                const next = [...data.certifications];
                next[index] = { ...next[index], name: event.target.value };
                updateField("certifications", next);
              }}
              placeholder="Certification name"
              className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
            />
            <input
              type="text"
              value={certification.issuer ?? ""}
              onChange={(event) => {
                const next = [...data.certifications];
                next[index] = { ...next[index], issuer: event.target.value || null };
                updateField("certifications", next);
              }}
              placeholder="Issuer"
              className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
            />
            <input
              type="text"
              value={certification.date ?? ""}
              onChange={(event) => {
                const next = [...data.certifications];
                next[index] = { ...next[index], date: event.target.value || null };
                updateField("certifications", next);
              }}
              placeholder="Date"
              className="w-24 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="button"
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
