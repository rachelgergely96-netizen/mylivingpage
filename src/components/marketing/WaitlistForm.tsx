"use client";

import { FormEvent, useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit waitlist request");
      }

      setStatus("success");
      setMessage(payload.message ?? "You are on the list.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
      <input
        className="h-12 w-full rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.04)] px-5 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="your@email.com"
        required
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="gold-pill h-12 shrink-0 px-7 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "Joining..." : "Join Waitlist"}
      </button>
      {message ? (
        <p className={`w-full text-xs ${status === "error" ? "text-[#ff8e8e]" : "text-[#3B82F6]"}`}>{message}</p>
      ) : null}
    </form>
  );
}
