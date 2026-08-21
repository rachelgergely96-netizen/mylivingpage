export const EDITOR_SIGNAL_DWELL_MS = 720;

export const EDITOR_SIGNAL_SECTIONS = [
  "profile",
  "summary",
  "stats",
  "experience",
  "education",
  "skills",
  "projects",
  "proof",
  "testimonials",
  "certifications",
] as const;

export type EditorSignalSection = (typeof EDITOR_SIGNAL_SECTIONS)[number];

const EDITOR_SIGNAL_LABELS: Record<EditorSignalSection, string> = {
  profile: "Profile",
  summary: "Summary",
  stats: "Highlights",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  proof: "Proof",
  testimonials: "Testimonials",
  certifications: "Certifications",
};

export function getEditorSignalSection(
  value: string | null | undefined,
): EditorSignalSection | null {
  return EDITOR_SIGNAL_SECTIONS.includes(value as EditorSignalSection)
    ? (value as EditorSignalSection)
    : null;
}

export function getEditorSignalLabel(section: EditorSignalSection): string {
  return EDITOR_SIGNAL_LABELS[section];
}

export function getEditorSignalTargetSelector(
  section: EditorSignalSection,
): string {
  return section === "profile"
    ? "[data-resume-header]"
    : `[data-motion-section="${section}"]`;
}

export type EditorSignalState =
  | "idle"
  | "source-changed"
  | "preview-matched"
  | "preview-empty"
  | "settled";

export interface EditorSignalSnapshot {
  section: EditorSignalSection | null;
  sequence: number;
  state: EditorSignalState;
}

export const INITIAL_EDITOR_SIGNAL: EditorSignalSnapshot = {
  section: null,
  sequence: 0,
  state: "idle",
};

export type EditorSaveMotionState = "saved" | "pending" | "saving" | "confirmed";

export function getEditorSaveMotionState({
  confirmed,
  hasChanges,
  saving,
}: {
  confirmed: boolean;
  hasChanges: boolean;
  saving: boolean;
}): EditorSaveMotionState {
  if (confirmed) return "confirmed";
  if (saving) return "saving";
  if (hasChanges) return "pending";
  return "saved";
}
