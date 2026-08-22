export const MOTION_MODES = ["full", "calm", "still"] as const;

export type MotionMode = (typeof MOTION_MODES)[number];
export type MotionPreference = MotionMode | "system";

export const MOTION_STORAGE_KEY = "mylivingpage.motion-preference.v1";

export const MOTION_DURATIONS_MS = {
  instant: 0,
  micro: 120,
  standard: 220,
  context: 380,
} as const;

export type MotionDurationToken = keyof typeof MOTION_DURATIONS_MS;

export const MOTION_DISTANCES_PX = {
  micro: 4,
  standard: 12,
  marketing: 32,
} as const;

export type MotionDistanceToken = keyof typeof MOTION_DISTANCES_PX;
export type MotionSurface = "product" | "public" | "recruiter" | "marketing";

export const MOTION_EASINGS = {
  enter: "cubic-bezier(.16,1,.3,1)",
  standard: "cubic-bezier(.2,0,0,1)",
  exit: "cubic-bezier(.4,0,1,1)",
} as const;

export const MOTION_OPACITY = {
  muted: 0.72,
  confirm: 0.99,
} as const;

export const MOTION_EVENTS = {
  RESUME_IMPORT_FACT_DETECTED: "resume.import.fact.detected",
  RESUME_IMPORT_REVIEW_REQUIRED: "resume.import.review.required",
  RESUME_PDF_PREVIEW_READY: "resume.pdf.preview.ready",
  EDITOR_FIELD_CHANGED: "editor.field.changed",
  EDITOR_SAVE_CONFIRMED: "editor.save.confirmed",
  THEME_SELECTION_CHANGED: "theme.selection.changed",
  EXAMPLE_CONTEXT_CHANGED: "example.context.changed",
  PAGE_CHAPTER_ENTERED: "page.chapter.entered",
  PAGE_PUBLISH_CONFIRMED: "page.publish.confirmed",
  SHARE_ARTIFACT_READY: "share.artifact.ready",
  ANALYTICS_FIRST_VIEW_DETECTED: "analytics.first_view.detected",
  ANALYTICS_RANGE_UPDATED: "analytics.range.updated",
} as const;

export type MotionEventName = (typeof MOTION_EVENTS)[keyof typeof MOTION_EVENTS];

export const MOTION_SIGNALS = {
  TRUTH_TRANSFER: "truth-transfer",
  REVIEW_GATE: "review-gate",
  EDIT_TO_PROOF: "edit-to-proof",
  STYLE_DIALECT: "style-dialect",
  CAREER_CHAPTERS: "career-chapters",
  SHARE_HANDOFF: "share-handoff",
} as const;

export type MotionSignalName = (typeof MOTION_SIGNALS)[keyof typeof MOTION_SIGNALS];

/**
 * The product meaning behind every authored motion event. Keeping this map
 * pure makes event instrumentation and visual treatments share one vocabulary.
 */
export const MOTION_EVENT_SIGNALS = {
  [MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED]: MOTION_SIGNALS.TRUTH_TRANSFER,
  [MOTION_EVENTS.RESUME_IMPORT_REVIEW_REQUIRED]: MOTION_SIGNALS.REVIEW_GATE,
  [MOTION_EVENTS.RESUME_PDF_PREVIEW_READY]: MOTION_SIGNALS.EDIT_TO_PROOF,
  [MOTION_EVENTS.EDITOR_FIELD_CHANGED]: MOTION_SIGNALS.EDIT_TO_PROOF,
  [MOTION_EVENTS.EDITOR_SAVE_CONFIRMED]: MOTION_SIGNALS.EDIT_TO_PROOF,
  [MOTION_EVENTS.THEME_SELECTION_CHANGED]: MOTION_SIGNALS.STYLE_DIALECT,
  [MOTION_EVENTS.EXAMPLE_CONTEXT_CHANGED]: MOTION_SIGNALS.CAREER_CHAPTERS,
  [MOTION_EVENTS.PAGE_CHAPTER_ENTERED]: MOTION_SIGNALS.CAREER_CHAPTERS,
  [MOTION_EVENTS.PAGE_PUBLISH_CONFIRMED]: MOTION_SIGNALS.SHARE_HANDOFF,
  [MOTION_EVENTS.SHARE_ARTIFACT_READY]: MOTION_SIGNALS.SHARE_HANDOFF,
  [MOTION_EVENTS.ANALYTICS_FIRST_VIEW_DETECTED]: MOTION_SIGNALS.SHARE_HANDOFF,
  [MOTION_EVENTS.ANALYTICS_RANGE_UPDATED]: MOTION_SIGNALS.EDIT_TO_PROOF,
} as const satisfies Record<MotionEventName, MotionSignalName>;

export interface MotionModePolicy {
  allowsAmbientMotion: boolean;
  allowsContinuousMotion: boolean;
  allowsSmoothScroll: boolean;
  allowsViewTransitions: boolean;
  deterministicFrame: boolean;
  defaultDurationMs: number;
  maxDurationMs: number;
  maxDistancePx: number;
  rendererTimeScale: number;
  pointerScale: number;
  impulseScale: number;
}

export const MOTION_MODE_POLICIES = {
  full: {
    allowsAmbientMotion: true,
    allowsContinuousMotion: true,
    allowsSmoothScroll: true,
    allowsViewTransitions: true,
    deterministicFrame: false,
    defaultDurationMs: MOTION_DURATIONS_MS.standard,
    maxDurationMs: MOTION_DURATIONS_MS.context,
    maxDistancePx: MOTION_DISTANCES_PX.standard,
    rendererTimeScale: 1,
    pointerScale: 1,
    impulseScale: 1,
  },
  calm: {
    allowsAmbientMotion: false,
    allowsContinuousMotion: false,
    // Native smooth scrolling does not expose a duration cap, so it cannot
    // guarantee Calm's 180ms ceiling.
    allowsSmoothScroll: false,
    allowsViewTransitions: true,
    deterministicFrame: false,
    defaultDurationMs: MOTION_DURATIONS_MS.micro,
    maxDurationMs: 180,
    maxDistancePx: MOTION_DISTANCES_PX.micro,
    rendererTimeScale: 0,
    pointerScale: 0,
    impulseScale: 0,
  },
  still: {
    allowsAmbientMotion: false,
    allowsContinuousMotion: false,
    allowsSmoothScroll: false,
    allowsViewTransitions: false,
    deterministicFrame: true,
    defaultDurationMs: MOTION_DURATIONS_MS.instant,
    maxDurationMs: MOTION_DURATIONS_MS.instant,
    maxDistancePx: 0,
    rendererTimeScale: 0,
    pointerScale: 0,
    impulseScale: 0,
  },
} as const satisfies Record<MotionMode, MotionModePolicy>;

export function isMotionMode(value: unknown): value is MotionMode {
  return typeof value === "string" && MOTION_MODES.includes(value as MotionMode);
}

export function parseMotionPreference(value: unknown): MotionPreference {
  return isMotionMode(value) ? value : "system";
}

export function resolveMotionMode(
  preference: MotionPreference,
  systemReducedMotion: boolean,
): MotionMode {
  if (preference !== "system") return preference;
  return systemReducedMotion ? "still" : "full";
}

export function resolveMotionDuration(
  token: MotionDurationToken,
  mode: MotionMode,
): number {
  if (mode === "still") return MOTION_DURATIONS_MS.instant;
  const requested = MOTION_DURATIONS_MS[token];
  return Math.min(requested, MOTION_MODE_POLICIES[mode].maxDurationMs);
}

export function resolveMotionDistance(
  token: MotionDistanceToken,
  mode: MotionMode,
  surface: MotionSurface,
): number {
  if (mode === "still") return 0;

  // The 32px travel token is an authored marketing exception. Product,
  // public-page, and recruiter-facing UI can never request it.
  const requested =
    token === "marketing" && surface !== "marketing"
      ? MOTION_DISTANCES_PX.standard
      : MOTION_DISTANCES_PX[token];
  if (mode === "full" && token === "marketing" && surface === "marketing") {
    return requested;
  }
  return Math.min(requested, MOTION_MODE_POLICIES[mode].maxDistancePx);
}

/**
 * Runs before hydration so a saved Still choice cannot flash animated content.
 * Keep this script fixed and free of user-controlled interpolation.
 */
export const MOTION_PREFERENCE_BOOTSTRAP_SCRIPT = `(() => {
  const key = ${JSON.stringify(MOTION_STORAGE_KEY)};
  let preference = "system";
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "full" || stored === "calm" || stored === "still") preference = stored;
  } catch {}
  let systemReduced = false;
  try {
    systemReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {}
  const mode = preference === "system" ? (systemReduced ? "still" : "full") : preference;
  document.documentElement.dataset.motionMode = mode;
  document.documentElement.dataset.motionPreference = preference;
})();`;
