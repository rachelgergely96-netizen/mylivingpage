interface EditorPreviewEnvironment {
  ENABLE_EDITOR_PREVIEW?: string;
  VERCEL?: string;
}

/** Keeps the credential-free editor harness local/CI-only and unavailable on Vercel. */
export function isEditorPreviewEnabled(
  environment: EditorPreviewEnvironment = {
    ENABLE_EDITOR_PREVIEW: process.env.ENABLE_EDITOR_PREVIEW,
    VERCEL: process.env.VERCEL,
  },
): boolean {
  return environment.ENABLE_EDITOR_PREVIEW === "1" && environment.VERCEL !== "1";
}
