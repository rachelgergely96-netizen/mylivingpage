import { ADMIN_EMAIL } from "@/lib/admin";
import { getAppOrigin } from "@/lib/site";

export const BOT_REVIEW_AGE_HOURS = 24;

export type BotDisposition = "clean" | "watch" | "suspicious";

export type BotRiskSignalId =
  | "reserved_or_disposable_domain"
  | "timestamp_local_part"
  | "automation_keyword"
  | "internal_domain_non_admin"
  | "unconfirmed_past_grace"
  | "zero_signins_past_grace";

export interface BotRiskSignal {
  id: BotRiskSignalId;
  label: string;
  score: number;
}

export interface BotRiskInput {
  email: string | null;
  fullName: string | null;
  username: string | null;
  createdAt: string | null;
  emailConfirmedAt: string | null;
  signInCount: number | null;
  lastSignInAt: string | null;
}

export interface BotRiskAssessment {
  botRiskScore: number;
  botSignals: BotRiskSignal[];
  botDisposition: BotDisposition;
  emailConfirmedAt: string | null;
  isUnconfirmedPastGrace: boolean;
}

const DISPOSABLE_OR_RESERVED_DOMAINS = new Set([
  "10minutemail.com",
  "dispostable.com",
  "example.com",
  "example.net",
  "example.org",
  "fakeinbox.com",
  "getnada.com",
  "guerrillamail.com",
  "maildrop.cc",
  "mailinator.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "test.com",
  "trashmail.com",
  "yopmail.com",
]);

const RESERVED_SUFFIXES = [".example", ".invalid", ".localhost", ".test"];
const TIMESTAMP_LOCAL_PART_RE = /^(signup|mylp)[-_]?\d{8,}$/i;

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function getEmailDomain(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  return atIndex >= 0 ? normalized.slice(atIndex + 1) : "";
}

function getEmailLocalPart(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  return atIndex >= 0 ? normalized.slice(0, atIndex) : normalized;
}

function stripWww(hostname: string) {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function toBaseDomain(hostname: string) {
  const normalized = stripWww(hostname);
  const segments = normalized.split(".");
  if (segments.length <= 2) {
    return normalized;
  }
  return segments.slice(-2).join(".");
}

function getInternalDomains() {
  const hostname = stripWww(getAppOrigin().hostname);
  return new Set([hostname, toBaseDomain(hostname)]);
}

function isDisposableOrReservedDomain(domain: string) {
  return (
    DISPOSABLE_OR_RESERVED_DOMAINS.has(domain) ||
    RESERVED_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  );
}

function tokenize(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function containsAutomationKeyword(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  if (
    normalized.includes("playwright") ||
    normalized.includes("selenium") ||
    normalized.includes("smoke")
  ) {
    return true;
  }

  return tokenize(normalized).some(
    (token) => token === "bot" || token === "test" || token.startsWith("test"),
  );
}

function isOlderThanHours(value: string | null | undefined, hours: number, now: Date) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return now.getTime() - timestamp >= hours * 60 * 60 * 1000;
}

function getDisposition(score: number): BotDisposition {
  if (score >= 60) {
    return "suspicious";
  }

  if (score >= 40) {
    return "watch";
  }

  return "clean";
}

export function assessBotRisk(
  input: BotRiskInput,
  now: Date = new Date(),
): BotRiskAssessment {
  const email = normalizeEmail(input.email);
  const domain = getEmailDomain(email);
  const localPart = getEmailLocalPart(email);
  const emailConfirmedAt = input.emailConfirmedAt?.trim() || null;
  const createdAt = input.createdAt?.trim() || null;
  const signals: BotRiskSignal[] = [];

  if (domain && isDisposableOrReservedDomain(domain)) {
    signals.push({
      id: "reserved_or_disposable_domain",
      label: "Reserved or disposable email domain",
      score: 60,
    });
  }

  if (localPart && TIMESTAMP_LOCAL_PART_RE.test(localPart)) {
    signals.push({
      id: "timestamp_local_part",
      label: "Timestamp-style signup address",
      score: 40,
    });
  }

  if (
    containsAutomationKeyword(email) ||
    containsAutomationKeyword(input.fullName) ||
    containsAutomationKeyword(input.username)
  ) {
    signals.push({
      id: "automation_keyword",
      label: "Automation keyword in profile or email",
      score: 40,
    });
  }

  if (domain && email !== normalizeEmail(ADMIN_EMAIL) && getInternalDomains().has(domain)) {
    signals.push({
      id: "internal_domain_non_admin",
      label: "Uses internal domain without admin allowlist",
      score: 20,
    });
  }

  const isUnconfirmedPastGrace =
    !emailConfirmedAt && isOlderThanHours(createdAt, BOT_REVIEW_AGE_HOURS, now);
  if (isUnconfirmedPastGrace) {
    signals.push({
      id: "unconfirmed_past_grace",
      label: "Still unconfirmed after 24 hours",
      score: 20,
    });
  }

  const signInCount = input.signInCount ?? 0;
  const hasSignedIn = signInCount > 0 || Boolean(input.lastSignInAt);
  if (!hasSignedIn && isOlderThanHours(createdAt, BOT_REVIEW_AGE_HOURS, now)) {
    signals.push({
      id: "zero_signins_past_grace",
      label: "Zero sign-ins after 24 hours",
      score: 10,
    });
  }

  const botRiskScore = signals.reduce((sum, signal) => sum + signal.score, 0);

  return {
    botRiskScore,
    botSignals: signals,
    botDisposition: getDisposition(botRiskScore),
    emailConfirmedAt,
    isUnconfirmedPastGrace,
  };
}
