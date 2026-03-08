"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SamplePageCard from "@/components/marketing/SamplePageCard";
import type { MarketingSampleGroup, ResolvedMarketingSample } from "@/lib/marketing-samples";

interface LandingSampleShowcaseProps {
  groups: Array<MarketingSampleGroup & { samples: ResolvedMarketingSample[] }>;
}

export default function LandingSampleShowcase({ groups }: LandingSampleShowcaseProps) {
  const initialGroupId = groups[0]?.id ?? "";
  const [activeGroupId, setActiveGroupId] = useState(initialGroupId);
  const [sampleIndex, setSampleIndex] = useState(0);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? groups[0],
    [activeGroupId, groups],
  );

  useEffect(() => {
    setSampleIndex(0);
  }, [activeGroupId]);

  if (!activeGroup || activeGroup.samples.length === 0) {
    return null;
  }

  const visibleIndex = Math.min(sampleIndex, Math.max(activeGroup.samples.length - 1, 0));
  const activeSample = activeGroup.samples[visibleIndex];

  const showPrevious = () => {
    setSampleIndex((current) => (current - 1 + activeGroup.samples.length) % activeGroup.samples.length);
  };

  const showNext = () => {
    setSampleIndex((current) => (current + 1) % activeGroup.samples.length);
  };

  return (
    <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-5 sm:p-6 md:p-8">
      <div className="flex flex-wrap gap-2.5">
        {groups.map((group) => {
          const isActive = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroupId(group.id)}
              className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all ${
                isActive
                  ? "border-[rgba(59,130,246,0.4)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                  : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] text-[rgba(240,244,255,0.48)] hover:border-[rgba(59,130,246,0.24)] hover:text-[#BFDBFE]"
              }`}
              aria-pressed={isActive}
            >
              {group.title}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3B82F6]">{activeGroup.title}</p>
          <p className="mt-2 text-sm leading-7 text-[rgba(240,244,255,0.62)]">{activeGroup.description}</p>
        </div>
        <Link
          href="/examples"
          className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
        >
          Browse all sample pages
        </Link>
      </div>

      <div className="mt-6 sm:hidden">
        <div className="flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
          <button
            type="button"
            onClick={showPrevious}
            className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
          >
            Prev
          </button>
          <div className="px-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.34)]">
              {visibleIndex + 1} of {activeGroup.samples.length}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F0F4FF]">
              {activeSample.audienceLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={showNext}
            className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 hidden flex-wrap gap-2 sm:flex">
        {activeGroup.samples.map((sample, index) => {
          const isActive = sample.id === activeSample.id;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => setSampleIndex(index)}
              className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
                isActive
                  ? "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] text-[#F0F4FF]"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[rgba(240,244,255,0.48)] hover:border-[rgba(59,130,246,0.22)] hover:text-[#BFDBFE]"
              }`}
              aria-pressed={isActive}
            >
              {sample.audienceLabel}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <SamplePageCard
          sample={activeSample}
          signupHref={`/signup?ref=${activeSample.ctaRef}`}
          previewHref={`/examples#${activeSample.id}`}
        />
      </div>
    </div>
  );
}
