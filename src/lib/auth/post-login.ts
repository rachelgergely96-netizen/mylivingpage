/**
 * Marks only the default returning-user destination for the one-shot
 * welcome-back reveal. Deep links keep their exact destination and never pause
 * for an intro.
 */
export function withPostLoginWelcome(destination: string): string {
  return destination === "/dashboard" ? "/dashboard?welcome=1" : destination;
}

function isCreateDestination(destination: string): boolean {
  try {
    return new URL(destination, "https://internal.mylivingpage.invalid")
      .pathname === "/create";
  } catch {
    return false;
  }
}

function isDefaultDashboardDestination(destination: string): boolean {
  return (
    destination === "/dashboard" ||
    destination === "/dashboard?welcome=1"
  );
}

/**
 * Resolves auth-funnel destinations against the account we just authenticated.
 *
 * Existing users can arrive at login carrying `next=/create` after entering
 * through a résumé/signup CTA. Sending them back into first-page onboarding
 * makes the account look empty, so route them through the welcome-back reveal
 * instead. Accounts without a page resume onboarding when a bare login would
 * otherwise strand them on an empty dashboard.
 *
 * A null account state means the profile check was inconclusive. In that case,
 * preserve the requested destination rather than guessing.
 */
export function resolvePostLoginDestination(
  destination: string,
  hasLivingPage: boolean | null,
): string {
  if (hasLivingPage === true && isCreateDestination(destination)) {
    return "/dashboard?welcome=1";
  }

  if (
    hasLivingPage === false &&
    isDefaultDashboardDestination(destination)
  ) {
    return "/create";
  }

  return withPostLoginWelcome(destination);
}
