import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your password | MyLivingPage",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
