"use client";

import React, { useRef, useState } from "react";
import type { ParsedResumeImport, ResumeImportField } from "@/lib/resume-import";

const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";
const MAX_FILE_BYTES = 6 * 1024 * 1024;

interface ResumeImportResponse extends ParsedResumeImport {
  text: string;
  sourceName: string;
  sourceKind: "pdf" | "docx" | "text" | "pasted";
}

interface ResumeImportProps {
  hasExistingData: boolean;
  onImported: (result: ResumeImportResponse) => void;
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

function validateFile(file: File) {
  if (file.size > MAX_FILE_BYTES) {
    return "Resume files must be 6 MB or smaller.";
  }
  if (!/\.(?:pdf|docx|txt|md)$/i.test(file.name)) {
    return "Choose a PDF, DOCX, TXT, or Markdown file.";
  }
  return "";
}

export default function ResumeImport({ hasExistingData, onImported }: ResumeImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [lastImport, setLastImport] = useState<{
    sourceName: string;
    detectedFields: ResumeImportField[];
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
      return;
    }
    setFile(nextFile);
    setError("");
    setLastImport(null);
  };

  const importResume = async () => {
    if (!file && pastedText.trim().length < 20) {
      setError("Choose a resume file or paste more resume text first.");
      return;
    }

    setImporting(true);
    setError("");
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
        throw new Error(result && "error" in result ? result.error : "Resume import failed.");
      }

      setLastImport({
        sourceName: result.sourceName,
        detectedFields: result.detectedFields,
        warnings: result.warnings,
      });
      onImported(result);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "We could not import that resume. Try pasting the text instead.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.28)] bg-[linear-gradient(145deg,rgba(59,130,246,0.12),rgba(255,255,255,0.025))]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
              Fast start
            </p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF] sm:text-2xl">
              Start with your resume
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgba(240,244,255,0.68)]">
              Upload your current resume or paste its text. We&apos;ll autofill as much as we can,
              then you can review every field before publishing.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[rgba(147,197,253,0.24)] bg-[rgba(59,130,246,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BFDBFE]">
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
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              chooseFile(event.dataTransfer.files[0] ?? null);
            }}
            className={`flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition-colors ${
              dragActive
                ? "border-[#60A5FA] bg-[rgba(59,130,246,0.14)]"
                : "border-[rgba(255,255,255,0.16)] bg-[rgba(0,0,0,0.12)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(147,197,253,0.28)] bg-[rgba(59,130,246,0.12)] text-lg text-[#BFDBFE]">
              ↑
            </div>
            {file ? (
              <>
                <p className="mt-3 max-w-full truncate text-sm font-medium text-[#F0F4FF]">
                  {file.name}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-2 text-xs text-[rgba(240,244,255,0.5)] transition-colors hover:text-[#F0F4FF]"
                >
                  Remove file
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-sm font-semibold text-[#BFDBFE] hover:text-white"
                >
                  Choose a resume
                </button>
                <p className="mt-1 text-xs text-[rgba(240,244,255,0.42)]">
                  PDF, DOCX, TXT, or MD · up to 6 MB
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-center">
            <span className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[#101522] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.42)]">
              or
            </span>
          </div>

          <div className="flex min-h-40 flex-col">
            <label
              htmlFor="resume-import-text"
              className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.46)]"
            >
              Paste resume text
            </label>
            <textarea
              id="resume-import-text"
              value={pastedText}
              onChange={(event) => {
                setPastedText(event.target.value);
                setError("");
                setLastImport(null);
              }}
              disabled={Boolean(file)}
              placeholder="Paste the text from your resume here..."
              className="min-h-32 flex-1 resize-y rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.14)] p-4 text-sm leading-6 text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        </div>

        {hasExistingData && !lastImport ? (
          <p className="mt-3 text-xs leading-5 text-[#FDE68A]">
            Importing another resume will replace the fields currently in this draft.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[rgba(255,120,120,0.3)] bg-[rgba(255,120,120,0.08)] px-4 py-3 text-sm text-[#ffaaaa]"
          >
            {error}
          </p>
        ) : null}

        {lastImport ? (
          <div
            aria-live="polite"
            className="mt-4 rounded-xl border border-[rgba(52,211,153,0.24)] bg-[rgba(16,185,129,0.08)] px-4 py-3"
          >
            <p className="text-sm font-medium text-[#A7F3D0]">
              Autofilled {lastImport.detectedFields.length} areas from {lastImport.sourceName}.
            </p>
            {lastImport.detectedFields.length > 0 ? (
              <p className="mt-1 text-xs leading-5 text-[rgba(209,250,229,0.72)]">
                Found {lastImport.detectedFields.map((field) => FIELD_LABELS[field]).join(", ")}.
              </p>
            ) : null}
            {lastImport.warnings.map((warning) => (
              <p key={warning} className="mt-1 text-xs leading-5 text-[#FDE68A]">
                {warning}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-[rgba(240,244,255,0.44)]">
            Your resume is processed only for this autofill. It is not sent to an AI provider or
            stored with your published page.
          </p>
          <button
            type="button"
            onClick={importResume}
            disabled={importing || (!file && pastedText.trim().length < 20)}
            className="gold-pill shrink-0 px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {importing ? "Autofilling..." : "Autofill my page"}
          </button>
        </div>
      </div>
    </section>
  );
}
