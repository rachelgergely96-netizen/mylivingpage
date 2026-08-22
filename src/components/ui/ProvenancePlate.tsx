import React, { type ReactNode } from "react";

export interface ProvenancePlateItem {
  label: string;
  value: ReactNode;
}

interface ProvenancePlateProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  items?: readonly ProvenancePlateItem[];
  children?: ReactNode;
  className?: string;
  labelledById?: string;
  headingLevel?: "h2" | "h3";
}

/**
 * A quiet, server-renderable evidence surface. It deliberately has no authored
 * animation: callers may signal a meaningful state change around it, while the
 * source and review text itself stays stable in every motion mode.
 */
export default function ProvenancePlate({
  title,
  eyebrow = "Provenance",
  description,
  items = [],
  children,
  className = "",
  labelledById,
  headingLevel = "h2",
}: ProvenancePlateProps) {
  const Heading = headingLevel;
  return (
    <aside
      aria-labelledby={labelledById}
      aria-label={labelledById ? undefined : title}
      className={`border border-site-border-strong bg-site-canvas-alt p-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] sm:p-5 ${className}`.trim()}
      data-provenance-plate
      data-site-ui
    >
      <div className="border-l-2 border-site-action pl-3">
        <p className="site-eyebrow">{eyebrow}</p>
        <Heading
          id={labelledById}
          className="mt-2 font-site text-base font-semibold leading-6 text-site-text"
        >
          {title}
        </Heading>
        {description ? (
          <div className="mt-2 text-sm leading-6 text-site-secondary">
            {description}
          </div>
        ) : null}
      </div>

      {items.length > 0 ? (
        <dl className="mt-4 grid gap-px bg-site-border sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="min-w-0 bg-site-surface px-3 py-3">
              <dt className="site-eyebrow text-site-muted">
                {item.label}
              </dt>
              <dd className="mt-1 break-words text-sm leading-6 text-site-secondary">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}
    </aside>
  );
}
