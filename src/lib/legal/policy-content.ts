import type { LegalPolicyId, LegalSiteConfig } from "@/lib/legal/site-config";

export type LegalBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
      ordered?: boolean;
    };

export interface LegalSection {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalPolicyDocument {
  policyId: LegalPolicyId;
  title: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const LAST_UPDATED_PLACEHOLDER = "{{EFFECTIVE_DATE}}";

function getSharedCoreSections(site: LegalSiteConfig): LegalSection[] {
  return [
    {
      id: "scope",
      heading: "Scope",
      blocks: [
        {
          type: "paragraph",
          text: `These terms apply to your access to and use of ${site.brandName} and related services, websites, applications, APIs, exports, and support channels operated by ${site.companyNamePlaceholder}.`,
        },
      ],
    },
    {
      id: "definitions",
      heading: "Definitions",
      blocks: [
        {
          type: "list",
          items: [
            '"Service" means the products, features, and functionality offered through the platform.',
            '"Account" means the credentials and profile used to access the Service.',
            '"User Content" means text, photos, links, notes, files, and other materials you submit.',
            '"AI Features" means any AI-assisted drafting, summarization, extraction, or recommendation tools.',
            '"Public Page" means content that you mark as public and that may be visible to anyone.',
          ],
        },
      ],
    },
    {
      id: "user-obligations",
      heading: "User Obligations",
      blocks: [
        {
          type: "list",
          items: [
            "Provide accurate registration information and keep it current.",
            "Maintain account security and keep credentials confidential.",
            "Comply with applicable laws and third-party rights.",
            "Review AI-generated outputs and verify accuracy before sharing or relying on them.",
            "Use privacy controls responsibly, including private, link-share, and public settings where available.",
          ],
        },
      ],
    },
    {
      id: "prohibited-uses",
      heading: "Prohibited Uses",
      blocks: [
        {
          type: "list",
          items: [
            "Harassment, hate, threats, exploitation, or abuse of any person or group.",
            "Illegal activity, facilitation of crime, or publication of unlawful content.",
            "Doxxing, stalking, or disclosure of personal information without lawful basis.",
            "Scraping, data harvesting, spamming, malware distribution, or unauthorized automation.",
            "Security testing, penetration testing, or vulnerability exploitation without prior written permission.",
            "Impersonation, fraud, deceptive practices, or false affiliation claims.",
            "Copyright, trademark, privacy, or other intellectual property infringement.",
          ],
        },
      ],
    },
    {
      id: "intellectual-property",
      heading: "Intellectual Property",
      blocks: [
        {
          type: "paragraph",
          text: `The Service design, software, branding, and related content are owned by ${site.companyNamePlaceholder} or licensors and are protected by intellectual property laws. Except as expressly permitted, you may not copy, modify, distribute, reverse engineer, or create derivative works from the Service.`,
        },
      ],
    },
    {
      id: "user-content-license",
      heading: "User Content License",
      blocks: [
        {
          type: "paragraph",
          text: "You retain ownership of your User Content. You grant us a non-exclusive, worldwide, royalty-free license to host, store, process, reproduce, adapt, and display your User Content solely to operate, secure, improve, and provide the Service according to your sharing settings and instructions.",
        },
        {
          type: "paragraph",
          text: `You represent that you have all rights needed to upload and share your User Content. You may report abusive, infringing, or unlawful content at ${site.contactEmailPlaceholder}. We may remove or restrict reported content and cooperate with lawful requests.`,
        },
      ],
    },
    {
      id: "sharing-public-indexing",
      heading: "Sharing and Public Indexing",
      blocks: [
        {
          type: "paragraph",
          text: "If you set content to public or share public links, that information may be accessible to anyone and may be crawled or indexed by search engines. You are responsible for selecting and reviewing visibility settings before publishing.",
        },
      ],
    },
    {
      id: "ai-features",
      heading: "AI-Assisted Features",
      blocks: [
        {
          type: "paragraph",
          text: "AI outputs may be incomplete, inaccurate, outdated, or inappropriate for your context. You must independently verify outputs before relying on them. Do not rely on AI output as legal, medical, financial, tax, safety, or other professional advice.",
        },
        {
          type: "paragraph",
          text: "Do not submit highly sensitive personal data, privileged information, trade secrets, or confidential material to AI Features unless your own legal and compliance review approves it.",
        },
      ],
    },
    {
      id: "moderation-rights",
      heading: "Moderation Rights",
      blocks: [
        {
          type: "paragraph",
          text: "We may review, remove, disable access to, or refuse to publish content that we reasonably believe violates these policies, law, or platform safety requirements. We may also suspend features or accounts during investigation.",
        },
      ],
    },
    {
      id: "termination",
      heading: "Termination",
      blocks: [
        {
          type: "paragraph",
          text: "You may stop using the Service at any time. We may suspend or terminate access for violations, legal requirements, abuse risks, unpaid fees, or security concerns. Sections that by nature should survive termination will survive.",
        },
      ],
    },
    {
      id: "disclaimers",
      heading: "Disclaimers",
      blocks: [
        {
          type: "paragraph",
          text: `The Service is provided "as is" and "as available." To the maximum extent permitted by law, ${site.companyNamePlaceholder} disclaims all warranties, express or implied, including fitness for a particular purpose, merchantability, title, non-infringement, and uninterrupted availability.`,
        },
      ],
    },
    {
      id: "limitation-of-liability",
      heading: "Limitation of Liability",
      blocks: [
        {
          type: "paragraph",
          text: `To the maximum extent permitted by law, ${site.companyNamePlaceholder} and its affiliates will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, data, goodwill, or business opportunities.`,
        },
        {
          type: "paragraph",
          text: "Any aggregate liability related to the Service is limited to the amount you paid for the Service in the 12 months before the event giving rise to the claim, or USD $100 if no fees were paid, unless applicable law prohibits this limitation.",
        },
      ],
    },
    {
      id: "indemnification",
      heading: "Indemnification",
      blocks: [
        {
          type: "paragraph",
          text: `You agree to defend, indemnify, and hold harmless ${site.companyNamePlaceholder}, its officers, employees, contractors, and affiliates from claims, losses, liabilities, and expenses arising out of your User Content, your use of the Service, or your violation of law or these policies.`,
        },
      ],
    },
    {
      id: "dispute-resolution",
      heading: "Dispute Resolution",
      blocks: [
        {
          type: "paragraph",
          text: "Before filing a formal claim, you agree to contact us and attempt informal resolution for at least 30 days.",
        },
        {
          type: "paragraph",
          text: "Arbitration setting: {{ARBITRATION_OPTIONAL}}. Class action waivers and jury trial waivers may apply where enforceable.",
        },
      ],
    },
    {
      id: "governing-law",
      heading: "Governing Law",
      blocks: [
        {
          type: "paragraph",
          text: "These policies are governed by the laws of {{JURISDICTION_STATE}}, excluding conflict of law rules, except where mandatory consumer protection laws apply.",
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes",
      blocks: [
        {
          type: "paragraph",
          text: "We may update policies from time to time. Updated versions will be posted with a new Last updated date. Continued use of the Service after updates means you accept the revised terms.",
        },
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: [
        {
          type: "list",
          items: [
            `Company: ${site.companyNamePlaceholder}`,
            `Email: ${site.contactEmailPlaceholder}`,
            `Mailing address: ${site.mailingAddressPlaceholder}`,
          ],
        },
      ],
    },
  ];
}

function buildTermsPolicy(site: LegalSiteConfig): LegalPolicyDocument {
  return {
    policyId: "terms",
    title: "Terms of Service",
    summary: `These Terms govern your use of ${site.brandName} and describe your rights, obligations, and legal relationship with ${site.companyNamePlaceholder}.`,
    lastUpdated: LAST_UPDATED_PLACEHOLDER,
    sections: [
      {
        id: "service-overview",
        heading: "Service Overview",
        blocks: [
          {
            type: "paragraph",
            text: `${site.brandName} provides ${site.productDescription}`,
          },
          {
            type: "paragraph",
            text: "Features may include account management, content sharing controls, reminders, exports, and optional integrations with third-party services.",
          },
        ],
      },
      {
        id: "eligibility-accounts",
        heading: "Eligibility and Accounts",
        blocks: [
          {
            type: "list",
            items: [
              "You must be legally able to enter a binding agreement to use the Service.",
              "You are responsible for activities under your account.",
              "You must promptly notify us of unauthorized access or suspected compromise.",
            ],
          },
        ],
      },
      {
        id: "paid-services",
        heading: "Paid Services and Billing",
        blocks: [
          {
            type: "paragraph",
            text: "Some features may require payment. If paid plans are offered, fees, billing cycle, renewals, cancellations, and refunds are shown at checkout and may be processed by {{PAYMENT_PROCESSOR}}.",
          },
          {
            type: "paragraph",
            text: "You authorize us and our processor to charge the selected payment method for recurring or one-time charges as disclosed.",
          },
        ],
      },
      {
        id: "third-party-services",
        heading: "Third-Party Services",
        blocks: [
          {
            type: "paragraph",
            text: "The Service may depend on or integrate with third-party providers such as hosting, analytics, email, cloud storage, authentication, and payments. Applicable providers include {{THIRD_PARTY_SERVICES}} and are governed by their own terms.",
          },
        ],
      },
      {
        id: "content-controls",
        heading: "Content Controls and Visibility",
        blocks: [
          {
            type: "paragraph",
            text: "You can manage visibility settings for your content where available. Private content is intended for account-only access, link-share content is accessible to anyone with the link, and public content is broadly visible and may be indexed.",
          },
        ],
      },
      ...getSharedCoreSections(site),
    ],
  };
}

function buildPrivacyPolicy(site: LegalSiteConfig): LegalPolicyDocument {
  return {
    policyId: "privacy",
    title: "Privacy Policy",
    summary: `This Privacy Policy explains how ${site.companyNamePlaceholder} handles personal data for ${site.brandName}.`,
    lastUpdated: LAST_UPDATED_PLACEHOLDER,
    sections: [
      {
        id: "privacy-scope",
        heading: "Scope and Roles",
        blocks: [
          {
            type: "paragraph",
            text: "This policy covers personal data collected through the Service, support channels, and related communications.",
          },
          {
            type: "paragraph",
            text: "Depending on context, we may act as a controller, business, processor, or service provider under applicable law.",
          },
        ],
      },
      {
        id: "categories-of-data",
        heading: "Categories of Personal Data",
        blocks: [
          {
            type: "list",
            items: [
              "Identifiers: name, username, email, account ID, device IDs, and IP address.",
              "Profile and content: text, photos, links, notes, files, and user-submitted materials.",
              "Usage data: logs, interactions, diagnostics, and performance metrics.",
              "Transactions: subscription and billing metadata from {{PAYMENT_PROCESSOR}}.",
              "Support data: messages, reports, and feedback.",
            ],
          },
        ],
      },
      {
        id: "sources",
        heading: "Sources of Data",
        blocks: [
          {
            type: "list",
            items: [
              "Directly from you.",
              "Automatically from device and browser activity.",
              "From third-party services you connect.",
              "From vendors supporting hosting, analytics, and security.",
            ],
          },
        ],
      },
      {
        id: "purposes-legal-bases",
        heading: "Purposes and Legal Bases",
        blocks: [
          {
            type: "list",
            items: [
              "Provide, secure, maintain, and improve the Service.",
              "Operate reminders, exports, and AI-assisted features.",
              "Process payments and provide customer support.",
              "Detect abuse, fraud, and policy violations.",
              "Comply with legal obligations.",
              "Legal bases placeholder: {{GDPR_RIGHTS_AND_LAWFUL_BASIS_DETAILS}}.",
            ],
          },
        ],
      },
      {
        id: "sharing",
        heading: "Sharing Categories",
        blocks: [
          {
            type: "list",
            items: [
              "Infrastructure and hosting providers.",
              "Analytics, communications, and support vendors.",
              "Payment and billing providers.",
              "Security and fraud prevention providers.",
              "Professional advisors and authorities where legally required.",
              "Provider list placeholder: {{THIRD_PARTY_SERVICES}}.",
            ],
          },
        ],
      },
      {
        id: "retention-rights",
        heading: "Retention and User Rights",
        blocks: [
          {
            type: "paragraph",
            text: "We retain personal data as needed to provide the Service, satisfy legal requirements, and resolve disputes, then delete or de-identify when no longer needed.",
          },
          {
            type: "list",
            items: [
              "US rights placeholder: {{US_STATE_PRIVACY_RIGHTS}}.",
              "GDPR/UK rights placeholder: {{GDPR_RIGHTS_AND_LAWFUL_BASIS_DETAILS}}.",
              `Submit requests at ${site.contactEmailPlaceholder}.`,
            ],
          },
        ],
      },
      {
        id: "cookies-dnt-children-transfers",
        heading: "Cookies, Do Not Track, Children, and Transfers",
        blocks: [
          {
            type: "list",
            items: [
              "Cookies and analytics are described in this policy and the Cookie Policy.",
              "Do Not Track note: no uniform industry handling; controls are provided where required.",
              "Children's privacy: not intended for children under 13, or higher age where required.",
              "International transfer mechanism placeholder: {{INTERNATIONAL_TRANSFER_MECHANISM}}.",
            ],
          },
        ],
      },
      {
        id: "privacy-contact",
        heading: "Privacy Contact",
        blocks: [
          {
            type: "list",
            items: [
              `Email: ${site.contactEmailPlaceholder}`,
              `Mailing address: ${site.mailingAddressPlaceholder}`,
              "DPO contact placeholder: {{DPO_CONTACT_OPTIONAL}}.",
            ],
          },
        ],
      },
      ...getSharedCoreSections(site),
    ],
  };
}

function buildCookiePolicy(site: LegalSiteConfig): LegalPolicyDocument {
  return {
    policyId: "cookies",
    title: "Cookie Policy",
    summary: "This policy explains cookie categories, analytics and ads placeholders, and user controls.",
    lastUpdated: LAST_UPDATED_PLACEHOLDER,
    sections: [
      {
        id: "cookie-intro",
        heading: "What Cookies Are",
        blocks: [
          {
            type: "paragraph",
            text: "Cookies are small files stored on your device. Similar technologies include local storage, pixels, tags, and SDKs.",
          },
        ],
      },
      {
        id: "cookie-categories",
        heading: "Cookie Categories",
        blocks: [
          {
            type: "list",
            items: [
              "Strictly necessary cookies for login, session management, and security.",
              "Functional cookies for preferences and usability.",
              "Analytics cookies for understanding feature usage and performance.",
              "Advertising cookies, if enabled, for attribution and campaign measurement.",
            ],
          },
        ],
      },
      {
        id: "analytics-ads",
        heading: "Analytics and Advertising Placeholders",
        blocks: [
          {
            type: "paragraph",
            text: "We may use analytics and advertising providers that collect technical and usage data under their own terms. Provider placeholder: {{THIRD_PARTY_SERVICES}}.",
          },
        ],
      },
      {
        id: "manage-cookies",
        heading: "How to Manage Cookies",
        blocks: [
          {
            type: "list",
            items: [
              "Adjust browser settings to block or delete cookies.",
              "Use in-product cookie settings where available.",
              "Use vendor-specific opt-out tools where available.",
            ],
          },
          {
            type: "paragraph",
            text: "Disabling some cookies may affect platform functionality.",
          },
        ],
      },
      {
        id: "consent",
        heading: "Consent Mechanism",
        blocks: [
          {
            type: "paragraph",
            text: "Consent banner and preference center placeholder: {{COOKIE_CONSENT_MECHANISM}}. We collect consent for non-essential cookies where required by law.",
          },
        ],
      },
      ...getSharedCoreSections(site),
    ],
  };
}

function buildAcceptableUsePolicy(site: LegalSiteConfig): LegalPolicyDocument {
  return {
    policyId: "acceptable-use",
    title: "Acceptable Use Policy",
    summary: "This policy defines prohibited behavior and how we enforce platform safety.",
    lastUpdated: LAST_UPDATED_PLACEHOLDER,
    sections: [
      {
        id: "aup-purpose",
        heading: "Purpose",
        blocks: [
          {
            type: "paragraph",
            text: `This policy applies to all users of ${site.brandName} and is designed to protect users, systems, and the public.`,
          },
        ],
      },
      {
        id: "aup-prohibited",
        heading: "Prohibited Conduct",
        blocks: [
          {
            type: "list",
            items: [
              "Harassment, threats, hate speech, or abuse.",
              "Illegal content, criminal facilitation, or violent/extremist content.",
              "Doxxing, stalking, and publication of personal data without lawful basis.",
              "Scraping, bulk collection, and unauthorized automated extraction.",
              "Spamming, phishing, malware distribution, or fraud.",
              "Security testing or penetration attempts without permission.",
              "Impersonation and misleading identity claims.",
              "Copyright or trademark infringement and other IP violations.",
            ],
          },
        ],
      },
      {
        id: "aup-ai-use",
        heading: "AI Feature Use",
        blocks: [
          {
            type: "paragraph",
            text: "You may not use AI features to generate unlawful, deceptive, or harmful content. You remain responsible for all outputs shared through your account.",
          },
        ],
      },
      {
        id: "aup-reports-enforcement",
        heading: "Reports and Enforcement",
        blocks: [
          {
            type: "paragraph",
            text: `Report violations to ${site.contactEmailPlaceholder}. We may investigate, remove content, limit features, suspend accounts, or escalate to authorities where required.`,
          },
        ],
      },
      ...getSharedCoreSections(site),
    ],
  };
}

function buildDmcaPolicy(site: LegalSiteConfig): LegalPolicyDocument {
  return {
    policyId: "dmca",
    title: "Copyright and DMCA Policy",
    summary: "This policy describes notice and counter-notice procedures for copyright complaints.",
    lastUpdated: LAST_UPDATED_PLACEHOLDER,
    sections: [
      {
        id: "dmca-scope",
        heading: "Scope",
        blocks: [
          {
            type: "paragraph",
            text: "If you believe content on the Service infringes your copyright, you may send a takedown notice to our designated agent.",
          },
        ],
      },
      {
        id: "dmca-agent",
        heading: "Designated Agent",
        blocks: [
          {
            type: "list",
            items: [
              "Agent name: {{DMCA_AGENT_NAME}}",
              "Agent email: {{DMCA_AGENT_EMAIL}}",
              "Agent mailing address: {{DMCA_AGENT_ADDRESS}}",
              "Agent phone (optional): {{DMCA_AGENT_PHONE}}",
            ],
          },
        ],
      },
      {
        id: "dmca-notice",
        heading: "Notice Requirements",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Your contact information.",
              "Identification of the copyrighted work.",
              "Identification and location of allegedly infringing material.",
              "Good-faith statement of unauthorized use.",
              "Accuracy and authority statement under penalty of perjury.",
              "Physical or electronic signature.",
            ],
          },
        ],
      },
      {
        id: "dmca-counter-notice",
        heading: "Counter-Notice Process",
        blocks: [
          {
            type: "paragraph",
            text: "If content was removed by mistake, you may submit a counter-notice containing legally required statements. We may restore content if no court action is filed within the statutory window.",
          },
          {
            type: "list",
            items: [
              "Counter-notice sender identification and contact details.",
              "Identification of removed material and original location.",
              "Statement under penalty of perjury of mistake or misidentification.",
              "Consent to jurisdiction and service requirements.",
              "Physical or electronic signature.",
            ],
          },
        ],
      },
      {
        id: "repeat-infringers",
        heading: "Repeat Infringer Policy",
        blocks: [
          {
            type: "paragraph",
            text: "We may suspend or terminate users who are subject to repeated valid infringement claims.",
          },
        ],
      },
      ...getSharedCoreSections(site),
    ],
  };
}

function buildDisclaimerPolicy(site: LegalSiteConfig): LegalPolicyDocument {
  return {
    policyId: "disclaimer",
    title: "General Disclaimer",
    summary: "The Service is informational and does not provide legal, medical, or financial advice.",
    lastUpdated: LAST_UPDATED_PLACEHOLDER,
    sections: [
      {
        id: "no-professional-advice",
        heading: "No Professional Advice",
        blocks: [
          {
            type: "paragraph",
            text: "Content provided through the Service is for general information only and is not legal, medical, financial, tax, or other professional advice.",
          },
        ],
      },
      {
        id: "ai-output-limitations",
        heading: "AI Output Limitations",
        blocks: [
          {
            type: "paragraph",
            text: "AI outputs may be inaccurate, incomplete, or outdated. You must verify outputs independently and not rely on them for professional, regulated, or high-risk decisions.",
          },
        ],
      },
      {
        id: "user-responsibility",
        heading: "User Responsibility",
        blocks: [
          {
            type: "paragraph",
            text: "You are solely responsible for your content, privacy settings, sharing choices, and all consequences of relying on or publishing information from the Service.",
          },
        ],
      },
      {
        id: "third-party-links",
        heading: "Third-Party Links and Services",
        blocks: [
          {
            type: "paragraph",
            text: "The Service may include links or integrations to third-party services. We do not control and are not responsible for third-party content, terms, or privacy practices.",
          },
        ],
      },
      ...getSharedCoreSections(site),
    ],
  };
}

function buildSecurityPolicy(site: LegalSiteConfig): LegalPolicyDocument {
  return {
    policyId: "security",
    title: "Security Overview",
    summary: "This overview describes our security controls and vulnerability reporting process.",
    lastUpdated: LAST_UPDATED_PLACEHOLDER,
    sections: [
      {
        id: "security-overview",
        heading: "Security Program Overview",
        blocks: [
          {
            type: "list",
            items: [
              "Access controls and authentication safeguards.",
              "Encryption in transit and, where applicable, at rest.",
              "Logging, monitoring, backup, and incident response processes.",
              "Periodic platform hardening and risk review activities.",
            ],
          },
        ],
      },
      {
        id: "shared-responsibility",
        heading: "Shared Responsibility",
        blocks: [
          {
            type: "paragraph",
            text: "Security is shared. Users are responsible for account credential security, endpoint protection, and safe sharing choices.",
          },
        ],
      },
      {
        id: "reporting-vulnerabilities",
        heading: "How to Report a Vulnerability",
        blocks: [
          {
            type: "paragraph",
            text: "Send responsible disclosures to {{SECURITY_EMAIL}} and include reproduction steps, affected URLs or endpoints, and impact details.",
          },
          {
            type: "paragraph",
            text: "Do not perform destructive testing, denial-of-service, social engineering, or data exfiltration without explicit written authorization.",
          },
        ],
      },
      {
        id: "security-vendors",
        heading: "Service Providers",
        blocks: [
          {
            type: "paragraph",
            text: "Infrastructure and operational services may be provided by vetted third-party vendors. Provider placeholder: {{THIRD_PARTY_SERVICES}}.",
          },
        ],
      },
      ...getSharedCoreSections(site),
    ],
  };
}

function buildDeleteAccountPolicy(site: LegalSiteConfig): LegalPolicyDocument {
  return {
    policyId: "delete-account",
    title: "Account Deletion",
    summary: "This page explains account deletion steps and what data may be retained after deletion.",
    lastUpdated: LAST_UPDATED_PLACEHOLDER,
    sections: [
      {
        id: "deletion-steps",
        heading: "How to Delete Your Account",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Sign in and open account settings.",
              "Select Delete account and complete verification.",
              `If you cannot sign in, email ${site.contactEmailPlaceholder} from your registered address.`,
            ],
          },
        ],
      },
      {
        id: "retention-summary",
        heading: "Data Retention Summary",
        blocks: [
          {
            type: "list",
            items: [
              "Profile and content records: {{ACCOUNT_DATA_RETENTION_WINDOW}}.",
              "Financial and tax records: {{FINANCIAL_RECORD_RETENTION_WINDOW}}.",
              "Security logs and abuse records: {{SECURITY_LOG_RETENTION_WINDOW}}.",
              "Backup systems: {{BACKUP_RETENTION_WINDOW}}.",
            ],
          },
        ],
      },
      {
        id: "deletion-notes",
        heading: "Important Notes",
        blocks: [
          {
            type: "paragraph",
            text: "Public or previously shared content may remain in third-party caches. We may retain data where required by law, for fraud prevention, or to resolve disputes.",
          },
          {
            type: "paragraph",
            text: "Export your content before deletion if you want a personal copy.",
          },
        ],
      },
      ...getSharedCoreSections(site),
    ],
  };
}

const POLICY_BUILDERS: Record<LegalPolicyId, (site: LegalSiteConfig) => LegalPolicyDocument> = {
  terms: buildTermsPolicy,
  privacy: buildPrivacyPolicy,
  cookies: buildCookiePolicy,
  "acceptable-use": buildAcceptableUsePolicy,
  dmca: buildDmcaPolicy,
  disclaimer: buildDisclaimerPolicy,
  security: buildSecurityPolicy,
  "delete-account": buildDeleteAccountPolicy,
};

export function getPolicyDocument(site: LegalSiteConfig, policyId: LegalPolicyId): LegalPolicyDocument {
  return POLICY_BUILDERS[policyId](site);
}
