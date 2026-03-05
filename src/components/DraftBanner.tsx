"use client";

interface DraftBannerProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftBanner({ savedAt, onRestore, onDiscard }: DraftBannerProps) {
  const timeAgo = getTimeAgo(savedAt);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.8)]">
      <span className="flex-1">You have an unsaved draft from {timeAgo}.</span>
      <button
        type="button"
        onClick={onRestore}
        className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2563EB]"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="rounded-lg border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-xs text-[rgba(240,244,255,0.5)] transition-colors hover:text-[rgba(240,244,255,0.8)]"
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
