"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PublishPageButtonProps {
  pageId: string;
}

export default function PublishPageButton({ pageId }: PublishPageButtonProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishPage = async () => {
    setPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "live",
          visibility: "public",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to publish this page.");
      }

      router.refresh();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish this page.",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={publishing}
        onClick={() => void publishPage()}
        className="rounded-full border border-[rgba(74,222,128,0.35)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#4ade80] hover:text-[#86efac] disabled:opacity-50 sm:px-4 sm:py-2"
      >
        {publishing ? "Publishing..." : "Publish"}
      </button>
      {error ? <p className="mt-2 text-xs text-[#ff8e8e]">{error}</p> : null}
    </div>
  );
}
