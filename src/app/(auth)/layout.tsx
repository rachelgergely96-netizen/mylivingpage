import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { getRequestLegalSite } from "@/lib/legal/request-site";

// Auth forms are thin, duplicative, parameter-heavy URLs with no search value;
// keep them out of the index (covers login/signup/forgot-password/reset-password).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const site = await getRequestLegalSite();

  return <AuthShell site={site}>{children}</AuthShell>;
}
