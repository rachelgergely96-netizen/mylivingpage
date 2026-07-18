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
      className="site-button site-button-danger px-3 py-2 text-xs disabled:opacity-50 sm:px-4"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
