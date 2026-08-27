interface FinishDeletedAccountClientStateOptions {
  clearLocalDrafts: () => void;
  signOut: () => Promise<unknown>;
  navigateHome: () => void;
}

/**
 * Finishes client cleanup after the server has already deleted the account.
 * Cleanup failures must not report the irreversible server action as failed.
 */
export async function finishDeletedAccountClientState({
  clearLocalDrafts,
  signOut,
  navigateHome,
}: FinishDeletedAccountClientStateOptions) {
  try {
    clearLocalDrafts();
  } catch {
    // Browser storage can be unavailable in hardened browsing modes.
  }

  try {
    await signOut();
  } catch {
    // The account is already gone. Continue to a signed-out destination even
    // if the local auth client cannot complete its best-effort cleanup.
  }

  navigateHome();
}
