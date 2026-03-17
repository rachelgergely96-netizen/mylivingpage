export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function isTurnstileConfigured() {
  return Boolean(getTurnstileSiteKey());
}

export function isTurnstileMissingInProduction() {
  const isProductionDeployment =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  return isProductionDeployment && !isTurnstileConfigured();
}
