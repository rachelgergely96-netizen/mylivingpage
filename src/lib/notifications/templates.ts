import { SITE_NAME } from "@/lib/site";

export interface ViewNotificationContent {
  subject: string;
  html: string;
  text: string;
}

export interface ViewNotificationInput {
  /** Owner's display name, for the greeting. Falls back to a neutral opener. */
  ownerName: string | null;
  pageUrl: string;
  analyticsUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
  /** e.g. "They spent 40 seconds on the page, mostly on Proof." */
  qualityLine: string;
  /** Present when the view arrived through a targeted version. */
  variantLabel?: string | null;
  referrerLabel?: string | null;
}

export interface DigestPageSummary {
  pageUrl: string;
  views: number;
  repeatVisitors: number;
  topReferrerLabel: string | null;
  outboundClicks: number;
}

export interface DigestNotificationInput {
  ownerName: string | null;
  analyticsUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
  rangeLabel: string;
  summary: DigestPageSummary;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const WRAPPER_STYLE =
  "margin:0;padding:24px;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;";
const CARD_STYLE =
  "max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e2dd;padding:28px;";
const BUTTON_STYLE =
  "display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:11px 18px;font-weight:600;font-size:14px;";
const FOOTER_STYLE =
  "margin-top:28px;padding-top:16px;border-top:1px solid #e2e2dd;font-size:12px;line-height:1.6;color:#6b6b66;";

function greeting(ownerName: string | null): string {
  return ownerName?.trim() ? `Hi ${ownerName.trim()},` : "Hi,";
}

function footerHtml(preferencesUrl: string, unsubscribeUrl: string): string {
  return `<div style="${FOOTER_STYLE}">
      You're getting this because view alerts are on for your ${escapeHtml(SITE_NAME)} page.
      <br />
      <a href="${escapeHtml(preferencesUrl)}" style="color:#6b6b66;">Notification settings</a>
      &nbsp;·&nbsp;
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b6b66;">Unsubscribe</a>
    </div>`;
}

function footerText(preferencesUrl: string, unsubscribeUrl: string): string {
  return `\n\n—\nView alerts are on for your ${SITE_NAME} page.\nNotification settings: ${preferencesUrl}\nUnsubscribe: ${unsubscribeUrl}\n`;
}

function contextLines(input: ViewNotificationInput): string[] {
  const lines: string[] = [];
  if (input.variantLabel?.trim()) {
    lines.push(`They opened your "${input.variantLabel.trim()}" version.`);
  }
  if (input.referrerLabel?.trim()) {
    lines.push(`Came from ${input.referrerLabel.trim()}.`);
  }
  return lines;
}

export function buildFirstViewEmail(
  input: ViewNotificationInput,
): ViewNotificationContent {
  const extras = contextLines(input);
  const subject = "Someone opened your page";

  const html = `<div style="${WRAPPER_STYLE}">
    <div style="${CARD_STYLE}">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(greeting(input.ownerName))}</p>
      <p style="margin:0 0 8px;font-size:19px;font-weight:600;line-height:1.4;">Your page just got its first real read.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(input.qualityLine)}</p>
      ${extras
        .map(
          (line) =>
            `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4a4a45;">${escapeHtml(line)}</p>`,
        )
        .join("")}
      <p style="margin:22px 0 0;">
        <a href="${escapeHtml(input.analyticsUrl)}" style="${BUTTON_STYLE}">See the detail</a>
      </p>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b6b66;">
        Your page: <a href="${escapeHtml(input.pageUrl)}" style="color:#6b6b66;">${escapeHtml(input.pageUrl)}</a>
      </p>
      ${footerHtml(input.preferencesUrl, input.unsubscribeUrl)}
    </div>
  </div>`;

  const text = `${greeting(input.ownerName)}

Your page just got its first real read.

${input.qualityLine}
${extras.length ? `\n${extras.join("\n")}\n` : ""}
See the detail: ${input.analyticsUrl}
Your page: ${input.pageUrl}${footerText(input.preferencesUrl, input.unsubscribeUrl)}`;

  return { subject, html, text };
}

export function buildRepeatVisitorEmail(
  input: ViewNotificationInput,
): ViewNotificationContent {
  const extras = contextLines(input);
  const subject = "Someone came back to your page";

  const html = `<div style="${WRAPPER_STYLE}">
    <div style="${CARD_STYLE}">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(greeting(input.ownerName))}</p>
      <p style="margin:0 0 8px;font-size:19px;font-weight:600;line-height:1.4;">Someone opened your page again.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(input.qualityLine)}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">A second visit is usually the one worth acting on.</p>
      ${extras
        .map(
          (line) =>
            `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4a4a45;">${escapeHtml(line)}</p>`,
        )
        .join("")}
      <p style="margin:22px 0 0;">
        <a href="${escapeHtml(input.analyticsUrl)}" style="${BUTTON_STYLE}">See the detail</a>
      </p>
      ${footerHtml(input.preferencesUrl, input.unsubscribeUrl)}
    </div>
  </div>`;

  const text = `${greeting(input.ownerName)}

Someone opened your page again.

${input.qualityLine}

A second visit is usually the one worth acting on.
${extras.length ? `\n${extras.join("\n")}\n` : ""}
See the detail: ${input.analyticsUrl}${footerText(input.preferencesUrl, input.unsubscribeUrl)}`;

  return { subject, html, text };
}

export function buildWeeklyDigestEmail(
  input: DigestNotificationInput,
): ViewNotificationContent {
  const { summary } = input;
  const subject =
    summary.views > 0
      ? `Your page in the ${input.rangeLabel}: ${summary.views} ${summary.views === 1 ? "view" : "views"}`
      : `Your page in the ${input.rangeLabel}`;

  const rows: Array<[string, string]> = [
    ["Views", String(summary.views)],
    ["Repeat visitors", String(summary.repeatVisitors)],
    ["Link clicks", String(summary.outboundClicks)],
  ];
  if (summary.topReferrerLabel) {
    rows.push(["Top source", summary.topReferrerLabel]);
  }

  const body =
    summary.views > 0
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Here's how your page did in the ${escapeHtml(input.rangeLabel)}.</p>`
      : `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">No one opened your page in the ${escapeHtml(input.rangeLabel)}. A good week to send it to one more person.</p>`;

  const html = `<div style="${WRAPPER_STYLE}">
    <div style="${CARD_STYLE}">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(greeting(input.ownerName))}</p>
      ${body}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        ${rows
          .map(
            ([label, value]) =>
              `<tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ec;font-size:14px;color:#6b6b66;">${escapeHtml(label)}</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ec;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
              </tr>`,
          )
          .join("")}
      </table>
      <p style="margin:0;">
        <a href="${escapeHtml(input.analyticsUrl)}" style="${BUTTON_STYLE}">Open analytics</a>
      </p>
      ${footerHtml(input.preferencesUrl, input.unsubscribeUrl)}
    </div>
  </div>`;

  const text = `${greeting(input.ownerName)}

${
  summary.views > 0
    ? `Here's how your page did in the ${input.rangeLabel}.`
    : `No one opened your page in the ${input.rangeLabel}. A good week to send it to one more person.`
}

${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}

Open analytics: ${input.analyticsUrl}${footerText(input.preferencesUrl, input.unsubscribeUrl)}`;

  return { subject, html, text };
}
