/* eslint-disable @next/next/no-img-element */
import React from "react";
import type { CSSProperties } from "react";
import { ShareCardEmblem } from "@/components/ShareCardEmblem";
import { ShareCardQr } from "@/components/ShareCardQr";
import { ShareCardSkeletonArtwork } from "@/components/ShareCardSkeletonArtwork";
import {
  SHARE_CARD_SIZE,
  type ShareCardModel,
  type ShareCardVisual,
} from "@/lib/share-card";
import {
  getShareCardFinish,
  type ShareCardFinishId,
} from "@/lib/share-card-finish";

export interface ShareCardArtworkProps {
  /**
   * Adds a live moving glint to metal/holographic finishes. Live-preview
   * surfaces set this; the OG and html-to-image export paths must NOT, so both
   * PNGs stay static (there is simply no animated element in the export tree).
   */
  animatedShine?: boolean;
  bodyFontFamily?: string;
  className?: string;
  ctaBody?: string;
  ctaHeadline?: string;
  finish?: ShareCardFinishId;
  model: ShareCardModel;
  style?: CSSProperties;
  visual: ShareCardVisual;
}

export function ShareCardArtwork({
  animatedShine = false,
  // The DOM path inherits the app's loaded face through the variable; the
  // Satori/OG path cannot resolve var() and passes the family name instead.
  bodyFontFamily = "var(--font-dm-sans), sans-serif",
  className,
  ctaBody = "Scan to explore work, experience, and more.",
  ctaHeadline,
  finish = "classic",
  model,
  style,
  visual,
}: ShareCardArtworkProps) {
  const treatment = getShareCardFinish(finish, visual);
  const serial = treatment.signatureSerial
    ? `${treatment.signatureSerial} · ${model.slug.toUpperCase()} · LIVING PAGE`
    : null;

  return (
    <div
      aria-label={`${model.name} share card in the ${visual.themeName} theme`}
      className={className}
      data-share-card-artwork
      data-share-card-collection={visual.collection}
      data-share-card-finish={treatment.id}
      data-share-card-outer
      data-share-card-theme-id={visual.themeId}
      style={{
        background: treatment.outerBackground,
        boxSizing: "border-box",
        color: treatment.text,
        display: "flex",
        fontFamily: bodyFontFamily,
        height: SHARE_CARD_SIZE.height,
        overflow:
          animatedShine && treatment.id === "holographic"
            ? "visible"
            : "hidden",
        padding: 40,
        position: "relative",
        width: SHARE_CARD_SIZE.width,
        ...style,
      }}
    >
      {treatment.backdropSheets.map((sheet, index) => (
        <div key={`backdrop-${index}`} style={sheet} />
      ))}
      {treatment.showGlowOrbs ? (
        <>
          <div
            style={{
              background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 72%)`,
              borderRadius: "50%",
              height: 520,
              position: "absolute",
              right: -150,
              top: -210,
              width: 520,
            }}
          />
          <div
            style={{
              background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 76%)`,
              borderRadius: "50%",
              bottom: -250,
              height: 540,
              left: -170,
              opacity: 0.46,
              position: "absolute",
              width: 540,
            }}
          />
        </>
      ) : null}

      <div
        data-share-card-panel
        data-share-card-glass-shell={
          treatment.id === "holographic" ? "acrylic" : undefined
        }
        style={{
          background: treatment.panelBackground,
          border: treatment.panelBorder,
          borderRadius: treatment.panelRadius,
          boxShadow: treatment.panelBoxShadow,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          padding: "30px 34px 28px",
          position: "relative",
          width: "100%",
        }}
      >
        <ShareCardSkeletonArtwork
          accent={visual.accent}
          accentBright={visual.accentBright}
          border={visual.border}
          glow={visual.glow}
          style={{ opacity: treatment.skeletonOpacity }}
          surface={visual.surface}
        />

        {/* Finish material sheets sit above the canonical skeleton, below content. */}
        {treatment.sheets.map((sheet, index) => (
          <div key={index} style={sheet} />
        ))}
        {treatment.specular ? <div style={treatment.specular} /> : null}

        {animatedShine && treatment.shine ? (
          <div
            aria-hidden="true"
            data-share-card-light-stage
            style={{
              bottom: 0,
              left: 0,
              overflow: "hidden",
              pointerEvents: "none",
              position: "absolute",
              right: 0,
              top: 0,
            }}
          >
            {treatment.id === "holographic" ? (
              <div
                className="share-card-glass-ambient"
                style={{
                  background: `radial-gradient(circle at 54% 38%, rgba(255,255,255,0.1) 0%, ${visual.glow} 18%, rgba(0,0,0,0) 54%)`,
                  height: "124%",
                  left: "-12%",
                  position: "absolute",
                  top: "-12%",
                  width: "124%",
                }}
              />
            ) : null}
            {treatment.id === "holographic" ? (
              <div
                className="share-card-holo-rainbow"
                style={{
                  background:
                    "linear-gradient(112deg, rgba(96,225,255,0.08) 6%, rgba(120,170,255,0.1) 20%, rgba(170,130,255,0.11) 33%, rgba(255,110,224,0.12) 46%, rgba(255,140,160,0.1) 58%, rgba(255,196,120,0.085) 69%, rgba(150,235,150,0.08) 80%, rgba(96,225,255,0.09) 92%)",
                  height: "130%",
                  left: "-15%",
                  position: "absolute",
                  top: "-15%",
                  width: "130%",
                }}
              />
            ) : null}
            {treatment.id === "holographic" ? (
              <div
                className="share-card-holo-ribbon"
                data-share-card-optical-ribbon
                style={{
                  background: `radial-gradient(ellipse 78% 60% at 48% 52%, rgba(0,0,0,0) 30%, rgba(104,232,255,0.13) 40%, rgba(255,255,255,0.22) 48%, ${visual.glow} 54%, rgba(255,104,220,0.15) 61%, rgba(255,198,120,0.09) 66%, rgba(0,0,0,0) 75%)`,
                  height: "96%",
                  pointerEvents: "none",
                  position: "absolute",
                  right: "-12%",
                  top: "2%",
                  width: "68%",
                }}
              />
            ) : null}
            {treatment.id === "holographic" && treatment.shine ? (
              <div
                className="share-card-holo-fringe"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0) 20%, rgba(96,225,255,0.14) 50%, rgba(0,0,0,0) 80%)",
                  height: "180%",
                  left: "42%",
                  position: "absolute",
                  top: "-40%",
                  transform: `translate3d(calc(var(--share-card-specular-x, 24px) - 8px), 0, 0) rotate(${treatment.shine.rotateDeg}deg)`,
                  transformOrigin: "center",
                  width: treatment.shine.width,
                }}
              />
            ) : null}
            {treatment.id === "holographic" && treatment.shine ? (
              <div
                className="share-card-holo-fringe"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0) 20%, rgba(255,110,224,0.13) 50%, rgba(0,0,0,0) 80%)",
                  height: "180%",
                  left: "42%",
                  position: "absolute",
                  top: "-40%",
                  transform: `translate3d(calc(var(--share-card-specular-x, 24px) + 8px), 0, 0) rotate(${treatment.shine.rotateDeg}deg)`,
                  transformOrigin: "center",
                  width: treatment.shine.width,
                }}
              />
            ) : null}
            <div
              className={
                treatment.id === "metal"
                  ? "share-card-metal-shine"
                  : "share-card-glass-specular"
              }
              style={{
                background: treatment.shine.background,
                height: "180%",
                left: "42%",
                position: "absolute",
                top: "-40%",
                transform: `translate3d(var(--share-card-specular-x, 24px), 0, 0) rotate(${treatment.shine.rotateDeg}deg)`,
                transformOrigin: "center",
                width: treatment.shine.width,
              }}
            />
            {treatment.shine.secondaryBackground ? (
              <div
                className="share-card-glass-caustic"
                style={{
                  background: treatment.shine.secondaryBackground,
                  height: "190%",
                  left: "61%",
                  position: "absolute",
                  top: "-45%",
                  transform: `translate3d(var(--share-card-caustic-x, -18px), 0, 0) rotate(${treatment.shine.rotateDeg - 3}deg)`,
                  transformOrigin: "center",
                  width: treatment.shine.secondaryWidth ?? "16%",
                }}
              />
            ) : null}
            {treatment.id === "holographic" ? (
              <div
                className="share-card-glass-rim-light"
                style={{
                  border: "1px solid rgba(224,242,255,0.26)",
                  borderRadius: treatment.panelRadius - 3,
                  bottom: 3,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.14), inset -1px 0 0 rgba(255,110,220,0.1)",
                  left: 3,
                  position: "absolute",
                  right: 3,
                  top: 3,
                }}
              />
            ) : null}
          </div>
        ) : null}

        {treatment.bodyScrim ? (
          <div style={treatment.bodyScrim} />
        ) : treatment.id === "classic" ? (
          <div
            style={{
              background: visual.lightGround
                ? "linear-gradient(90deg, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.2) 54%, rgba(255,255,255,0) 82%)"
                : "linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.14) 54%, rgba(0,0,0,0) 82%)",
              bottom: 0,
              left: 0,
              position: "absolute",
              right: 0,
              top: 0,
            }}
          />
        ) : null}

        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: 28,
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 790,
              minWidth: 0,
            }}
          >
            <div
              style={{
                alignItems: "center",
                color: treatment.textMuted,
                display: "flex",
                fontSize: 13,
                fontWeight: 700,
                gap: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  background: treatment.accent,
                  display: "flex",
                  height: 2,
                  width: 28,
                }}
              />
              MyLivingPage / Living Resume
            </div>

            <div
              style={{
                color: treatment.text,
                display: "flex",
                fontFamily: bodyFontFamily,
                fontSize: model.nameFontSize,
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 0.98,
                marginTop: 13,
                maxHeight: 124,
                maxWidth: 760,
                overflow: "hidden",
                textShadow: treatment.nameTextShadow,
              }}
            >
              {model.name}
            </div>

            <div
              style={{
                color: treatment.textMuted,
                display: "flex",
                fontSize: 23,
                lineHeight: 1.25,
                marginTop: 12,
                maxWidth: 740,
              }}
            >
              {model.headline}
            </div>

            <div
              style={{
                alignItems: "center",
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 14,
              }}
            >
              <div
                style={{
                  background: treatment.chromeSurface,
                  border: `1px solid ${treatment.chromeBorder}`,
                  color: treatment.accentBright,
                  display: "flex",
                  fontSize: 16,
                  padding: "7px 13px",
                }}
              >
                @{model.slug}
              </div>
              {model.location ? (
                <div
                  style={{
                    color: treatment.textMuted,
                    display: "flex",
                    fontSize: 16,
                  }}
                >
                  {model.location}
                </div>
              ) : null}
            </div>
          </div>

          <div
            data-share-card-photo-well
            style={{
              alignItems: "center",
              background: treatment.chromeSurface,
              border: `1px solid ${treatment.avatarBorder}`,
              boxShadow:
                treatment.id === "holographic"
                  ? `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.22), 0 8px 24px ${visual.glow}`
                  : "inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 12px rgba(0,0,0,0.5)",
              boxSizing: "border-box",
              display: "flex",
              flex: "none",
              height: 126,
              justifyContent: "center",
              overflow: "hidden",
              padding: 6,
              width: 126,
            }}
          >
            {model.avatarUrl ? (
              <img
                alt=""
                crossOrigin="anonymous"
                height={112}
                src={model.avatarUrl}
                width={112}
                style={{
                  height: 112,
                  objectFit: "cover",
                  width: 112,
                }}
              />
            ) : (
              <div
                style={{
                  alignItems: "center",
                  background: treatment.monogramBackground,
                  color: treatment.monogramColor,
                  display: "flex",
                  fontFamily: bodyFontFamily,
                  fontSize: 45,
                  fontWeight: 700,
                  height: 112,
                  justifyContent: "center",
                  width: 112,
                }}
              >
                {model.initial}
              </div>
            )}
          </div>
        </div>

        {model.tags.length ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 9,
              marginTop: 18,
              maxHeight: 70,
              maxWidth: 790,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {model.tags.map((tag) => (
              <div
                key={tag}
                style={{
                  background: treatment.chromeSurface,
                  border: `1px solid ${treatment.chromeBorder}`,
                  color: treatment.textMuted,
                  display: "flex",
                  fontSize: 14,
                  lineHeight: 1.25,
                  maxWidth: 360,
                  padding: "8px 12px",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            alignItems: "center",
            background: treatment.footerBackground,
            border: `1px solid ${treatment.chromeBorder}`,
            ...(treatment.id === "holographic"
              ? {
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.25), 0 10px 28px rgba(0,0,0,0.16)",
                }
              : {}),
            display: "flex",
            gap: 22,
            justifyContent: "space-between",
            minHeight: 142,
            padding: "17px 19px 17px 22px",
            position: "relative",
          }}
        >
          {treatment.emblem ? (
            <ShareCardEmblem treatment={treatment} initial={model.initial} />
          ) : null}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              // Only grow the text column when an emblem shares the row; omit
              // the key entirely otherwise so classic markup (and Satori) is
              // byte-identical to the original.
              ...(treatment.emblem ? { flex: 1 } : {}),
              maxWidth: 650,
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: treatment.text,
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {ctaHeadline ??
                (model.firstName
                  ? `See ${model.firstName}'s full living page`
                  : "See the full living page")}
            </div>
            <div
              style={{
                color: treatment.textMuted,
                display: "flex",
                fontSize: 15,
                lineHeight: 1.45,
                marginTop: 8,
              }}
            >
              {ctaBody}
            </div>
            <div
              style={{
                color: treatment.accentBright,
                display: "flex",
                fontSize: 15,
                marginTop: 10,
              }}
            >
              {model.displayUrl}
            </div>
          </div>

          <ShareCardQr
            borderColor={treatment.chromeBorder}
            matrix={model.qrMatrix}
            size={132}
            title={`QR code for ${model.displayUrl}`}
          />
        </div>

        {serial ? (
          <div
            style={{
              alignItems: "center",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              color: treatment.serialColor,
              display: "flex",
              fontSize: 10,
              letterSpacing: "0.22em",
              marginTop: 10,
              paddingTop: 8,
              textTransform: "uppercase",
            }}
          >
            {serial}
          </div>
        ) : null}
      </div>
    </div>
  );
}
