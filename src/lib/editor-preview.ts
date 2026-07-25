/**
 * Sentinel page id the local editor-preview harness passes to PageEditorClient.
 * It is only ever supplied by the env-gated /dev/editor-preview route, so the
 * editor treats it as "load demo data, skip auth, don't persist."
 */
export const EDITOR_LAYOUT_PREVIEW_PAGE_ID = "editor-layout-preview";

interface EditorPreviewEnvironment {
  CI?: string;
  ENABLE_EDITOR_PREVIEW?: string;
  NODE_ENV?: string;
  VERCEL?: string;
}

/** Keeps credential-free visual harnesses local/CI-only and unavailable on Vercel. */
export function isEditorPreviewEnabled(
  environment: EditorPreviewEnvironment = {
    CI: process.env.CI,
    ENABLE_EDITOR_PREVIEW: process.env.ENABLE_EDITOR_PREVIEW,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  },
): boolean {
  const isCi = environment.CI === "1" || environment.CI === "true";
  const isSelfHostedProduction =
    environment.NODE_ENV === "production" && !isCi;

  return (
    environment.ENABLE_EDITOR_PREVIEW === "1" &&
    environment.VERCEL !== "1" &&
    !isSelfHostedProduction
  );
}
