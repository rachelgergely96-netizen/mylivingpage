import { useEffect, useRef, useState } from "react";
import { AI_OUTPUT, AI_PROMPT } from "./demo-data";
import { useTypewriter } from "./useTypewriter";

interface AiGeneratorPreviewProps {
  isPro: boolean;
}

export default function AiGeneratorPreview({ isPro }: AiGeneratorPreviewProps) {
  const [typing, setTyping] = useState(false);
  const displayed = useTypewriter(AI_OUTPUT, 18, isPro && typing);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isPro) {
      timerRef.current = setTimeout(() => setTyping(true), 600);
    } else {
      clearTimeout(timerRef.current);
      setTyping(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [isPro]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(26,10,46,0.85)] p-4">
      {/* Lock overlay */}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-[rgba(11,8,20,0.72)] backdrop-blur-[4px] transition-opacity duration-500 ${isPro ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <span className="text-lg">&#x1F512;</span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#D4A654]">Pro &mdash; AI Content</span>
      </div>

      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#D4A654]">&#x2728; AI Content Generator</p>
      <p className="mb-3 text-[13px] text-[rgba(245,240,235,0.5)]">{AI_PROMPT}</p>

      {/* Output */}
      <div className="min-h-[60px] rounded-lg bg-[rgba(255,255,255,0.03)] p-3 text-xs leading-relaxed text-[rgba(245,240,235,0.65)]" style={{ whiteSpace: "pre-wrap" }}>
        {displayed}
        {isPro && typing && displayed.length < AI_OUTPUT.length && (
          <span
            className="ml-0.5 inline-block h-3.5 w-[2px] align-text-bottom bg-[#D4A654]"
            style={{ animation: "blink 0.8s ease infinite" }}
          />
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded-md border border-[rgba(212,166,84,0.4)] bg-[rgba(212,166,84,0.1)] px-3 py-1.5 font-mono text-[10px] text-[#D4A654]">
          Copy to LinkedIn
        </button>
        <button
          type="button"
          onClick={() => {
            if (isPro) {
              setTyping(false);
              setTimeout(() => setTyping(true), 100);
            }
          }}
          className="rounded-md border border-[rgba(255,255,255,0.08)] px-3 py-1.5 font-mono text-[10px] text-[rgba(245,240,235,0.3)]"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}
