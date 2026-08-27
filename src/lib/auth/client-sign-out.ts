interface ClientSignOutOptions {
  signOut: () => Promise<{ error: unknown | null }>;
  clearLocalDrafts: () => void;
}

/**
 * Clear device drafts only after Supabase confirms the server session ended.
 * Supabase reports many auth failures in the resolved result rather than by
 * rejecting the promise, so callers must check both paths.
 */
export async function completeClientSignOut({
  signOut,
  clearLocalDrafts,
}: ClientSignOutOptions): Promise<void> {
  const { error } = await signOut();
  if (error) {
    throw error;
  }

  clearLocalDrafts();
}
