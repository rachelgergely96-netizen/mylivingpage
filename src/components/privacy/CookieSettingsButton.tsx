"use client";

import { OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/privacy/analytics-consent";

export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="transition-colors hover:text-site-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-focus"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
    >
      Cookie settings
    </button>
  );
}
