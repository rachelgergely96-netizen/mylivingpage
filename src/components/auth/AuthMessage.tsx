import type { ReactNode } from "react";

interface AuthMessageProps {
  id?: string;
  tone: "danger" | "success";
  className?: string;
  children: ReactNode;
}

/**
 * Form-level status message for the auth panels: colored left border, small
 * inline glyph (alert triangle for errors, check for success), and message
 * text — so success vs error is never a color-only signal.
 */
export default function AuthMessage({ id, tone, className, children }: AuthMessageProps) {
  const isDanger = tone === "danger";

  return (
    <p
      id={id}
      role={isDanger ? "alert" : "status"}
      className={`flex items-start gap-2 border-l-2 pl-3 text-sm ${
        isDanger ? "border-site-danger text-site-danger" : "border-site-success text-site-success"
      }${className ? ` ${className}` : ""}`}
    >
      {isDanger ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mt-0.5 h-4 w-4 shrink-0"
        >
          <path d="M8 1.5 15 14H1L8 1.5Z" />
          <path d="M8 6v3.5" />
          <path d="M8 11.5v1" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="mt-0.5 h-4 w-4 shrink-0"
        >
          <path d="m2.5 8.5 4 4 7-9" />
        </svg>
      )}
      <span>{children}</span>
    </p>
  );
}
