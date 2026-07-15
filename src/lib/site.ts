const DEFAULT_APP_URL = "https://www.mylivingpage.com";

export const SITE_NAME = "MyLivingPage";
export const ORGANIZATION_NAME = SITE_NAME;
export const SITE_TAGLINE = "Your resume should be more than a file";
export const SITE_DESCRIPTION =
  "Build a polished living resume, share one link, and download an ATS-ready PDF—free.";
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
