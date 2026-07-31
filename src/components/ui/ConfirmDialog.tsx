"use client";

import React, { type ReactNode, useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Reusable confirmation dialog for destructive or consequential actions.
 * Mirrors the a11y contract of the settings delete-account modal: alertdialog
 * semantics, focus trap with initial focus, Escape to close (blocked while
 * loading), scroll lock, and focus restoration on close.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const loadingRef = useRef(loading);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  loadingRef.current = loading;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loadingRef.current) {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    (cancelButtonRef.current ?? dialogRef.current)?.focus();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`site-panel-raised w-full max-w-md p-6 sm:p-7 ${destructive ? "border-site-danger" : ""}`}
      >
        <h2
          id={titleId}
          className={`font-site text-xl font-semibold ${destructive ? "text-site-danger" : "text-site-text"}`}
        >
          {title}
        </h2>
        <div id={descriptionId} className="mt-3 text-sm text-site-secondary">
          {body}
        </div>
        {error ? (
          <div id={errorId} role="alert" className="site-alert-danger mt-4 flex items-start gap-2 p-3 text-sm">
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
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={onClose}
            disabled={loading}
            className="site-button site-button-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`site-button flex-1 ${destructive ? "site-button-danger" : "site-button-primary"} disabled:opacity-40`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
