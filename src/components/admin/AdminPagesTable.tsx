"use client";

import { useState } from "react";
import Link from "next/link";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = pages.filter((p) => {
    if (statusFilter !== "all") {
      const effectiveStatus = p.visibility === "public" ? "live" : (p.status ?? "draft");
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

  return (
    <div>
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
          const isLive = p.visibility === "public" || p.status === "live";
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
                {p.ownerEmail ? (
                  <p className="mt-1 truncate text-[11px] text-site-muted">
                    {p.ownerEmail}
                  </p>
                ) : null}
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
