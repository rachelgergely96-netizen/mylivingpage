import type { Metadata } from "next";

export type LegalSiteId = "mylivingpage" | "second-site";

export type LegalPolicyId =
  | "terms"
  | "privacy"
  | "cookies"
  | "acceptable-use"
  | "dmca"
  | "disclaimer"
  | "security"
  | "delete-account";

export interface LegalSiteConfig {
  id: LegalSiteId;
  brandName: string;
  domain: string;
  companyNamePlaceholder: string;
  contactEmailPlaceholder: string;
  mailingAddressPlaceholder: string;
  productDescription: string;
  supportedPolicies: LegalPolicyId[];
}

interface PolicyRouteInfo {
  href: `/${string}`;
  shortLabel: string;
  pageTitle: string;
  seoDescription: string;
}

export interface LegalNavItem {
  href: `/${string}`;
  label: string;
  description: string;
}

export const SECOND_SITE_DOMAIN_PLACEHOLDER = "[SECOND_SITE_DOMAIN]";

export const POLICY_ROUTES: Record<LegalPolicyId, PolicyRouteInfo> = {
  terms: {
    href: "/terms",
    shortLabel: "Terms",
    pageTitle: "Terms of Service",
    seoDescription:
      "Terms of Service for MyLivingPage.com and [SECOND_SITE_DOMAIN], including user responsibilities and dispute terms.",
  },
  privacy: {
    href: "/privacy",
    shortLabel: "Privacy",
    pageTitle: "Privacy Policy",
    seoDescription:
      "Privacy Policy covering personal data categories, processing purposes, sharing, retention, and rights.",
  },
  cookies: {
    href: "/cookies",
    shortLabel: "Cookies",
    pageTitle: "Cookie Policy",
    seoDescription:
      "Cookie Policy describing cookie categories, analytics and ads placeholders, and user cookie controls.",
  },
  "acceptable-use": {
    href: "/acceptable-use",
    shortLabel: "Acceptable Use",
    pageTitle: "Acceptable Use Policy",
    seoDescription:
      "Acceptable Use Policy outlining prohibited conduct, platform abuse restrictions, and enforcement.",
  },
  dmca: {
    href: "/dmca",
    shortLabel: "DMCA",
    pageTitle: "Copyright and DMCA Policy",
    seoDescription:
      "Copyright and DMCA Policy with notice and counter-notice instructions and repeat infringer terms.",
  },
  disclaimer: {
    href: "/disclaimer",
    shortLabel: "Disclaimer",
    pageTitle: "General Disclaimer",
    seoDescription:
      "General disclaimer for informational content, AI output limits, and user responsibility.",
  },
  security: {
    href: "/security",
    shortLabel: "Security",
    pageTitle: "Security Overview",
    seoDescription:
      "Security overview with safeguards, account responsibilities, and vulnerability reporting details.",
  },
  "delete-account": {
    href: "/delete-account",
    shortLabel: "Delete Account",
    pageTitle: "Account Deletion",
    seoDescription:
      "Account deletion instructions with retention summaries and post-deletion data handling details.",
  },
};

const MYLIVINGPAGE_POLICIES: LegalPolicyId[] = [
  "terms",
  "privacy",
  "cookies",
  "acceptable-use",
  "dmca",
  "disclaimer",
  "security",
  "delete-account",
];

const SECOND_SITE_POLICIES: LegalPolicyId[] = [
  "terms",
  "privacy",
  "cookies",
  "acceptable-use",
  "dmca",
  "disclaimer",
];

const LEGAL_SITES: Record<LegalSiteId, LegalSiteConfig> = {
  mylivingpage: {
    id: "mylivingpage",
    brandName: "MyLivingPage.com",
    domain: "mylivingpage.com",
    companyNamePlaceholder: "{{COMPANY_NAME}}",
    contactEmailPlaceholder: "{{CONTACT_EMAIL}}",
    mailingAddressPlaceholder: "{{MAILING_ADDRESS}}",
    productDescription:
      "A consumer web app where people create and manage personal living pages containing text, photos, links, notes, reminders, exports, and AI-assisted writing with private, link-share, or public controls.",
    supportedPolicies: MYLIVINGPAGE_POLICIES,
  },
  "second-site": {
    id: "second-site",
    brandName: SECOND_SITE_DOMAIN_PLACEHOLDER,
    domain: SECOND_SITE_DOMAIN_PLACEHOLDER,
    companyNamePlaceholder: "{{SECOND_SITE_COMPANY_NAME}}",
    contactEmailPlaceholder: "{{SECOND_SITE_CONTACT_EMAIL}}",
    mailingAddressPlaceholder: "{{SECOND_SITE_MAILING_ADDRESS}}",
    productDescription: "{{SECOND_SITE_DESCRIPTION}}",
    supportedPolicies: SECOND_SITE_POLICIES,
  },
};

function normalizeHost(rawHost: string | null | undefined): string {
  if (!rawHost) {
    return "";
  }
  return rawHost
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
}

function isTemplateValue(value: string): boolean {
  return value.includes("[") || value.includes("]") || value.includes("{") || value.includes("}");
}

export function resolveLegalSiteFromHost(host: string | null | undefined): LegalSiteId {
  const normalizedHost = normalizeHost(host);
  const configuredSecondDomain = normalizeHost(process.env.NEXT_PUBLIC_SECOND_SITE_DOMAIN ?? SECOND_SITE_DOMAIN_PLACEHOLDER);
  const validSecondDomain = configuredSecondDomain && !isTemplateValue(configuredSecondDomain);

  if (
    validSecondDomain &&
    normalizedHost &&
    (normalizedHost === configuredSecondDomain || normalizedHost.endsWith(`.${configuredSecondDomain}`))
  ) {
    return "second-site";
  }

  return "mylivingpage";
}

export function getLegalSiteConfig(siteId: LegalSiteId): LegalSiteConfig {
  return LEGAL_SITES[siteId];
}

export function isPolicyAvailableOnSite(siteId: LegalSiteId, policyId: LegalPolicyId): boolean {
  return LEGAL_SITES[siteId].supportedPolicies.includes(policyId);
}

export function getLegalNavItems(siteId: LegalSiteId, includeIndex: boolean = true): LegalNavItem[] {
  const site = LEGAL_SITES[siteId];
  const links: LegalNavItem[] = site.supportedPolicies.map((policyId) => {
    const route = POLICY_ROUTES[policyId];
    return {
      href: route.href,
      label: route.pageTitle,
      description: route.seoDescription,
    };
  });

  if (!includeIndex) {
    return links;
  }

  return [
    {
      href: "/legal",
      label: "Legal and Policies",
      description: "Central index of legal policies and user agreements.",
    },
    ...links,
  ];
}

export function getPolicyMetadata(policyId: LegalPolicyId): Metadata {
  const route = POLICY_ROUTES[policyId];
  return {
    title: `${route.pageTitle} | MyLivingPage.com / [SECOND_SITE_DOMAIN]`,
    description: route.seoDescription,
  };
}

export function getLegalIndexMetadata(): Metadata {
  return {
    title: "Legal and Policies | MyLivingPage.com / [SECOND_SITE_DOMAIN]",
    description: "Browse Terms, Privacy, Cookie, Acceptable Use, DMCA, Disclaimer, and related legal policies.",
  };
}
