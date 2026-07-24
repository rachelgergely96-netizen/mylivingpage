/* eslint-disable @next/next/no-img-element */
import React from "react";
import type { CSSProperties } from "react";
import { ShareCardProfileMark } from "@/components/ShareCardProfileMark";
import { ShareCardQr } from "@/components/ShareCardQr";
import { ShareCardThemeArtwork } from "@/components/ShareCardThemeArtwork";
import {
  SHARE_CARD_SIZE,
  type ShareCardModel,
  type ShareCardVisual,
} from "@/lib/share-card";

export interface ShareCardArtworkProps {
  bodyFontFamily?: string;
  className?: string;
  ctaBody?: string;
  ctaHeadline?: string;
  headingFontFamily?: string;
  model: ShareCardModel;
  style?: CSSProperties;
  visual: ShareCardVisual;
}

export function ShareCardArtwork({
  bodyFontFamily = "var(--font-dm-sans), Arial, sans-serif",
  className,
  ctaBody = "Scan to explore work, experience, and more.",
  ctaHeadline,
  headingFontFamily,
  model,
  style,
  visual,
}: ShareCardArtworkProps) {
  const resolvedHeadingFont =
    headingFontFamily ??
    (visual.headingFont === "editorial"
      ? "var(--font-playfair), Georgia, serif"
      : bodyFontFamily);

  return (
    <div
      aria-label={`${model.name} share card in the ${visual.themeName} theme`}
      className={className}
      data-share-card-artwork
      data-share-card-collection={visual.collection}
      data-share-card-theme-id={visual.themeId}
      style={{
        background: visual.background,
        boxSizing: "border-box",
        color: visual.text,
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

      <div
        style={{
          background: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
          border: `1px solid ${visual.border}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 70px ${visual.glow}`,
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
        <ShareCardThemeArtwork
          accent={visual.accent}
          accentBright={visual.accentBright}
          background={visual.background}
          border={visual.border}
          glow={visual.glow}
          surface={visual.surface}
          themeId={visual.themeId}
        />
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
        <ShareCardProfileMark
          accent={visual.accent}
          motif={visual.motif}
          style={{
            height: 68,
            opacity: 0.64,
            right: 184,
            top: 34,
            width: 68,
          }}
        />

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
                color: visual.textMuted,
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
                  background: visual.accent,
                  display: "flex",
                  height: 2,
                  width: 28,
                }}
              />
              MyLivingPage / {visual.themeName}
            </div>

            <div
              style={{
                color: visual.text,
                display: "flex",
                fontFamily: resolvedHeadingFont,
                fontSize: model.nameFontSize,
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 0.98,
                marginTop: 13,
                maxHeight: 124,
                maxWidth: 760,
                overflow: "hidden",
                textShadow: visual.lightGround
                  ? "none"
                  : "0 2px 22px rgba(0,0,0,0.34)",
              }}
            >
              {model.name}
            </div>

            <div
              style={{
                color: visual.textMuted,
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
                  background: visual.surface,
                  border: `1px solid ${visual.border}`,
                  color: visual.accentBright,
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
                    color: visual.textMuted,
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
                border: `3px solid ${visual.accent}`,
                boxShadow: `0 0 36px ${visual.glow}`,
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
                background: `linear-gradient(135deg, ${visual.accent}, ${visual.accentBright})`,
                boxShadow: `0 0 36px ${visual.glow}`,
                color: visual.background,
                display: "flex",
                flex: "none",
                fontFamily: resolvedHeadingFont,
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
                  background: visual.surface,
                  border: `1px solid ${visual.border}`,
                  color: visual.textMuted,
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
            background: visual.surfaceStrong,
            border: `1px solid ${visual.border}`,
            display: "flex",
            gap: 22,
            justifyContent: "space-between",
            minHeight: 142,
            padding: "17px 19px 17px 22px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 650,
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: visual.text,
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {ctaHeadline ?? `See ${model.firstName}'s full living page`}
            </div>
            <div
              style={{
                color: visual.textMuted,
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
                color: visual.accentBright,
                display: "flex",
                fontSize: 15,
                marginTop: 10,
              }}
            >
              {model.displayUrl}
            </div>
          </div>

          <ShareCardQr
            borderColor={visual.border}
            matrix={model.qrMatrix}
            size={132}
            title={`QR code for ${model.displayUrl}`}
          />
        </div>
      </div>
    </div>
  );
}
