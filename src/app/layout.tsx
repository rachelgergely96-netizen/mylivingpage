import type { Metadata, Viewport } from "next";
import JsonLd from "@/components/seo/JsonLd";
import AnalyticsConsent from "@/components/privacy/AnalyticsConsent";
import { fontVariableClasses } from "@/lib/fonts";
import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#060e1c",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${getAbsoluteUrl("/")}#organization`,
    name: SITE_NAME,
    url: getAbsoluteUrl("/"),
    description: SITE_DESCRIPTION,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${getAbsoluteUrl("/")}#website`,
    name: SITE_NAME,
    url: getAbsoluteUrl("/"),
    description: SITE_DESCRIPTION,
    publisher: {
      "@id": `${getAbsoluteUrl("/")}#organization`,
    },
  };

  return (
    <html lang="en">
      <body className={`${fontVariableClasses} antialiased`}>
        <JsonLd data={[organizationJsonLd, websiteJsonLd]} />
        {children}
        <AnalyticsConsent />
      </body>
    </html>
  );
}
