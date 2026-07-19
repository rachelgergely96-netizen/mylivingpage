export function reportClientError(error: Error & { digest?: string }) {
  return fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: error.message,
      digest: error.digest,
      path: window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => undefined);
}
