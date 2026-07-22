const KNOWN_CRAWLER_PATTERN = /(?:googlebot|bingbot|duckduckbot|baiduspider|yandexbot|applebot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|semrushbot|ahrefsbot)/i;

export function isKnownCrawlerUserAgent(userAgent: string | null | undefined) {
  return Boolean(userAgent && KNOWN_CRAWLER_PATTERN.test(userAgent));
}
