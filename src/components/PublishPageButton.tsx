"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PublishPageButtonProps {
  pageId: string;
  emphasis?: "primary" | "success";
  label?: string;
}

export default function PublishPageButton({
  pageId,
  emphasis = "success",
  label = "Publish",
}: PublishPageButtonProps) {
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
        className={`site-button disabled:opacity-50 ${
          emphasis === "primary"
            ? "site-button-primary w-full sm:w-auto"
            : "site-button-success px-3 py-2 text-xs sm:px-4"
        }`}
      >
        {publishing ? "Publishing..." : label}
      </button>
      {error ? <p className="mt-2 text-xs text-site-danger" role="alert">{error}</p> : null}
    </div>
  );
}
