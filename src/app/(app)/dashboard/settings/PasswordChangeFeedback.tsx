"use client";

import React from "react";

export type PasswordField = "current" | "new" | "confirm";

export type PasswordChangeMessage =
  | { ok: true; text: string }
  | { ok: false; text: string; field?: PasswordField };

const PASSWORD_FORM_ERROR_ID = "password-form-error";
const FALLBACK_ERROR = "Failed to update password. Try again.";
const MAX_ERROR_LENGTH = 240;

const CURRENT_PASSWORD_CODES = new Set([
  "CURRENT_PASSWORD_REQUIRED",
  "REAUTH_REQUIRED",
]);

const CURRENT_PASSWORD_MESSAGES = new Set([
  "Enter your current password to continue.",
  "The current password is incorrect.",
]);

const NEW_PASSWORD_MESSAGES = new Set([
  "Password must be at least 8 characters.",
  "Unable to update the password. Try a different password.",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoundedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text && text.length <= MAX_ERROR_LENGTH ? text : null;
}

function getServerErrorField(code: string | null, text: string): PasswordField | undefined {
  if ((code && CURRENT_PASSWORD_CODES.has(code)) || CURRENT_PASSWORD_MESSAGES.has(text)) {
    return "current";
  }
  if (code === "PASSWORD_INVALID" || NEW_PASSWORD_MESSAGES.has(text)) {
    return "new";
  }
  return undefined;
}

export async function readPasswordChangeResponse(
  response: Pick<Response, "json" | "ok">,
): Promise<PasswordChangeMessage> {
  const payload = await response.json().catch(() => null) as unknown;

  if (response.ok) {
    return isRecord(payload) && payload.success === true
      ? { ok: true, text: "Password updated successfully." }
      : { ok: false, text: FALLBACK_ERROR };
  }

  const text = isRecord(payload)
    ? readBoundedString(payload.error) ?? FALLBACK_ERROR
    : FALLBACK_ERROR;
  const code = isRecord(payload) ? readBoundedString(payload.code) : null;
  const field = getServerErrorField(code, text);

  return field ? { ok: false, text, field } : { ok: false, text };
}

export function getPasswordFieldErrorProps(
  message: PasswordChangeMessage | null,
  field: PasswordField,
) {
  const hasFieldError = Boolean(message && !message.ok && message.field === field);
  return {
    "aria-invalid": hasFieldError ? true as const : undefined,
    "aria-describedby": hasFieldError ? PASSWORD_FORM_ERROR_ID : undefined,
  };
}

export default function PasswordChangeFeedback({
  message,
}: {
  message: PasswordChangeMessage;
}) {
  if (message.ok) {
    return <p className="text-xs text-site-success" role="status">{message.text}</p>;
  }

  return (
    <p
      id={PASSWORD_FORM_ERROR_ID}
      className="flex items-start gap-1.5 text-xs text-site-danger"
      role="alert"
    >
      <svg
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
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
      <span>{message.text}</span>
    </p>
  );
}
