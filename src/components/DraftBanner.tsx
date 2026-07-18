"use client";

interface DraftBannerProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftBanner({ savedAt, onRestore, onDiscard }: DraftBannerProps) {
  const timeAgo = getTimeAgo(savedAt);

  return (
    <div className="site-callout mb-4 flex flex-wrap items-center gap-3 px-4 py-3 text-sm" role="status">
      <span className="flex-1">You have an unsaved draft from {timeAgo}.</span>
      <button
        type="button"
        onClick={onRestore}
        className="site-button site-button-primary px-3 py-2 text-xs"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="site-button site-button-secondary px-3 py-2 text-xs"
      >
        Discard
      </button>
    </div>
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
