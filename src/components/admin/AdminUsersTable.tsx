"use client";

import { useState } from "react";

interface AdminUser {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string;
  created_at: string;
  pageCount: number;
  totalViews: number;
}

export default function AdminUsersTable({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.full_name?.toLowerCase().includes(q) ?? false) ||
      (u.email?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or username..."
        className="mb-5 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm text-[#F0F4FF] placeholder-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none"
      />

      <div className="space-y-2">
        {filtered.map((u) => (
          <div
            key={u.id}
            className="glass-card flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-[rgba(59,130,246,0.3)]"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#E8845C] text-sm font-bold text-[#0a1628]">
                  {(u.full_name || u.username || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-[#F0F4FF]">
                  {u.full_name || u.username}
                </p>
                <p className="text-[11px] text-[rgba(240,244,255,0.4)]">
                  {u.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="font-mono text-[rgba(240,244,255,0.5)]">@{u.username}</span>
              <span className="rounded-full border border-[rgba(255,255,255,0.1)] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[rgba(240,244,255,0.45)]">
                {u.plan}
              </span>
              <span className="font-mono text-[#93C5FD]">{u.pageCount} page{u.pageCount !== 1 ? "s" : ""}</span>
              <span className="font-mono text-[rgba(240,244,255,0.4)]">{u.totalViews.toLocaleString()} views</span>
              <span className="text-[10px] font-mono text-[rgba(240,244,255,0.25)]">
                {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-[rgba(240,244,255,0.35)]">
            {search ? "No users match your search." : "No users yet."}
          </p>
        )}
      </div>
    </div>
  );
}
