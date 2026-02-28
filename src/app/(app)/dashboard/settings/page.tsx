"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { slugifyUsername } from "@/lib/usernames";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string;
  created_at: string;
  hasPassword: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvail, setUsernameAvail] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Save statuses
  const [savingName, setSavingName] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Feedback
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load profile
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      if (res.status === 401) { router.push("/login?next=/dashboard/settings"); return; }
      if (!res.ok) { setLoading(false); return; }
      const data = (await res.json()) as Profile;
      setProfile(data);
      setFullName(data.full_name ?? "");
      setUsername(data.username ?? "");
      setAvatarUrl(data.avatar_url);
      setLoading(false);
    })();
  }, [router]);

  // Username availability check (debounced)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!profile) return;
    const slug = slugifyUsername(username);
    if (slug === profile.username) { setUsernameAvail(null); return; }
    if (slug.length < 3) { setUsernameAvail({ available: false, reason: "Must be at least 3 characters." }); return; }

    setUsernameChecking(true);
    clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/username?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setUsernameAvail({ available: data.available, reason: data.reason });
      setUsernameChecking(false);
    }, 400);

    return () => clearTimeout(checkTimeoutRef.current);
  }, [username, profile]);

  // Save full name
  const onSaveName = async () => {
    setSavingName(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });
    setSavingName(false);
    if (res.ok) {
      setProfile((p) => p ? { ...p, full_name: fullName } : p);
      showToast("Name updated");
    }
  };

  // Save username
  const onSaveUsername = async () => {
    const slug = slugifyUsername(username);
    if (!usernameAvail?.available) return;
    setSavingUsername(true);
    const res = await fetch("/api/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    setSavingUsername(false);
    if (res.ok) {
      setProfile((p) => p ? { ...p, username: slug } : p);
      setUsernameAvail(null);
      showToast("Username updated");
    }
  };

  // Avatar upload
  const onAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/avatar", { method: "POST", body: form });
    setUploadingAvatar(false);
    if (res.ok) {
      const { url } = await res.json();
      setAvatarUrl(url);
      showToast("Avatar updated");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onAvatarRemove = async () => {
    setUploadingAvatar(true);
    const res = await fetch("/api/avatar", { method: "DELETE" });
    setUploadingAvatar(false);
    if (res.ok) {
      setAvatarUrl(null);
      showToast("Avatar removed");
    }
  };

  // Change password
  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) { setPasswordMsg({ ok: false, text: "Password must be at least 8 characters." }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: "Passwords do not match." }); return; }

    setSavingPassword(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSavingPassword(false);
    if (res.ok) {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ ok: true, text: "Password updated successfully." });
    } else {
      const data = await res.json();
      setPasswordMsg({ ok: false, text: data.error ?? "Failed to update password." });
    }
  };

  // Delete account
  const onDeleteAccount = async () => {
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace("/");
    } else {
      setDeleting(false);
      showToast("Failed to delete account.");
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 md:px-10">
        <p className="text-sm text-[rgba(240,244,255,0.5)]">Loading settings...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 md:px-10">
        <p className="text-sm text-[#ff8e8e]">Unable to load profile.</p>
      </main>
    );
  }

  const usernameChanged = slugifyUsername(username) !== profile.username;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-10 md:px-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-[rgba(59,130,246,0.3)] bg-[rgba(10,22,40,0.9)] px-5 py-3 text-sm text-[#93C5FD] backdrop-blur-xl">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Settings</p>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[#F0F4FF]">Account Settings</h1>
      </div>

      {/* ── Profile Section ── */}
      <section className="glass-card rounded-2xl p-5 sm:p-7 mb-5">
        <h2 className="font-heading text-lg font-semibold text-[#F0F4FF] mb-5">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl text-[rgba(240,244,255,0.3)]">
                {(profile.full_name?.[0] ?? profile.username?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="rounded-full border border-[rgba(59,130,246,0.35)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] disabled:opacity-50"
            >
              {uploadingAvatar ? "Uploading..." : "Upload"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={onAvatarRemove}
                disabled={uploadingAvatar}
                className="rounded-full border border-[rgba(255,255,255,0.12)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.5)] hover:text-[#ff8e8e] disabled:opacity-50"
              >
                Remove
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatarUpload} />
          </div>
        </div>

        {/* Full Name */}
        <div className="mb-5">
          <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Full Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="h-11 flex-1 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="button"
              onClick={onSaveName}
              disabled={savingName || fullName === (profile.full_name ?? "")}
              className="rounded-xl border border-[rgba(59,130,246,0.35)] px-5 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] disabled:opacity-40"
            >
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Username */}
        <div className="mb-5">
          <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Username</label>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-0 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] focus-within:border-[#3B82F6]">
              <span className="pl-4 text-sm text-[rgba(240,244,255,0.3)]">mylivingpage.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={40}
                className="h-11 flex-1 bg-transparent px-1 text-sm text-[#F0F4FF] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onSaveUsername}
              disabled={savingUsername || !usernameChanged || !usernameAvail?.available}
              className="rounded-xl border border-[rgba(59,130,246,0.35)] px-5 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] disabled:opacity-40"
            >
              {savingUsername ? "Saving..." : "Save"}
            </button>
          </div>
          {usernameChecking && <p className="mt-1.5 text-xs text-[rgba(240,244,255,0.4)]">Checking...</p>}
          {usernameAvail && !usernameChecking && (
            <p className={`mt-1.5 text-xs ${usernameAvail.available ? "text-[#4ade80]" : "text-[#ff8e8e]"}`}>
              {usernameAvail.available ? "Available" : usernameAvail.reason}
            </p>
          )}
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Email</label>
          <input
            type="email"
            value={profile.email ?? ""}
            disabled
            className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 text-sm text-[rgba(240,244,255,0.4)]"
          />
          <p className="mt-1 text-[10px] text-[rgba(240,244,255,0.3)]">Email changes are not yet supported.</p>
        </div>
      </section>

      {/* ── Account Section (Password) ── */}
      {profile.hasPassword && (
        <section className="glass-card rounded-2xl p-5 sm:p-7 mb-5">
          <h2 className="font-heading text-lg font-semibold text-[#F0F4FF] mb-5">Change Password</h2>
          <form className="space-y-3 max-w-sm" onSubmit={onChangePassword}>
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Repeat password"
                className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-xl border border-[rgba(59,130,246,0.35)] px-6 py-2.5 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] disabled:opacity-50"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
            {passwordMsg && (
              <p className={`text-xs ${passwordMsg.ok ? "text-[#4ade80]" : "text-[#ff8e8e]"}`}>{passwordMsg.text}</p>
            )}
          </form>
        </section>
      )}

      {/* ── Plan Section ── */}
      <section className="glass-card rounded-2xl p-5 sm:p-7 mb-5">
        <h2 className="font-heading text-lg font-semibold text-[#F0F4FF] mb-3">Plan</h2>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[rgba(59,130,246,0.35)] px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-[#3B82F6]">
            {profile.plan ?? "spark"}
          </span>
          <button
            type="button"
            disabled
            className="rounded-full border border-[rgba(255,255,255,0.12)] px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]"
          >
            Upgrade (coming soon)
          </button>
        </div>
      </section>

      {/* ── Danger Zone ── */}
      <section className="rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.04)] p-5 sm:p-7">
        <h2 className="font-heading text-lg font-semibold text-[#ff8e8e] mb-3">Danger Zone</h2>
        <p className="mb-4 text-sm text-[rgba(240,244,255,0.5)]">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="rounded-xl border border-[rgba(239,68,68,0.4)] px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-[#ff8e8e] hover:bg-[rgba(239,68,68,0.1)]"
        >
          Delete Account
        </button>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(10,22,40,0.95)] p-6 sm:p-7">
            <h3 className="font-heading text-xl font-bold text-[#ff8e8e] mb-3">Delete Account</h3>
            <p className="mb-4 text-sm text-[rgba(240,244,255,0.6)]">
              This will permanently delete your profile, all pages, and analytics data. Type <span className="font-mono text-[#ff8e8e]">{profile.username}</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={profile.username}
              className="mb-4 h-11 w-full rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.25)] focus:border-[#ef4444] focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                className="flex-1 rounded-xl border border-[rgba(255,255,255,0.12)] py-2.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:text-[#F0F4FF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={deleteConfirmText !== profile.username || deleting}
                className="flex-1 rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.15)] py-2.5 text-xs uppercase tracking-[0.14em] text-[#ff8e8e] hover:bg-[rgba(239,68,68,0.25)] disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
