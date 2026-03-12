"use client";

import Image from "next/image";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

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
}

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

export default function AdminUsersTable({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(users);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const showToast = (kind: "success" | "error", text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => {
      setToast((current) => (current?.text === text ? null : current));
    }, 3000);
  };

  const filtered = rows.filter((user) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      user.username.toLowerCase().includes(q) ||
      (user.full_name?.toLowerCase().includes(q) ?? false) ||
      (user.email?.toLowerCase().includes(q) ?? false)
    );
  });

  const closeDeleteModal = () => {
    setSelectedUser(null);
    setDeleteConfirmText("");
    setDeletingUserId(null);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser?.email) return;

    setDeletingUserId(selectedUser.id);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to delete user.");
      }

      setRows((current) => current.filter((user) => user.id !== selectedUser.id));
      showToast("success", `Deleted ${selectedUser.email}`);
      closeDeleteModal();
      startTransition(() => router.refresh());
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to delete user.");
      setDeletingUserId(null);
    }
  };

  return (
    <div>
      {toast ? (
        <div
          className={`fixed right-4 top-4 z-50 rounded-xl px-5 py-3 text-sm backdrop-blur-xl ${
            toast.kind === "success"
              ? "border border-[rgba(74,222,128,0.3)] bg-[rgba(8,22,18,0.92)] text-[#86efac]"
              : "border border-[rgba(239,68,68,0.35)] bg-[rgba(24,10,10,0.92)] text-[#fca5a5]"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email, or username..."
        className="mb-5 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm text-[#F0F4FF] placeholder-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none"
      />

      <div className="space-y-2">
        {filtered.map((user) => (
          <div
            key={user.id}
            className="glass-card flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-[rgba(59,130,246,0.3)]"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#E8845C] text-sm font-bold text-[#0a1628]">
                  {(user.full_name || user.username || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-[#F0F4FF]">
                  {user.full_name || user.username}
                </p>
                <p className="text-[11px] text-[rgba(240,244,255,0.4)]">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-mono text-[rgba(240,244,255,0.5)]">@{user.username}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                user.auth_provider === "google"
                  ? "border border-[rgba(66,133,244,0.3)] bg-[rgba(66,133,244,0.15)] text-[#8AB4F8]"
                  : "border border-[rgba(255,255,255,0.1)] text-[rgba(240,244,255,0.45)]"
              }`}>
                {user.auth_provider ?? "email"}
              </span>
              <span className="rounded-full border border-[rgba(255,255,255,0.1)] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[rgba(240,244,255,0.45)]">
                {user.plan}
              </span>
              <span className="font-mono text-[#93C5FD]">{user.pageCount} page{user.pageCount !== 1 ? "s" : ""}</span>
              <span className="font-mono text-[rgba(240,244,255,0.4)]">{user.totalViews.toLocaleString()} views</span>
              <span className="font-mono text-[rgba(240,244,255,0.4)]">{user.sign_in_count} login{user.sign_in_count !== 1 ? "s" : ""}</span>
              {user.signup_referrer ? (
                <span className="rounded-full border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] px-2 py-0.5 text-[10px] text-[#BFDBFE]">
                  <span className="font-mono">{user.signup_referrer}</span>
                </span>
              ) : null}
              {user.last_sign_in_at ? (
                <span className="text-[10px] font-mono text-[rgba(240,244,255,0.35)]" title={new Date(user.last_sign_in_at).toLocaleString()}>
                  seen {timeAgo(user.last_sign_in_at)}
                </span>
              ) : null}
              <span className="text-[10px] font-mono text-[rgba(240,244,255,0.25)]">
                {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              {user.isAdmin ? (
                <span className="rounded-full border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#ff8e8e]">
                  Protected
                </span>
              ) : !user.email ? (
                <span className="rounded-full border border-[rgba(255,255,255,0.1)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.35)]">
                  No Email
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(user);
                    setDeleteConfirmText("");
                    setDeletingUserId(null);
                  }}
                  className="rounded-full border border-[rgba(239,68,68,0.35)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#ff8e8e] transition-colors hover:bg-[rgba(239,68,68,0.1)]"
                >
                  Delete User
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[rgba(240,244,255,0.35)]">
            {search ? "No users match your search." : "No users yet."}
          </p>
        ) : null}
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(10,22,40,0.96)] p-6 sm:p-7">
            <h3 className="mb-3 font-heading text-xl font-bold text-[#ff8e8e]">Delete User Account</h3>
            <p className="mb-2 text-sm text-[rgba(240,244,255,0.62)]">
              This permanently deletes the user account, associated pages, auth access, and avatar storage.
            </p>
            <div className="mb-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[rgba(240,244,255,0.72)]">
              <p className="font-medium text-[#F0F4FF]">{selectedUser.full_name || selectedUser.username}</p>
              <p className="mt-1 text-[rgba(240,244,255,0.5)]">@{selectedUser.username}</p>
              <p className="mt-1 text-[rgba(240,244,255,0.5)]">{selectedUser.email}</p>
            </div>
            <p className="mb-3 text-sm text-[rgba(240,244,255,0.6)]">
              Type <span className="font-mono text-[#ff8e8e]">{selectedUser.email}</span> to confirm permanent deletion.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder={selectedUser.email ?? ""}
              className="mb-4 h-11 w-full rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.25)] focus:border-[#ef4444] focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 rounded-xl border border-[rgba(255,255,255,0.12)] py-2.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:text-[#F0F4FF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteConfirmText !== selectedUser.email || deletingUserId === selectedUser.id}
                className="flex-1 rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.15)] py-2.5 text-xs uppercase tracking-[0.14em] text-[#ff8e8e] hover:bg-[rgba(239,68,68,0.25)] disabled:opacity-40"
              >
                {deletingUserId === selectedUser.id ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
