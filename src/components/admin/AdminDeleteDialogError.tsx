"use client";

import React from "react";

export const ADMIN_DELETE_ERROR_ID = "admin-delete-user-error";

interface FocusableControl {
  disabled?: boolean;
  focus: () => void;
  isConnected?: boolean;
}

interface RequestClaim {
  current: boolean;
}

export function claimAdminDeleteRequest(claim: RequestClaim) {
  if (claim.current) {
    return false;
  }
  claim.current = true;
  return true;
}

export function focusAdminDeleteFailure(
  retryControl: FocusableControl | null,
  confirmationInput: FocusableControl | null,
) {
  const target = retryControl && retryControl.disabled !== true
    ? retryControl
    : confirmationInput && confirmationInput.disabled !== true
      ? confirmationInput
      : null;
  target?.focus();
  return target !== null;
}

export function restoreAdminDeleteFocus(
  trigger: FocusableControl | null,
  fallback: FocusableControl | null,
) {
  const target = trigger && trigger.isConnected !== false ? trigger : fallback;
  target?.focus();
  return target !== null;
}

export default function AdminDeleteDialogError({ message }: { message: string }) {
  return (
    <div
      id={ADMIN_DELETE_ERROR_ID}
      role="alert"
      aria-atomic="true"
      className="site-alert-danger mb-4 p-3 text-sm"
    >
      {message}
    </div>
  );
}
