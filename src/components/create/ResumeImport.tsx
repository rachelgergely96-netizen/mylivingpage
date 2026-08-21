"use client";

import React, { useRef, useState } from "react";
import { MOTION_EVENTS } from "@/lib/motion";
import type { ParsedResumeImport, ResumeImportField } from "@/lib/resume-import";
import { MAX_RESUME_FILE_BYTES, MAX_RESUME_FILE_LABEL } from "@/lib/resume-file-limits";

const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

interface ResumeImportResponse extends ParsedResumeImport {
  text: string;
  sourceName: string;
  sourceKind: "pdf" | "docx" | "text" | "pasted";
}

interface ResumeImportProps {
  hasExistingData: boolean;
  onImported: (result: ResumeImportResponse) => void;
  onReviewRequest?: () => void;
}

const FIELD_LABELS: Record<ResumeImportField, string> = {
  name: "name",
  headline: "headline",
  location: "location",
  contact: "contact links",
  summary: "summary",
  experience: "experience",
  education: "education",
  skills: "skills",
  projects: "projects",
  certifications: "certifications",
};

const MAX_READBACK_CHARACTERS = 180;

function truncate(value: string) {
  const trimmed = value.trim();
  return trimmed.length > MAX_READBACK_CHARACTERS
    ? `${trimmed.slice(0, MAX_READBACK_CHARACTERS)}…`
    : trimmed;
}

function validateFile(file: File) {
  if (file.size > MAX_RESUME_FILE_BYTES) {
    return `Résumé files must be ${MAX_RESUME_FILE_LABEL} or smaller.`;
  }
  if (!/\.(?:pdf|docx|txt|md)$/i.test(file.name)) {
    return "Choose a PDF, DOCX, TXT, or Markdown file.";
  }
  return "";
}

export default function ResumeImport({
  hasExistingData,
  onImported,
  onReviewRequest,
}: ResumeImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"file" | "text" | null>(null);
  const [importSequence, setImportSequence] = useState(0);
  const [lastImport, setLastImport] = useState<{
    sourceName: string;
    detectedFields: ResumeImportField[];
    fieldSources: ParsedResumeImport["fieldSources"];
    warnings: string[];
  } | null>(null);

  const chooseFile = (nextFile: File | null) => {
    if (!nextFile) {
      return;
    }
    const validationError = validateFile(nextFile);
    if (validationError) {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setError(validationError);
      setErrorField("file");
      return;
    }
    setFile(nextFile);
    setError("");
    setErrorField(null);
    setLastImport(null);
  };

  const importResume = async () => {
    if (!file && pastedText.trim().length < 20) {
      setError("Choose a résumé file or paste more résumé text first.");
      setErrorField("text");
      return;
    }

    setImporting(true);
    setImportSequence((sequence) => sequence + 1);
    setError("");
    setErrorField(null);
    setLastImport(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.set("file", file);
      } else {
        formData.set("text", pastedText.trim());
      }
      const response = await fetch("/api/resume/import", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as
        | ResumeImportResponse
        | { error?: string }
        | null;

      if (!response.ok || !result || !("data" in result)) {
        throw new Error(result && "error" in result ? result.error : "Résumé import failed.");
      }

      setLastImport({
        sourceName: result.sourceName,
        detectedFields: result.detectedFields,
        fieldSources: result.fieldSources ?? {},
        warnings: result.warnings,
      });
      onImported(result);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "We could not import that résumé. Try pasting the text instead.",
      );
      setErrorField(file ? "file" : "text");
    } finally {
      setImporting(false);
    }
  };

  const readSummary = lastImport
    ? lastImport.detectedFields
        .map((field) => ({ field, source: lastImport.fieldSources?.[field] }))
        .filter(
          (entry): entry is { field: ResumeImportField; source: NonNullable<typeof entry.source> } =>
            Boolean(entry.source?.value),
        )
    : [];

  return (
    <section
      className="site-panel overflow-hidden"
      aria-busy={importing || undefined}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="site-eyebrow">
              Fast start
            </p>
            <h2 className="site-panel-title mt-2">
              Start with your résumé
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-site-secondary">
              Upload your current résumé or paste its text. We&apos;ll autofill as much as we can,
              then you can review every field before publishing.
            </p>
          </div>
          <span className="site-badge w-fit">
            Optional
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                return;
              }
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              chooseFile(event.dataTransfer.files[0] ?? null);
            }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button")) {
                return;
              }
              fileInputRef.current?.click();
            }}
            className={`flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed p-5 text-center transition-colors ${
              dragActive
                ? "border-site-action bg-site-selected"
                : errorField === "file"
                  ? "border-site-danger bg-site-canvas-alt"
                  : "border-site-border-strong bg-site-canvas-alt"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            <div className="flex h-10 w-10 items-center justify-center border border-site-border-strong bg-site-surface-raised text-lg text-site-action" aria-hidden="true">
              ↑
            </div>
            {file ? (
              <>
                <p className="mt-3 max-w-full truncate text-sm font-medium text-site-text">
                  {file.name}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="site-button mt-2 border-0 px-3 py-2 text-xs text-site-secondary shadow-none hover:bg-site-surface-raised hover:text-site-text"
                >
                  Remove file
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="site-button site-button-secondary mt-3"
                >
                  Choose a résumé
                </button>
                <p className="mt-2 text-xs text-site-muted">
                  PDF, DOCX, TXT, or MD · up to {MAX_RESUME_FILE_LABEL}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-center">
            <span className="site-badge bg-site-canvas-alt">
              or
            </span>
          </div>

          <div className="flex min-h-40 flex-col">
            <label
              htmlFor="resume-import-text"
              className="mb-2 text-sm font-semibold text-site-secondary"
            >
              Paste résumé text
            </label>
            <textarea
              id="resume-import-text"
              value={pastedText}
              onChange={(event) => {
                setPastedText(event.target.value);
                setError("");
                setErrorField(null);
                setLastImport(null);
              }}
              disabled={Boolean(file)}
              aria-invalid={errorField === "text" ? true : undefined}
              aria-describedby={errorField === "text" ? "resume-import-error" : undefined}
              placeholder="Paste the text from your résumé here…"
              className="site-field min-h-32 flex-1 resize-y p-4 text-base leading-6 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            />
          </div>
        </div>

        {hasExistingData && !lastImport ? (
          <p className="mt-3 border-l-2 border-site-warning pl-3 text-xs leading-5 text-site-warning">
            Importing another résumé will replace the fields currently in this draft.
          </p>
        ) : null}

        {error ? (
          <div
            id="resume-import-error"
            role="alert"
            className="site-alert-danger mt-4 flex items-start gap-2 px-4 py-3 text-sm"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.75v3.75" strokeLinecap="square" />
              <path d="M8 11.25h.01" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        {lastImport ? (
          <div
            aria-live="polite"
            className="mt-4 border border-site-success bg-site-surface px-4 py-3"
            data-motion-event={MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED}
            data-motion-signal="truth-transfer"
            data-motion-state="facts-detected"
            data-motion-sequence={importSequence}
          >
            <p className="text-sm font-medium text-site-success">
              Autofilled {lastImport.detectedFields.length}{" "}
              {lastImport.detectedFields.length === 1 ? "area" : "areas"} from {lastImport.sourceName}.
            </p>
            {lastImport.detectedFields.length > 0 ? (
              <p className="mt-1 text-xs leading-5 text-site-secondary">
                Found {lastImport.detectedFields.map((field) => FIELD_LABELS[field]).join(", ")}.
              </p>
            ) : null}

            {/* The parse is a heuristic and the first thing anyone sees. Showing
                what was read next to the line it came from turns a misread into
                something visible here, rather than a hunt through the form. */}
            {readSummary.length > 0 ? (
              <div className="mt-3 border-t border-site-border pt-3">
                <p className="site-eyebrow text-site-muted">What we read</p>
                <dl className="mt-2 space-y-2">
                  {readSummary.map(({ field, source }) => (
                    <div
                      key={field}
                      className="grid gap-0.5 border-l-2 border-site-border pl-3"
                      data-motion-event={MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED}
                      data-motion-signal="truth-transfer"
                      data-motion-state="fact-confirmed"
                      data-motion-sequence={importSequence}
                      data-motion-target={field}
                    >
                      <dt className="text-xs font-semibold capitalize text-site-text">
                        {FIELD_LABELS[field]}
                      </dt>
                      <dd className="text-xs leading-5 text-site-secondary">
                        <span className="break-words">{truncate(source.value)}</span>
                        {source.sourceLine.trim() &&
                        source.sourceLine.trim() !== source.value.trim() ? (
                          <span className="mt-0.5 block break-words font-mono text-[0.7rem] leading-4 text-site-muted">
                            from: {truncate(source.sourceLine)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2.5 text-xs leading-5 text-site-muted">
                  Anything wrong here is fixable below — nothing is published yet.
                </p>
              </div>
            ) : null}
            {lastImport.warnings.map((warning) => (
              <p key={warning} className="mt-1 text-xs leading-5 text-site-warning">
                {warning}
              </p>
            ))}
            {onReviewRequest ? (
              <button
                type="button"
                onClick={onReviewRequest}
                className="site-button site-button-secondary mt-3"
              >
                Review the autofilled fields
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-site-muted">
            Your résumé is processed only for this autofill. It is not sent to an AI provider or
            stored with your published page.
          </p>
          <button
            type="button"
            onClick={importResume}
            disabled={importing || (!file && pastedText.trim().length < 20)}
            className="site-button site-button-secondary min-w-40 shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {importing ? "Autofilling…" : "Autofill my page"}
          </button>
        </div>
      </div>
    </section>
  );
}
