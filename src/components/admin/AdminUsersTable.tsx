"use client";

import Image from "next/image";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { BotDisposition, BotRiskSignal } from "@/lib/bot-risk";
import AdminDeleteDialogError, {
  ADMIN_DELETE_ERROR_ID,
  claimAdminDeleteRequest,
  focusAdminDeleteFailure,
  restoreAdminDeleteFocus,
} from "@/components/admin/AdminDeleteDialogError";

interface AdminUser {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string;
  created_at: string;
  auth_provider: string | null;
  last_sign_in_at: string | null;
  sign_in_count: number;
  signup_referrer: string | null;
  pageCount: number;
  totalViews: number;
  isAdmin: boolean;
  emailConfirmedAt: string | null;
  botRiskScore: number;
  botSignals: BotRiskSignal[];
  botDisposition: BotDisposition;
  isUnconfirmedPastGrace: boolean;
}

type UserFilter = "all" | "suspicious" | "unconfirmed";

const DIALOG_FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getDispositionBadgeClasses(disposition: BotDisposition) {
  switch (disposition) {
    case "suspicious":
      return "site-badge-danger";
    case "watch":
      return "site-badge-warning";
    default:
      return "";
  }
}

function getConfirmationBadgeClasses(
  emailConfirmedAt: string | null,
  isUnconfirmedPastGrace: boolean,
) {
  if (emailConfirmedAt) {
    return "site-badge-success";
  }

  if (isUnconfirmedPastGrace) {
    return "site-badge-warning";
  }

  return "";
}

export default function AdminUsersTable({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(users);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeFilter, setActiveFilter] = useState<UserFilter>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const deleteDialogTitleId = useId();
  const deleteDialogDescriptionId = useId();
  const deleteConfirmInputId = useId();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteDialogRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmInputRef = useRef<HTMLInputElement | null>(null);
  const deleteRetryRef = useRef<HTMLButtonElement | null>(null);
  const deleteRequestInFlightRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (kind: "success" | "error", text: string) => {
    setToast({ kind, text });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast((current) => (current?.text === text ? null : current));
    }, 3000);
  };

  const filtered = rows.filter((user) => {
    const q = deferredSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      user.username.toLowerCase().includes(q) ||
      (user.full_name?.toLowerCase().includes(q) ?? false) ||
      (user.email?.toLowerCase().includes(q) ?? false);
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "suspicious" && user.botDisposition === "suspicious") ||
      (activeFilter === "unconfirmed" && !user.emailConfirmedAt);

    return matchesSearch && matchesFilter;
  });

  const suspiciousCount = rows.filter((user) => user.botDisposition === "suspicious").length;
  const unconfirmedCount = rows.filter((user) => !user.emailConfirmedAt).length;

  const closeDeleteModal = useCallback((allowInFlight = false) => {
    if (deleteRequestInFlightRef.current && !allowInFlight) {
      return;
    }
    const trigger = deleteTriggerRef.current;
    setSelectedUser(null);
    setDeleteConfirmText("");
    setDeletingUserId(null);
    setDeleteError(null);
    window.requestAnimationFrame(() => {
      restoreAdminDeleteFocus(trigger, searchInputRef.current);
    });
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleteRequestInFlightRef.current) {
        closeDeleteModal();
        return;
      }

      if (event.key !== "Tab" || !deleteDialogRef.current) {
        return;
      }

      const focusable = Array.from(
        deleteDialogRef.current.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        deleteDialogRef.current.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDeleteModal, selectedUser]);

  useEffect(() => {
    if (!selectedUser || deletingUserId || !deleteError) {
      return;
    }

    focusAdminDeleteFailure(deleteRetryRef.current, deleteConfirmInputRef.current);
  }, [deleteError, deletingUserId, selectedUser]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
  }, []);

  const handleDeleteUser = async () => {
    if (!selectedUser?.email || !claimAdminDeleteRequest(deleteRequestInFlightRef)) return;

    const targetUser = selectedUser;
    setDeletingUserId(targetUser.id);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to delete user.");
      }

      setRows((current) => current.filter((user) => user.id !== targetUser.id));
      showToast("success", `Deleted ${targetUser.email}`);
      closeDeleteModal(true);
      startTransition(() => router.refresh());
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete user.");
    } finally {
      deleteRequestInFlightRef.current = false;
      setDeletingUserId(null);
    }
  };

  return (
    <div>
      {toast ? (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live={toast.kind === "error" ? "assertive" : "polite"}
          className={`fixed right-4 top-4 z-50 border bg-site-surface-raised px-5 py-3 text-sm shadow-[var(--site-shadow-raised)] ${
            toast.kind === "success"
              ? "border-site-success text-site-success"
              : "border-site-danger text-site-danger"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <label htmlFor="admin-user-search" className="sr-only">
        Search users
      </label>
      <input
        ref={searchInputRef}
        id="admin-user-search"
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email, or username…"
        className="site-field mb-5 px-4 py-2.5"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { id: "all" as const, label: `All (${rows.length})` },
          { id: "suspicious" as const, label: `Suspicious (${suspiciousCount})` },
          { id: "unconfirmed" as const, label: `Unconfirmed (${unconfirmedCount})` },
        ].map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            aria-pressed={activeFilter === filter.id}
            className={`site-button px-3 py-1.5 text-xs ${
              activeFilter === filter.id
                ? "border-site-action bg-site-selected text-site-action"
                : "site-button-secondary"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((user) => (
          <article key={user.id} className="site-panel p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt=""
                    width={36}
                    height={36}
                    sizes="36px"
                    className="h-9 w-9 object-cover ring-1 ring-site-border-strong"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-site-border-strong bg-site-action text-sm font-bold text-site-action-ink">
                    {(user.full_name || user.username || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-semibold text-site-text">
                    {user.full_name || user.username}
                  </h2>
                  <p className="text-xs text-site-muted">{user.email}</p>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-site-secondary">@{user.username}</span>
                  <span
                    className={`site-badge py-0.5 text-xs ${
                      user.auth_provider === "google"
                        ? "border-site-action text-site-action"
                        : ""
                    }`}
                  >
                    {user.auth_provider ?? "email"}
                  </span>
                  <span className="site-badge py-0.5 text-xs">
                    {user.plan}
                  </span>
                  <span
                    className={`site-badge py-0.5 text-xs ${getDispositionBadgeClasses(user.botDisposition)}`}
                  >
                    {user.botDisposition} risk {user.botRiskScore}
                  </span>
                  <span
                    className={`site-badge py-0.5 text-xs ${getConfirmationBadgeClasses(
                      user.emailConfirmedAt,
                      user.isUnconfirmedPastGrace,
                    )}`}
                    title={
                      user.emailConfirmedAt
                        ? `Confirmed ${new Date(user.emailConfirmedAt).toLocaleString()}`
                        : "No confirmed email recorded"
                    }
                  >
                    {user.emailConfirmedAt
                      ? "confirmed"
                      : user.isUnconfirmedPastGrace
                        ? "unconfirmed >24h"
                        : "unconfirmed"}
                  </span>
                  <span className="tabular-nums text-site-action">
                    {user.pageCount} page{user.pageCount !== 1 ? "s" : ""}
                  </span>
                  <span className="tabular-nums text-site-secondary">
                    {user.totalViews.toLocaleString()} views
                  </span>
                  <span className="tabular-nums text-site-secondary">
                    {user.sign_in_count} login{user.sign_in_count !== 1 ? "s" : ""}
                  </span>
                  {user.signup_referrer ? (
                    <span className="site-badge py-0.5 text-xs text-site-action">
                      <span className="font-mono">{user.signup_referrer}</span>
                    </span>
                  ) : null}
                  {user.last_sign_in_at ? (
                    <span
                      className="font-mono text-xs text-site-muted"
                      title={new Date(user.last_sign_in_at).toLocaleString()}
                    >
                      seen {timeAgo(user.last_sign_in_at)}
                    </span>
                  ) : null}
                  <time dateTime={user.created_at} className="font-mono text-xs text-site-muted">
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>

                {user.botSignals.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.botSignals.map((signal) => (
                      <span
                        key={`${user.id}-${signal.id}`}
                        className="site-badge site-badge-warning px-2.5 py-1 text-xs"
                      >
                        {signal.label} (+{signal.score})
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 xl:shrink-0">
                {user.isAdmin ? (
                  <span className="site-badge site-badge-danger px-3 py-1 text-xs">
                    Protected
                  </span>
                ) : !user.email ? (
                  <span className="site-badge px-3 py-1 text-xs">
                    No email
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      deleteTriggerRef.current = event.currentTarget;
                      setSelectedUser(user);
                      setDeleteConfirmText("");
                      setDeletingUserId(null);
                      setDeleteError(null);
                    }}
                    className="site-button site-button-danger px-3 py-1.5 text-xs"
                  >
                    Delete user
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-site-muted">
            {search || activeFilter !== "all"
              ? "No users match the current search and filters."
              : "No users yet."}
          </p>
        ) : null}
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            ref={deleteDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteDialogTitleId}
            aria-describedby={deleteDialogDescriptionId}
            className="site-panel-raised w-full max-w-md border-site-danger p-6 sm:p-7"
          >
            <h3 id={deleteDialogTitleId} className="site-panel-title mb-3 text-site-danger">
              Delete user account
            </h3>
            <p id={deleteDialogDescriptionId} className="mb-2 text-sm text-site-secondary">
              This permanently deletes the user account, associated pages, auth access, and avatar storage.
            </p>
            <div className="mb-4 border border-site-border bg-site-canvas-alt p-4 text-sm text-site-secondary">
              <p className="font-semibold text-site-text">{selectedUser.full_name || selectedUser.username}</p>
              <p className="mt-1 font-mono">@{selectedUser.username}</p>
              <p className="mt-1">{selectedUser.email}</p>
            </div>
            <label htmlFor={deleteConfirmInputId} className="mb-3 block text-sm text-site-secondary">
              Type <span className="font-mono text-site-danger">{selectedUser.email}</span> to confirm permanent deletion.
            </label>
            <input
              ref={deleteConfirmInputRef}
              id={deleteConfirmInputId}
              type="text"
              autoFocus
              value={deleteConfirmText}
              onChange={(event) => {
                setDeleteConfirmText(event.target.value);
                setDeleteError(null);
              }}
              placeholder={selectedUser.email ?? ""}
              aria-describedby={deleteError ? ADMIN_DELETE_ERROR_ID : undefined}
              className="site-field mb-4 border-site-danger px-4"
            />
            {deleteError ? <AdminDeleteDialogError message={deleteError} /> : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => closeDeleteModal()}
                disabled={deletingUserId === selectedUser.id}
                className="site-button site-button-secondary flex-1 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                ref={deleteRetryRef}
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteConfirmText !== selectedUser.email || deletingUserId === selectedUser.id}
                aria-describedby={deleteError ? ADMIN_DELETE_ERROR_ID : undefined}
                className="site-button site-button-danger flex-1 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingUserId === selectedUser.id ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
