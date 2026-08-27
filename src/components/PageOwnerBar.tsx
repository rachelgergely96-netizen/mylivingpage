"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DELETE_PAGE_CONFIRM_BODY } from "@/components/DeletePageButton";
import {
  claimPageDeletionRequest,
  releasePageDeletionRequest,
  requestPageDeletion,
} from "@/components/pageDeletionClient";

interface PageOwnerBarProps {
  pageId: string;
  isOwner: boolean;
  children: ReactNode;
}

const ownerBarSafeAreaStyle = {
  paddingTop: "env(safe-area-inset-top, 0px)",
};

export default function PageOwnerBar({ pageId, isOwner, children }: PageOwnerBarProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletionRequestRef = useRef(false);

  const handleDelete = async () => {
    if (!claimPageDeletionRequest(deletionRequestRef)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await requestPageDeletion(pageId);
      setConfirmOpen(false);
      router.push("/dashboard");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Unable to delete page.");
    } finally {
      releasePageDeletionRequest(deletionRequestRef);
      setDeleting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      {isOwner ? (
        <>
          <div aria-hidden="true" className="shrink-0" style={ownerBarSafeAreaStyle}>
            <div className="h-16" />
          </div>
          <div className="fixed left-0 right-0 top-0 z-50 border-b border-site-border bg-site-canvas" style={ownerBarSafeAreaStyle} data-site-ui>
            <div className="site-container flex min-h-16 items-center justify-between gap-2 sm:gap-3">
              <Link
                href="/dashboard"
                className="site-nav-link shrink-0 gap-1.5 whitespace-nowrap"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Dashboard
              </Link>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmOpen(true)}
                  className="site-nav-link whitespace-nowrap text-site-danger hover:text-site-danger disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                <Link
                  href={`/dashboard/edit/${pageId}/living-page`}
                  className="site-button site-button-secondary whitespace-nowrap px-3 text-xs sm:px-4"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
          {confirmOpen ? (
            <div data-site-ui>
              <ConfirmDialog
                open={confirmOpen}
                title="Delete this page?"
                body={DELETE_PAGE_CONFIRM_BODY}
                confirmLabel={deleting ? "Deleting…" : "Delete page"}
                destructive
                loading={deleting}
                error={deleteError}
                onConfirm={handleDelete}
                onClose={() => {
                  setConfirmOpen(false);
                  setDeleteError(null);
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}
      <div className="min-h-0 flex-1">
        {children}
      </div>
    </div>
  );
}
