import { SITE_NAME } from "@/lib/site";

/**
 * Transactional email delivery.
 *
 * Deliberately dependency-free: Resend's REST API over `fetch` rather than an
 * SDK, so the notification system carries no new package and can be repointed
 * at another provider by replacing one function.
 *
 * Without `RESEND_API_KEY` this no-ops and reports `skipped`. That keeps local
 * development, CI, and preview deploys from sending real mail to real people
 * while every other part of the pipeline stays exercisable.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = `${SITE_NAME} <notifications@mylivingpage.com>`;

export type EmailDeliveryStatus = "sent" | "skipped" | "failed";

export interface EmailDeliveryResult {
  status: EmailDeliveryStatus;
  reason?: string;
}

export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Rendered into RFC 8058 one-click unsubscribe headers when present. */
  unsubscribeUrl?: string;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getNotificationFromAddress(): string {
  return process.env.NOTIFICATION_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

export async function sendTransactionalEmail(
  email: TransactionalEmail,
): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return { status: "skipped", reason: "email_not_configured" };
  }

  if (!email.to.trim()) {
    return { status: "skipped", reason: "missing_recipient" };
  }

  const headers: Record<string, string> = {};
  if (email.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${email.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getNotificationFromAddress(),
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        status: "failed",
        reason: `provider_${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      };
    }

    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
