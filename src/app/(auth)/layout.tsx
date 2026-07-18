import type { ReactNode } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { getRequestLegalSite } from "@/lib/legal/request-site";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const site = await getRequestLegalSite();

  return <AuthShell site={site}>{children}</AuthShell>;
}
