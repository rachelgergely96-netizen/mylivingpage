"use client";

import {
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
  maxVariants?: number;
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
  maxVariants = 3,
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
    if (variants.length >= maxVariants) {
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
          <p className="site-eyebrow">
            Role-targeted versions
          </p>
          <h3 className="site-panel-title mt-2">
            Keep one base page and save targeted versions for real decision moments
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-site-secondary">
            Each version can sharpen the headline, opening summary, proof points, featured work, and CTA emphasis without replacing your base page.
          </p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          disabled={variants.length >= maxVariants}
          className="site-button site-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {variants.length >= maxVariants ? `${maxVariants} version${maxVariants === 1 ? "" : "s"} saved` : "Add targeted version"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectVariant(null)}
          className={`site-button ${
            selectedVariantId === null
              ? "border-site-action bg-site-selected text-site-text"
              : "site-button-secondary"
          }`}
          aria-pressed={selectedVariantId === null}
        >
          Base page
        </button>
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => onSelectVariant(variant.id)}
            className={`site-button ${
              selectedVariantId === variant.id
                ? "border-site-action bg-site-selected text-site-text"
                : "site-button-secondary"
            }`}
            aria-pressed={selectedVariantId === variant.id}
          >
            {variant.label}
          </button>
        ))}
      </div>

      {variants.length === 0 ? (
        <div className="site-panel p-5">
          <p className="site-panel-title">No targeted versions yet</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-site-secondary">
            Start with one version for a recruiter reply, a post-application follow-up, or a referral intro. Each one gets its own share link so you can see what lands.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {variants.map((variant) => (
          <article
            key={variant.id}
            className={`site-panel p-5 sm:p-6 ${
              selectedVariantId === variant.id
                ? "border-site-action bg-site-selected"
                : ""
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="site-eyebrow">
                  Targeted version
                </p>
                <p className="mt-2 text-sm text-site-secondary">
                  This version keeps the same page live, but changes what the other person sees first.
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeVariant(variant.id)}
                className="site-button site-button-danger self-start"
              >
                Remove
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-site-secondary">
                  Version name
                </span>
                <input
                  value={variant.label}
                  onChange={(event) =>
                    updateVariant(variant.id, { label: event.target.value })
                  }
                  className="site-field px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-site-secondary">
                  Target role
                </span>
                <input
                  value={variant.roleTitle}
                  onChange={(event) =>
                    updateVariant(variant.id, { roleTitle: event.target.value })
                  }
                  className="site-field px-4 py-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-site-secondary">
                  Headline override
                </span>
                <input
                  value={variant.headline ?? ""}
                  onChange={(event) =>
                    updateVariant(variant.id, { headline: event.target.value || null })
                  }
                  className="site-field px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-site-secondary">
                  CTA emphasis
                </span>
                <input
                  value={variant.ctaEmphasis ?? ""}
                  onChange={(event) =>
                    updateVariant(variant.id, { ctaEmphasis: event.target.value || null })
                  }
                  placeholder="Example: Open to staff product roles"
                  className="site-field px-4 py-3 text-sm"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-semibold text-site-secondary">
                Opening summary
              </span>
              <textarea
                value={variant.summary ?? ""}
                onChange={(event) =>
                  updateVariant(variant.id, { summary: event.target.value || null })
                }
                rows={4}
                className="site-field min-h-32 px-4 py-3 text-sm leading-7"
              />
            </label>

            {baseData.stats.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-semibold text-site-secondary">
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
                        className={`site-button ${
                          active
                            ? "border-site-action bg-site-selected text-site-text"
                            : "site-button-secondary"
                        }`}
                        aria-pressed={active}
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
                <p className="text-sm font-semibold text-site-secondary">
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
                        className={`site-button ${
                          active
                            ? "border-site-action bg-site-selected text-site-text"
                            : "site-button-secondary"
                        }`}
                        aria-pressed={active}
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
