"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { TURNSTILE_SCRIPT_SRC } from "@/lib/turnstile";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  resetNonce: number;
  onTokenChange: (token: string | null) => void;
}

export default function TurnstileWidget({
  siteKey,
  resetNonce,
  onTokenChange,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (window.turnstile) {
      setScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (
      !scriptReady ||
      !siteKey ||
      !containerRef.current ||
      !window.turnstile ||
      widgetIdRef.current
    ) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: (token) => onTokenChange(token),
      "expired-callback": () => onTokenChange(null),
      "error-callback": () => onTokenChange(null),
    });
  }, [onTokenChange, scriptReady, siteKey]);

  useEffect(() => {
    if (!resetNonce || !window.turnstile || !widgetIdRef.current) {
      return;
    }

    onTokenChange(null);
    window.turnstile.reset(widgetIdRef.current);
  }, [onTokenChange, resetNonce]);

  useEffect(() => {
    return () => {
      if (!window.turnstile || !widgetIdRef.current) {
        return;
      }

      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div
        ref={containerRef}
        className="min-h-[66px] overflow-hidden border border-site-border bg-site-canvas-alt px-3 py-3"
      />
    </>
  );
}
