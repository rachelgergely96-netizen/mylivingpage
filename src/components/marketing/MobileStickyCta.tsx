"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface MobileStickyCtaProps {
  href: string;
  label: string;
  targetId: string;
}

export default function MobileStickyCta({ href, label, targetId }: MobileStickyCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const target = document.getElementById(targetId);
      if (!target) {
        setVisible(false);
        return;
      }

      const rect = target.getBoundingClientRect();
      setVisible(rect.bottom < window.innerHeight * 0.58);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [targetId]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 px-3 pb-3 transition-all duration-300 md:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-lg rounded-[1.4rem] border border-[rgba(59,130,246,0.24)] bg-[rgba(8,14,28,0.92)] p-3 shadow-[0_-10px_40px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">Ready to start</p>
            <p className="mt-1 text-sm text-[rgba(240,244,255,0.7)]">Keep your PDF. Build one link you can keep improving.</p>
          </div>
          <Link
            href={href}
            className="gold-pill shrink-0 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            {label}
          </Link>
        </div>
      </div>
    </div>
  );
}
