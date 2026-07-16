"use client";

import { ProfilePanel } from "@/components/ui/ProfilePanel";

interface DraftBannerProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftBanner({ savedAt, onRestore, onDiscard }: DraftBannerProps) {
  const timeAgo = getTimeAgo(savedAt);

  return (
    <ProfilePanel
      title="Draft recovery"
      meta={<span className="profile-status !text-[#FBBF24]">Unsaved draft</span>}
      className="mb-4"
      contentClassName="p-3 sm:p-4"
      as="aside"
    >
      <div className="flex flex-col gap-3 text-sm text-[rgba(240,244,255,0.82)] sm:flex-row sm:items-center">
        <span className="flex-1 leading-6">You have an unsaved draft from {timeAgo}.</span>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onRestore}
            className="profile-action !min-h-0 border-[rgba(147,197,253,0.5)] bg-[rgba(59,130,246,0.24)] px-3 py-1.5 text-xs font-semibold text-[#EFF6FF]"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="profile-action !min-h-0 border-[rgba(125,170,255,0.16)] bg-[rgba(3,10,23,0.24)] px-3 py-1.5 text-xs text-[rgba(240,244,255,0.58)]"
          >
            Discard
          </button>
        </div>
      </div>
    </ProfilePanel>
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
