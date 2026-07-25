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
      data-share-card-theme-id={visual.themeId}
      style={{
        background: treatment.outerBackground,
        boxSizing: "border-box",
        color: treatment.text,
        display: "flex",
        fontFamily: bodyFontFamily,
        height: SHARE_CARD_SIZE.height,
        overflow: "hidden",
        padding: 32,
        position: "relative",
        width: SHARE_CARD_SIZE.width,
        ...style,
      }}
    >
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

        {animatedShine && treatment.shine ? (
          <div
            data-share-card-light-stage
            style={{
              height: "190%",
              isolation: "isolate",
              left: "-18%",
              overflow: "visible",
              pointerEvents: "none",
              position: "absolute",
              top: "-45%",
              transform: `rotate(${treatment.shine.rotateDeg}deg)`,
              transformOrigin: "center",
              width: "136%",
            }}
          >
            <div
              className={
                treatment.id === "metal"
                  ? "share-card-metal-shine"
                  : "share-card-shine"
              }
              style={{
                background: treatment.shine.background,
                height: "100%",
                left: 0,
                opacity: 0,
                position: "absolute",
                top: 0,
                width: treatment.shine.width,
              }}
            />
            {treatment.shine.secondaryBackground ? (
              <div
                className="share-card-diffraction"
                style={{
                  background: treatment.shine.secondaryBackground,
                  height: "100%",
                  left: 0,
                  opacity: 0,
                  position: "absolute",
                  top: 0,
                  width: treatment.shine.secondaryWidth ?? "16%",
                }}
              />
            ) : null}
          </div>
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

          {model.avatarUrl ? (
            <img
              alt=""
              crossOrigin="anonymous"
              height={126}
              src={model.avatarUrl}
              width={126}
              style={{
                border: `3px solid ${treatment.avatarBorder}`,
                boxShadow: treatment.showGlowOrbs ? `0 0 36px ${visual.glow}` : "0 2px 12px rgba(0,0,0,0.5)",
                flex: "none",
                height: 126,
                objectFit: "cover",
                width: 126,
              }}
            />
          ) : (
            <div
              style={{
                alignItems: "center",
                background: treatment.monogramBackground,
                boxShadow: treatment.showGlowOrbs ? `0 0 36px ${visual.glow}` : "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 12px rgba(0,0,0,0.5)",
                color: treatment.monogramColor,
                display: "flex",
                flex: "none",
                fontFamily: bodyFontFamily,
                fontSize: 49,
                fontWeight: 700,
                height: 126,
                justifyContent: "center",
                width: 126,
              }}
            >
              {model.initial}
            </div>
          )}
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
              {ctaHeadline ?? `See ${model.firstName}'s full living page`}
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
