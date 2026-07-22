import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account | MyLivingPage",
  alternates: { canonical: "/signup" },
};

export default function SignupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
