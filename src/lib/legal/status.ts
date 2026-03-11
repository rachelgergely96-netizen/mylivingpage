export interface LegalConfigIssue {
  envKey: string;
  label: string;
  message: string;
}

const REQUIRED_LEGAL_CONFIG = [
  {
    envKey: "NEXT_PUBLIC_LEGAL_COMPANY_NAME",
    label: "Company name",
  },
  {
    envKey: "NEXT_PUBLIC_LEGAL_CONTACT_EMAIL",
    label: "Contact email",
  },
  {
    envKey: "NEXT_PUBLIC_LEGAL_MAILING_ADDRESS",
    label: "Mailing address",
  },
  {
    envKey: "NEXT_PUBLIC_DMCA_AGENT_NAME",
    label: "DMCA agent name",
  },
  {
    envKey: "NEXT_PUBLIC_DMCA_AGENT_EMAIL",
    label: "DMCA agent email",
  },
  {
    envKey: "NEXT_PUBLIC_DMCA_AGENT_ADDRESS",
    label: "DMCA agent address",
  },
  {
    envKey: "NEXT_PUBLIC_SECURITY_EMAIL",
    label: "Security contact email",
  },
] as const;

function isMissing(value: string | undefined): boolean {
  return !value || !value.trim();
}

export function getLegalConfigIssues(
  env: NodeJS.ProcessEnv = process.env,
): LegalConfigIssue[] {
  return REQUIRED_LEGAL_CONFIG.flatMap(({ envKey, label }) => {
    if (!isMissing(env[envKey])) {
      return [];
    }

    return [
      {
        envKey,
        label,
        message: `${label} is still using a fallback value. Set ${envKey} before broader launch.`,
      },
    ];
  });
}

export function hasLegalConfigIssues(env: NodeJS.ProcessEnv = process.env): boolean {
  return getLegalConfigIssues(env).length > 0;
}
