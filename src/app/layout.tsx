import type { Metadata } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import JsonLd from "@/components/seo/JsonLd";
import AnalyticsConsent from "@/components/privacy/AnalyticsConsent";
import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} | ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
  },
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
      <body className={`${dmSans.variable} ${dmMono.variable} antialiased`}>
        <JsonLd data={[organizationJsonLd, websiteJsonLd]} />
        {children}
        <AnalyticsConsent />
      </body>
    </html>
  );
}
