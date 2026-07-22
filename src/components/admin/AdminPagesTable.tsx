"use client";

import { useState } from "react";
import Link from "next/link";
import { isPubliclyAvailablePage } from "@/lib/hosting-state";

interface AdminPage {
  id: string;
  slug: string;
  status: string | null;
  visibility: string | null;
  title: string | null;
  theme_id: string;
  views: number;
  created_at: string;
  pageName: string;
  ownerUsername: string;
  ownerEmail: string | null;
}

export default function AdminPagesTable({ pages }: { pages: AdminPage[] }) {
  const [pageRows, setPageRows] = useState(pages);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingPageId, setPendingPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = pageRows.filter((p) => {
    if (statusFilter !== "all") {
      const effectiveStatus = isPubliclyAvailablePage(p) ? "live" : "draft";
      if (effectiveStatus !== statusFilter) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.slug.toLowerCase().includes(q) ||
      p.pageName.toLowerCase().includes(q) ||
      p.ownerUsername.toLowerCase().includes(q) ||
      (p.ownerEmail?.toLowerCase().includes(q) ?? false)
    );
  });

  const unpublish = async (pageId: string) => {
    if (!window.confirm("Unpublish this page? Its public URL will stop working immediately.")) return;
    setPendingPageId(pageId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/pages/${pageId}`, { method: "PATCH" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to unpublish page.");
      setPageRows((current) => current.map((page) => page.id === pageId
        ? { ...page, status: "draft", visibility: "private" }
        : page));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to unpublish page.");
    } finally {
      setPendingPageId(null);
    }
  };

  return (
    <div>
      {error ? <p role="alert" className="mb-4 text-sm text-site-danger">{error}</p> : null}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="admin-page-search" className="sr-only">
          Search pages
        </label>
        <input
          id="admin-page-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, slug, or owner..."
          className="site-field flex-1 px-4 py-2.5 text-sm"
        />
        <label htmlFor="admin-page-status" className="sr-only">
          Filter pages by status
        </label>
        <select
          id="admin-page-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="site-field w-full px-4 py-2.5 text-sm sm:w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="live">Live</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => {
          const isLive = isPubliclyAvailablePage(p);
          return (
            <div
              key={p.id}
              className="site-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-site-text">{p.pageName}</p>
                  <span
                    className={`site-badge shrink-0 py-0.5 text-[10px] ${
                      isLive ? "site-badge-success" : ""
                    }`}
                  >
                    {isLive ? "live" : (p.status ?? "draft")}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-site-muted">
                  /{p.slug} &middot; by @{p.ownerUsername}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="site-badge py-0.5 font-mono text-[10px]">
                  {p.theme_id}
                </span>
                <span className="tabular-nums text-site-action">{p.views.toLocaleString()} views</span>
                <time
                  dateTime={p.created_at}
                  className="font-mono text-[10px] text-site-muted"
                >
                  {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </time>
                {isLive && (
                  <button
                    type="button"
                    disabled={pendingPageId === p.id}
                    onClick={() => unpublish(p.id)}
                    className="site-button site-button-danger px-3 py-1.5 text-[11px]"
                  >
                    {pendingPageId === p.id ? "Unpublishing..." : "Unpublish"}
                  </button>
                )}
                {isLive && (
                  <Link
                    href={`/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-button site-button-secondary px-3 py-1.5 text-[11px]"
                  >
                    View
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-site-muted">
            {search || statusFilter !== "all" ? "No pages match your filters." : "No pages yet."}
          </p>
        )}
      </div>
    </div>
  );
}
