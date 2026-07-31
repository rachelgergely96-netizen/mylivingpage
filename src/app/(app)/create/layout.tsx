import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your page",
};

export default function CreateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
