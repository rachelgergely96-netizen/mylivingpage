import { reportServerError } from "@/lib/observability";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  process.on("uncaughtExceptionMonitor", (error, origin) => {
    reportServerError("process.uncaught_exception", error, { origin });
  });
  process.on("unhandledRejection", (reason) => {
    reportServerError("process.unhandled_rejection", reason);
  });
}
export function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: string; routePath: string; routeType: string; renderSource: string },
) {
  reportServerError("next.request_error", error, {
    method: request.method,
    path: request.path,
    route: context.routePath,
    routeType: context.routeType,
    requestId: request.headers["x-vercel-id"],
  });
}
