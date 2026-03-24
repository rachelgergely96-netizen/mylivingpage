"use client";

import {
  MAX_PAGE_VARIANTS,
  createPageVariant,
  slugifyVariantLabel,
} from "@/lib/page-variants";
import type { PageVariant, ResumeData } from "@/types/resume";

interface VariantPlannerProps {
  baseData: ResumeData;
  variants: PageVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string | null) => void;
  onChange: (variants: PageVariant[]) => void;
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export default function VariantPlanner({
  baseData,
  variants,
  selectedVariantId,
  onSelectVariant,
  onChange,
}: VariantPlannerProps) {
  const updateVariant = (
    variantId: string,
    updates: Partial<PageVariant>,
  ) => {
    onChange(
      variants.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }

        const label = updates.label ?? variant.label;
        return {
          ...variant,
          ...updates,
          slug: slugifyVariantLabel(label),
        };
      }),
    );
  };

  const removeVariant = (variantId: string) => {
    onChange(variants.filter((variant) => variant.id !== variantId));
    if (selectedVariantId === variantId) {
      onSelectVariant(null);
    }
  };

  const addVariant = () => {
    if (variants.length >= MAX_PAGE_VARIANTS) {
      return;
    }

    const nextVariant = createPageVariant(
      baseData,
      variants.length === 0 ? "Recruiter reply version" : `Targeted version ${variants.length + 1}`,
    );
    onChange([...variants, nextVariant]);
    onSelectVariant(nextVariant.id);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#3B82F6]">
            Role-targeted versions
          </p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
            Keep one base page and save targeted versions for real decision moments
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.58)]">
            Each version can sharpen the headline, opening summary, proof points, featured work, and CTA emphasis without replacing your base page.
          </p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          disabled={variants.length >= MAX_PAGE_VARIANTS}
          className="rounded-full border border-[rgba(59,130,246,0.3)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {variants.length >= MAX_PAGE_VARIANTS ? "3 versions saved" : "Add targeted version"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectVariant(null)}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
            selectedVariantId === null
              ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
              : "border-[rgba(255,255,255,0.14)] text-[rgba(240,244,255,0.68)] hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
          }`}
        >
          Base page
        </button>
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => onSelectVariant(variant.id)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
              selectedVariantId === variant.id
                ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                : "border-[rgba(255,255,255,0.14)] text-[rgba(240,244,255,0.68)] hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
            }`}
          >
            {variant.label}
          </button>
        ))}
      </div>

      {variants.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="font-heading text-xl text-[#F0F4FF]">No targeted versions yet</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.58)]">
            Start with one version for a recruiter reply, a post-application follow-up, or a referral intro. Each one gets its own share link so you can see what lands.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {variants.map((variant) => (
          <article
            key={variant.id}
            className={`rounded-2xl border p-5 sm:p-6 ${
              selectedVariantId === variant.id
                ? "border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)]"
                : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">
                  Targeted version
                </p>
                <p className="mt-2 text-sm text-[rgba(240,244,255,0.64)]">
                  This version keeps the same page live, but changes what the other person sees first.
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeVariant(variant.id)}
                className="self-start rounded-full border border-[rgba(255,120,120,0.22)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(255,120,120,0.72)] transition-colors hover:border-[rgba(255,120,120,0.38)] hover:text-[#ff8e8e]"
              >
                Remove
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                  Version name
                </span>
                <input
                  value={variant.label}
                  onChange={(event) =>
                    updateVariant(variant.id, { label: event.target.value })
                  }
                  className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(8,16,28,0.72)] px-4 py-3 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                  Target role
                </span>
                <input
                  value={variant.roleTitle}
                  onChange={(event) =>
                    updateVariant(variant.id, { roleTitle: event.target.value })
                  }
                  className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(8,16,28,0.72)] px-4 py-3 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                  Headline override
                </span>
                <input
                  value={variant.headline ?? ""}
                  onChange={(event) =>
                    updateVariant(variant.id, { headline: event.target.value || null })
                  }
                  className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(8,16,28,0.72)] px-4 py-3 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                  CTA emphasis
                </span>
                <input
                  value={variant.ctaEmphasis ?? ""}
                  onChange={(event) =>
                    updateVariant(variant.id, { ctaEmphasis: event.target.value || null })
                  }
                  placeholder="Example: Open to staff product roles"
                  className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(8,16,28,0.72)] px-4 py-3 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                Opening summary
              </span>
              <textarea
                value={variant.summary ?? ""}
                onChange={(event) =>
                  updateVariant(variant.id, { summary: event.target.value || null })
                }
                rows={4}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(8,16,28,0.72)] px-4 py-3 text-sm leading-7 text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
              />
            </label>

            {baseData.stats.length > 0 ? (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                  Featured proof points
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {baseData.stats.map((stat) => {
                    const active = variant.featuredStatLabels.includes(stat.label);
                    return (
                      <button
                        key={`${variant.id}-${stat.label}`}
                        type="button"
                        onClick={() =>
                          updateVariant(variant.id, {
                            featuredStatLabels: toggleSelection(
                              variant.featuredStatLabels,
                              stat.label,
                            ),
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          active
                            ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                            : "border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
                        }`}
                      >
                        {stat.value} {stat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {baseData.projects.length > 0 ? (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                  Featured work sample
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {baseData.projects.map((project) => {
                    const active = variant.featuredProjectNames.includes(project.name);
                    return (
                      <button
                        key={`${variant.id}-${project.name}`}
                        type="button"
                        onClick={() =>
                          updateVariant(variant.id, {
                            featuredProjectNames: toggleSelection(
                              variant.featuredProjectNames,
                              project.name,
                            ),
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          active
                            ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                            : "border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
                        }`}
                      >
                        {project.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
