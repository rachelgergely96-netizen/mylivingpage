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
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, slug, or owner..."
          className="flex-1 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm text-[#F0F4FF] placeholder-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
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
              className="glass-card flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[#F0F4FF]">{p.pageName}</p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]"
                    style={{
                      background: isLive ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)",
                      color: isLive ? "#4ade80" : "rgba(240,244,255,0.4)",
                      border: `1px solid ${isLive ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {isLive ? "live" : (p.status ?? "draft")}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-[rgba(240,244,255,0.4)]">
                  /{p.slug} &middot; by @{p.ownerUsername}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="rounded-full border border-[rgba(255,255,255,0.1)] px-2 py-0.5 text-[10px] text-[rgba(240,244,255,0.45)]">
                  {p.theme_id}
                </span>
                <span className="font-mono text-[#93C5FD]">{p.views.toLocaleString()} views</span>
                <span className="text-[10px] font-mono text-[rgba(240,244,255,0.25)]">
                  {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {isLive && (
                  <Link
                    href={`/${p.slug}`}
                    target="_blank"
                    className="text-[11px] uppercase tracking-[0.1em] text-[#3B82F6] hover:text-[#93C5FD]"
                  >
                    View
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-[rgba(240,244,255,0.35)]">
            {search || statusFilter !== "all" ? "No pages match your filters." : "No pages yet."}
          </p>
        )}
      </div>
    </div>
  );
}
