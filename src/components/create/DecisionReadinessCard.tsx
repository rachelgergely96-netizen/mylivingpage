"use client";

import type { DecisionReadinessState } from "@/types/resume";

interface DecisionReadinessCardProps {
  readiness: DecisionReadinessState;
}

export default function DecisionReadinessCard({
  readiness,
}: DecisionReadinessCardProps) {
  const ready = readiness.overallStatus === "ready";

  return (
    <section className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
            Decision readiness
          </p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
            {ready ? "Ready for a real follow-up" : "Tighten this before you send it"}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[rgba(232,242,255,0.82)]">
            {readiness.summary}
          </p>
        </div>
        <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(6,14,28,0.36)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
            Score
          </p>
          <p className="mt-2 font-mono text-2xl text-[#F0F4FF]">
            {readiness.readyCount}/{readiness.totalChecks}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {readiness.checks.map((check) => (
            <div
              key={check.id}
              className={`rounded-2xl border p-4 ${
                check.status === "ready"
                  ? "border-[rgba(91,214,124,0.24)] bg-[rgba(91,214,124,0.08)]"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                {check.status === "ready" ? "Ready" : "Needs attention"}
              </p>
              <p className="mt-2 font-semibold text-[#F0F4FF]">{check.title}</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                {check.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">
            Upgrade suggestions
          </p>
          {readiness.suggestions.length > 0 ? (
            <div className="mt-3 space-y-3">
              {readiness.suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(6,14,28,0.34)] p-3"
                >
                  <p className="font-medium text-[#F0F4FF]">{suggestion.title}</p>
                  <p className="mt-1.5 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                    {suggestion.detail}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
              The top of the page, proof, contact surface, and mobile skim all look ready.
            </p>
          )}

          <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
            <p className="text-sm text-[rgba(240,244,255,0.72)]">
              Headshots, names, and contact links should all be public-safe before you publish. Keep this page recruiter-safe and low-risk to send.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
