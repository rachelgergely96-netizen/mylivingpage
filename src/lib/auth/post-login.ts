/**
 * Marks only the default returning-user destination for the one-shot
 * welcome-back reveal. Deep links keep their exact destination and never pause
 * for an intro.
 */
export function withPostLoginWelcome(destination: string): string {
  return destination === "/dashboard" ? "/dashboard?welcome=1" : destination;
}
