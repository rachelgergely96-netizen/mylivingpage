"use client";

import React from "react";

export const DELETE_ACCOUNT_ERROR_ID = "delete-account-error";

interface FocusableControl {
  disabled?: boolean;
  focus: () => void;
}

/** Focuses the destructive retry only when it is enabled, then falls back to input. */
export function focusDeleteFailureControl(
  retryControl: FocusableControl | null,
  fallbackControl: FocusableControl | null,
) {
  const target = retryControl && retryControl.disabled !== true
    ? retryControl
    : fallbackControl && fallbackControl.disabled !== true
      ? fallbackControl
      : null;

  target?.focus();
  return target !== null;
}

export default function DeleteAccountError({ message }: { message: string }) {
  return (
    <div
      id={DELETE_ACCOUNT_ERROR_ID}
      role="alert"
      aria-atomic="true"
      className="site-alert-danger mb-4 flex items-start gap-2 p-3 text-sm"
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
      <span>{message}</span>
    </div>
  );
}
