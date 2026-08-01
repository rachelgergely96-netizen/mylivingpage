"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

/**
 * Single source of truth for what deleting a page means, shared by every
 * delete-page ConfirmDialog (dashboard rail here, PageOwnerBar on the public
 * page) so owners get one consistent account of the consequences.
 */
export const DELETE_PAGE_CONFIRM_BODY =
  "This permanently deletes the page and all of its archives. Your public link stops working and this cannot be undone.";

export default function DeletePageButton({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfirming(false);
      router.refresh();
    } catch {
      setError("The page could not be deleted. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={deleting}
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="site-button site-button-danger px-3 py-2 disabled:opacity-50 sm:px-4"
      >
        Delete
      </button>
      <ConfirmDialog
        open={confirming}
        title="Delete this page?"
        body={DELETE_PAGE_CONFIRM_BODY}
        confirmLabel={deleting ? "Deleting…" : "Delete page"}
        destructive
        loading={deleting}
        error={error}
        onConfirm={() => void handleDelete()}
        onClose={() => {
          if (!deleting) {
            setConfirming(false);
            setError(null);
          }
        }}
      />
    </>
  );
}
