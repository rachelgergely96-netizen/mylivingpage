/* eslint-disable @next/next/no-img-element */

import { forwardRef } from "react";
import { getFirstName, type ShareCardVisual } from "@/lib/share-card";

interface ShareCardArtworkProps {
  avatarUrl?: string | null;
  className?: string;
  displayUrl: string;
  eyebrow: string;
  headline: string;
  location?: string;
  name: string;
  qrAlt: string;
  qrDataUrl: string | null;
  slug: string;
  tags: readonly string[];
  visual: ShareCardVisual;
}

export const ShareCardArtwork = forwardRef<HTMLDivElement, ShareCardArtworkProps>(
  function ShareCardArtwork(
    {
      avatarUrl,
      className = "",
      displayUrl,
      eyebrow,
      headline,
      location,
      name,
      qrAlt,
      qrDataUrl,
      slug,
      tags,
      visual,
    },
    ref,
  ) {
    const firstName = getFirstName(name);
    const initial = name.slice(0, 1).toUpperCase() || "?";

    return (
      <div
        ref={ref}
        aria-label={`${name} share card`}
        className={`relative overflow-hidden rounded-md border border-white/15 p-4 sm:p-6 ${className}`.trim()}
        style={{
          background: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 6px 6px 0 rgba(2,6,23,0.42), 0 18px 60px ${visual.glow}`,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full"
          style={{ background: `radial-gradient(circle, ${visual.glow} 0%, transparent 70%)` }}
        />

        <div className="relative grid gap-5 sm:grid-cols-[7rem_minmax(0,1fr)_8rem] sm:items-start">
          <div className="w-28 sm:w-auto">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                crossOrigin="anonymous"
                className="profile-avatar-frame aspect-square w-full object-cover"
                style={{ borderColor: visual.accent }}
              />
            ) : (
              <div
                aria-hidden="true"
                className="profile-avatar-frame flex aspect-square items-end p-3"
                style={{ background: `linear-gradient(145deg, ${visual.accent}, ${visual.gradientTo})` }}
              >
                <span className="font-heading text-4xl font-bold text-white drop-shadow-lg">
                  {initial}
                </span>
              </div>
            )}
            <p className="mt-2 break-all font-mono text-[10px] text-[#DBEAFE]">@{slug}</p>
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.68)]">
              {eyebrow}
            </p>
            <p className="mt-2 font-heading text-3xl font-bold leading-none text-[#F0F4FF] sm:text-4xl">
              {name}
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.82)]">{headline}</p>
            {location ? (
              <p className="mt-1 text-xs text-[rgba(240,244,255,0.62)]">{location}</p>
            ) : null}
            {tags.length ? (
              <div className="mt-4 grid max-w-md grid-cols-2 border-l border-t border-white/15 text-[11px] sm:grid-cols-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="border-b border-r border-white/15 bg-black/15 px-2 py-2 text-[rgba(240,244,255,0.78)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="justify-self-start sm:justify-self-end">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={qrAlt}
                className="h-28 w-28 border-4 border-white bg-white p-1 shadow-[4px_4px_0_rgba(2,6,23,0.35)]"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-28 w-28 border-4 border-white/70 bg-white/10"
              />
            )}
            <p className="mt-2 max-w-28 text-center font-mono text-[9px] uppercase leading-4 text-[rgba(240,244,255,0.64)]">
              Scan to visit {firstName}&rsquo;s page
            </p>
          </div>
        </div>

        <p className="relative mt-5 break-all border-t border-white/15 pt-3 font-mono text-[11px] text-[rgba(240,244,255,0.72)]">
          {displayUrl}
        </p>
      </div>
    );
  },
);
