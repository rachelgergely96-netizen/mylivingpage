"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface DraftBannerProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftBanner({ savedAt, onRestore, onDiscard }: DraftBannerProps) {
  const [confirmingRestore, setConfirmingRestore] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const timeAgo = getTimeAgo(savedAt);

  return (
    <>
      <div className="site-callout flex flex-wrap items-center gap-3 px-4 py-3 text-sm" role="status">
        <span className="flex-1">You have an unsaved draft saved {timeAgo}.</span>
        <button
          type="button"
          onClick={() => setConfirmingRestore(true)}
          className="site-button site-button-secondary px-3 py-2"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDiscard(true)}
          className="site-button site-button-secondary px-3 py-2"
        >
          Discard
        </button>
      </div>
      <ConfirmDialog
        open={confirmingRestore}
        title="Restore this draft?"
        body={`Restoring replaces the content currently in the editor with the draft saved ${timeAgo}.`}
        confirmLabel="Restore draft"
        onConfirm={() => {
          setConfirmingRestore(false);
          onRestore();
        }}
        onClose={() => setConfirmingRestore(false)}
      />
      <ConfirmDialog
        open={confirmingDiscard}
        title="Discard this draft?"
        body={`This permanently deletes the draft saved ${timeAgo}. It cannot be undone.`}
        confirmLabel="Discard draft"
        destructive
        onConfirm={() => {
          setConfirmingDiscard(false);
          onDiscard();
        }}
        onClose={() => setConfirmingDiscard(false)}
      />
    </>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
