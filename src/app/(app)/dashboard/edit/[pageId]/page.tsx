"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { slugifyUsername } from "@/lib/usernames";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type { PageRecord, ResumeData } from "@/types/resume";

type Tab = "content" | "theme" | "preview";

const ALL_THEMES = THEME_REGISTRY;

export default function EditPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("content");

  const [page, setPage] = useState<PageRecord | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>("cosmic");
  const [customSlug, setCustomSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}`);
        if (res.status === 401) { router.push("/login?next=/dashboard"); return; }
        if (!res.ok) { setError("Page not found or you don't have access."); setLoading(false); return; }
        const row = (await res.json()) as PageRecord;
        setPage(row);
        setData(row.resume_data);
        setThemeId(row.theme_id as ThemeId);
        setCustomSlug(row.slug);
      } catch {
        setError("Failed to load page.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pageId, router]);

  const checkSlug = useCallback(async (value: string) => {
    const clean = slugifyUsername(value);
    if (!clean || clean.length < 3) {
      setSlugStatus("invalid");
      setSlugMessage("At least 3 characters required.");
      return;
    }
    setSlugStatus("checking");
    try {
      const res = await fetch(`/api/username?slug=${encodeURIComponent(clean)}`);
      const json = (await res.json()) as { available: boolean; slug: string; reason: string | null };
      setSlugStatus(json.available ? "available" : "taken");
      setSlugMessage(json.available ? "Available!" : (json.reason ?? "Already taken."));
    } catch {
      setSlugStatus("idle");
    }
  }, []);

  const handleSlugChange = (value: string) => {
    setCustomSlug(value.toLowerCase().replace(/[^a-z0-9-_.]/g, ""));
    setSlugStatus("idle");
    setSlugMessage("");
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    slugTimerRef.current = setTimeout(() => checkSlug(value), 400);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      setData((prev) => prev ? { ...prev, avatar_url: json.url! } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    await fetch("/api/avatar", { method: "DELETE" });
    setData((prev) => prev ? { ...prev, avatar_url: null } : prev);
  };

  const updateField = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((prev) => prev ? { ...prev, [key]: value } : prev);
  }, []);

  const save = async () => {
    if (!data || !page || saving) return;
    if (slugStatus === "taken" || slugStatus === "invalid" || slugStatus === "checking") return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // If slug changed, update username via API
      const desiredSlug = slugifyUsername(customSlug) || page.slug;
      if (desiredSlug !== page.slug) {
        const patchRes = await fetch("/api/username", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: desiredSlug }),
        });
        if (!patchRes.ok) {
          const body = (await patchRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Could not update URL.");
        }
        // Update local page state with new slug
        setPage((prev) => prev ? { ...prev, slug: desiredSlug } : prev);
      }

      const saveRes = await fetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_data: data, theme_id: themeId, slug: desiredSlug, updated_at: new Date().toISOString() }),
      });
      if (!saveRes.ok) {
        const body = (await saveRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed.");
      }
      setSuccess("Saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 md:px-10">
        <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[rgba(59,130,246,0.2)] border-t-[#3B82F6]" />
          <p className="mt-4 text-sm text-[rgba(240,244,255,0.5)]">Loading page...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 md:px-10">
        <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-sm text-[#ff8e8e]">{error || "Page not found."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 md:px-10">
      {/* Header */}
      <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Edit Page</p>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#F0F4FF]">{data.name}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 sm:px-5 sm:py-2.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:text-[#93C5FD]"
          >
            Back
          </button>
          <button
            type="button"
            disabled={saving || slugStatus === "taken" || slugStatus === "invalid" || slugStatus === "checking"}
            onClick={save}
            className="gold-pill px-5 py-2 sm:px-6 sm:py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[rgba(255,120,120,0.35)] bg-[rgba(255,120,120,0.08)] px-4 py-3 text-sm text-[#ff8e8e]">{error}</p> : null}
      {success ? <p className="mb-4 rounded-xl border border-[rgba(100,220,100,0.35)] bg-[rgba(100,220,100,0.08)] px-4 py-3 text-sm text-[#88ee88]">{success}</p> : null}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-1">
        {(["content", "theme", "preview"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] transition-all"
            style={{
              background: tab === t ? "rgba(59,130,246,0.12)" : "transparent",
              color: tab === t ? "#93C5FD" : "rgba(240,244,255,0.45)",
              borderColor: tab === t ? "rgba(59,130,246,0.25)" : "transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {tab === "content" ? (
        <div className="space-y-5">
          {/* Page URL */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Page URL</legend>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
              <span className="rounded-lg sm:rounded-l-lg sm:rounded-r-none border sm:border-r-0 border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-3 py-2 font-mono text-sm text-[rgba(240,244,255,0.45)]">
                mylivingpage.com/
              </span>
              <input
                type="text"
                value={customSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="flex-1 rounded-lg sm:rounded-l-none sm:rounded-r-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD] focus:border-[#3B82F6] focus:outline-none"
              />
            </div>
            {slugMessage ? (
              <p className={`text-xs ${slugStatus === "available" ? "text-[#88ee88]" : slugStatus === "checking" ? "text-[rgba(240,244,255,0.4)]" : "text-[#ff8e8e]"}`}>
                {slugStatus === "checking" ? "Checking..." : slugMessage}
              </p>
            ) : null}
          </fieldset>

          {/* Basic Info */}
          <fieldset className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Basic Info</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Name</span>
                <input type="text" value={data.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Headline</span>
                <input type="text" value={data.headline} onChange={(e) => updateField("headline", e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Location</span>
                <input type="text" value={data.location} onChange={(e) => updateField("location", e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Email</span>
                <input type="email" value={data.email ?? ""} onChange={(e) => updateField("email", e.target.value || null)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">LinkedIn</span>
                <input type="text" value={data.linkedin ?? ""} onChange={(e) => updateField("linkedin", e.target.value || null)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">GitHub</span>
                <input type="text" value={data.github ?? ""} onChange={(e) => updateField("github", e.target.value || null)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Website</span>
                <input type="text" value={data.website ?? ""} onChange={(e) => updateField("website", e.target.value || null)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
            </div>
          </fieldset>

          {/* Profile Photo */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Profile Photo</legend>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              {data.avatar_url ? (
                <img src={data.avatar_url} alt="Avatar" className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover ring-2 ring-[#3B82F6] shadow-[0_0_28px_rgba(59,130,246,0.3)]" />
              ) : (
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#E8845C] font-heading text-xl sm:text-2xl font-bold text-[#0a1628] shadow-[0_0_28px_rgba(59,130,246,0.3)]">
                  {(data.name || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-1.5 text-xs uppercase tracking-[0.12em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] disabled:opacity-50"
                >
                  {uploadingAvatar ? "Uploading..." : data.avatar_url ? "Change Photo" : "Upload Photo"}
                </button>
                {data.avatar_url ? (
                  <button type="button" onClick={removeAvatar} className="text-xs text-[rgba(240,244,255,0.35)] hover:text-[#ff8e8e]">
                    Remove &middot; use monogram
                  </button>
                ) : (
                  <p className="text-[10px] text-[rgba(240,244,255,0.3)]">Optional &middot; JPEG, PNG, or WebP under 2 MB</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Summary */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Summary</legend>
            <textarea
              value={data.summary}
              onChange={(e) => updateField("summary", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm leading-6 text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
            />
          </fieldset>

          {/* Stats */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Stats</legend>
            {data.stats?.map((stat, i) => (
              <div key={i} className="flex gap-3">
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => {
                    const next = [...(data.stats ?? [])];
                    next[i] = { ...next[i], value: e.target.value };
                    updateField("stats", next);
                  }}
                  placeholder="Value"
                  className="w-28 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD] focus:border-[#3B82F6] focus:outline-none"
                />
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => {
                    const next = [...(data.stats ?? [])];
                    next[i] = { ...next[i], label: e.target.value };
                    updateField("stats", next);
                  }}
                  placeholder="Label"
                  className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateField("stats", (data.stats ?? []).filter((_, idx) => idx !== i))}
                  className="rounded-lg border border-[rgba(255,120,120,0.2)] px-3 py-2 text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]"
                >
                  Remove
                </button>
              </div>
            ))}
            {(data.stats?.length ?? 0) < 4 ? (
              <button
                type="button"
                onClick={() => updateField("stats", [...(data.stats ?? []), { value: "", label: "" }])}
                className="text-xs text-[#3B82F6] hover:text-[#93C5FD]"
              >
                + Add Stat
              </button>
            ) : null}
          </fieldset>

          {/* Experience */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Experience</legend>
            {data.experience?.map((exp, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                  <input type="text" value={exp.title} onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], title: e.target.value }; updateField("experience", next); }} placeholder="Title" className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                  <input type="text" value={exp.company} onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], company: e.target.value }; updateField("experience", next); }} placeholder="Company" className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                  <input type="text" value={exp.dates} onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], dates: e.target.value }; updateField("experience", next); }} placeholder="Dates" className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                </div>
                <textarea
                  value={exp.highlights?.join("\n") ?? ""}
                  onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], highlights: e.target.value.split("\n").filter(Boolean) }; updateField("experience", next); }}
                  rows={2}
                  placeholder="Highlights (one per line)"
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs leading-5 text-[rgba(240,244,255,0.6)] focus:border-[#3B82F6] focus:outline-none"
                />
                <button type="button" onClick={() => updateField("experience", data.experience.filter((_, idx) => idx !== i))} className="text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]">
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("experience", [...(data.experience ?? []), { title: "", company: "", dates: "", highlights: [] }])}
              className="text-xs text-[#3B82F6] hover:text-[#93C5FD]"
            >
              + Add Experience
            </button>
          </fieldset>

          {/* Education */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Education</legend>
            {data.education?.map((edu, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input type="text" value={edu.degree} onChange={(e) => { const next = [...data.education]; next[i] = { ...next[i], degree: e.target.value }; updateField("education", next); }} placeholder="Degree" className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <input type="text" value={edu.school} onChange={(e) => { const next = [...data.education]; next[i] = { ...next[i], school: e.target.value }; updateField("education", next); }} placeholder="School" className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <input type="text" value={edu.year} onChange={(e) => { const next = [...data.education]; next[i] = { ...next[i], year: e.target.value }; updateField("education", next); }} placeholder="Year" className="w-24 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <button type="button" onClick={() => updateField("education", data.education.filter((_, idx) => idx !== i))} className="rounded-lg border border-[rgba(255,120,120,0.2)] px-3 py-2 text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => updateField("education", [...(data.education ?? []), { degree: "", school: "", year: "" }])} className="text-xs text-[#3B82F6] hover:text-[#93C5FD]">+ Add Education</button>
          </fieldset>
        </div>
      ) : null}

      {/* Theme Tab */}
      {tab === "theme" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setThemeId(theme.id)}
              className="glass-card rounded-2xl p-3 text-left transition-all duration-300 ease-soft hover:-translate-y-1"
              style={{
                borderColor: themeId === theme.id ? "rgba(59,130,246,0.38)" : "rgba(255,255,255,0.08)",
                background: themeId === theme.id ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.03)",
              }}
            >
              <ThemeCanvas themeId={theme.id} height={120} />
              <p className="mt-3 font-heading text-xl">{theme.name}</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#3B82F6]">{theme.vibe}</p>
            </button>
          ))}
        </div>
      ) : null}

      {/* Preview Tab */}
      {tab === "preview" ? (
        <div className="overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.18)]">
          <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.35)] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <div className="ml-3 rounded-md bg-[rgba(255,255,255,0.06)] px-3 py-1 font-mono text-[11px] text-[rgba(240,244,255,0.5)]">
              mylivingpage.com/<span className="text-[#93C5FD]">{page?.slug}</span>
            </div>
          </div>
          <ThemeCanvas themeId={themeId} height="min(600px, calc(100dvh - 250px))" className="rounded-none">
            <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.58)_100%)]">
              <ResumeLayout data={data} />
            </div>
          </ThemeCanvas>
        </div>
      ) : null}
    </main>
  );
}
