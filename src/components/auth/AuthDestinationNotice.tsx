import React from "react";

interface AuthDestinationNoticeProps {
  action: "signin" | "verify";
  path: string | null;
}

export function getAuthDestinationLabel(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0];

  if (pathname === "/create" || pathname.startsWith("/create/")) {
    return "Build your Living Page";
  }
  if (pathname === "/dashboard/settings") {
    return "Account settings";
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "Your dashboard";
  }
  if (pathname === "/pricing") {
    return "Plan details";
  }
  return "The MyLivingPage screen you requested";
}

export default function AuthDestinationNotice({
  action,
  path,
}: AuthDestinationNoticeProps) {
  if (!path) return null;

  return (
    <div
      className="site-callout mt-3 border-l-2 border-l-site-action px-3 py-2 sm:mt-5 sm:py-2.5"
      data-auth-destination
    >
      <p className="site-eyebrow text-site-muted">
        Destination kept
      </p>
      <p className="mt-1 text-sm leading-5 text-site-secondary">
        {action === "verify" ? "After verification" : "After sign in"}: {" "}
        <strong className="text-site-text">{getAuthDestinationLabel(path)}</strong>
      </p>
    </div>
  );
}
