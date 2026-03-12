const DEFAULT_APP_URL = "https://mylivingpage.com";

export const SITE_NAME = "MyLivingPage";
export const ORGANIZATION_NAME = SITE_NAME;
export const SITE_TAGLINE = "Visible to ATS, Memorable to People";
export const SITE_DESCRIPTION =
  "Keep an ATS-safe resume for the machines and one living page recruiters actually remember once they click.";
export const SITE_URL = getAppUrl();

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (raw || DEFAULT_APP_URL).replace(/\/+$/, "");
}

export function getAppOrigin(): URL {
  try {
    return new URL(getAppUrl());
  } catch {
    return new URL(DEFAULT_APP_URL);
  }
}

export function getAbsoluteUrl(path: `/${string}` | "/"): string {
  return new URL(path, getAppOrigin()).toString();
}

export const absoluteUrl = getAbsoluteUrl;
