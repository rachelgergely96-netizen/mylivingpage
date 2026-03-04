"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePageButton({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This will permanently delete this page and all its archives.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Failed to delete page. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      disabled={deleting}
      onClick={handleDelete}
      className="rounded-full border border-[rgba(255,120,120,0.25)] px-3 py-1.5 sm:px-4 sm:py-2 text-xs uppercase tracking-[0.14em] text-[rgba(255,120,120,0.6)] hover:border-[rgba(255,120,120,0.5)] hover:text-[#ff8e8e] disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
