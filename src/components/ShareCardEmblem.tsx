import React from "react";
import type { CSSProperties } from "react";
import type { ShareCardFinishTreatment } from "@/lib/share-card-finish";

/**
 * The physical-card emblem: an EMV chip for the metal finish, a foil seal for
 * the holographic finish. Both are pure absolutely-positioned div stacks so
 * they render identically through Satori, html-to-image, and the DOM preview.
 */
export function ShareCardEmblem({
  treatment,
  initial,
}: {
  treatment: ShareCardFinishTreatment;
  initial: string;
}) {
  if (treatment.emblem === "chip") {
    return <ChipEmblem />;
  }
  if (treatment.emblem === "seal") {
    return <SealEmblem treatment={treatment} initial={initial} />;
  }
  return null;
}

const CONTACT_LINE = "rgba(60,40,10,0.4)";
const CONTACT_PAD = "rgba(90,70,20,0.28)";

function ChipEmblem() {
  const pad: CSSProperties = {
    background: CONTACT_PAD,
    height: 7,
    position: "absolute",
    width: 9,
  };
  return (
    <div
      aria-hidden="true"
      style={{
        background:
          "linear-gradient(160deg, #f0e6c8 0%, #c4a35a 38%, #8a7030 72%, #d4bc78 100%)",
        border: "1px solid rgba(255,230,180,0.35)",
        borderRadius: 5,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.4)",
        display: "flex",
        flex: "none",
        height: 40,
        position: "relative",
        width: 52,
      }}
    >
      {/* Contact grid: two horizontal rules, one vertical, four corner pads. */}
      <div style={{ background: CONTACT_LINE, height: 1, left: 4, position: "absolute", right: 4, top: 13 }} />
      <div style={{ background: CONTACT_LINE, height: 1, left: 4, position: "absolute", right: 4, top: 26 }} />
      <div style={{ background: CONTACT_LINE, bottom: 4, left: 25, position: "absolute", top: 4, width: 1 }} />
      <div style={{ ...pad, left: 5, top: 4 }} />
      <div style={{ ...pad, right: 5, top: 4 }} />
      <div style={{ ...pad, bottom: 4, left: 5 }} />
      <div style={{ ...pad, bottom: 4, right: 5 }} />
    </div>
  );
}

function SealEmblem({
  treatment,
  initial,
}: {
  treatment: ShareCardFinishTreatment;
  initial: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        alignItems: "center",
        background: `linear-gradient(135deg, ${treatment.accent} 0%, rgba(255,255,255,0.35) 40%, ${treatment.accentBright} 70%, rgba(180,100,255,0.5) 100%)`,
        border: `1.5px solid ${treatment.accentBright}`,
        borderRadius: "50%",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.4)",
        display: "flex",
        flex: "none",
        height: 48,
        justifyContent: "center",
        position: "relative",
        width: 48,
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "rgba(6,8,14,0.86)",
          borderRadius: "50%",
          color: treatment.accentBright,
          display: "flex",
          fontSize: 17,
          fontWeight: 700,
          height: 30,
          justifyContent: "center",
          width: 30,
        }}
      >
        {initial}
      </div>
      {/* Light-catch arc across the top. */}
      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)",
          borderRadius: "50%",
          height: 18,
          left: 6,
          position: "absolute",
          right: 6,
          top: 3,
        }}
      />
    </div>
  );
}
