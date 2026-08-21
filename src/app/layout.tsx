import type { Metadata, Viewport } from "next";
import MotionPreferenceProvider from "@/components/motion/MotionPreferenceProvider";
import JsonLd from "@/components/seo/JsonLd";
import AnalyticsConsent from "@/components/privacy/AnalyticsConsent";
import { fontVariableClasses } from "@/lib/fonts";
import { MOTION_PREFERENCE_BOOTSTRAP_SCRIPT } from "@/lib/motion";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { buildSiteStructuredData } from "@/lib/structured-data";
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="motion-preference-bootstrap"
          dangerouslySetInnerHTML={{ __html: MOTION_PREFERENCE_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className={`${fontVariableClasses} antialiased`}>
        <JsonLd data={buildSiteStructuredData()} />
        <MotionPreferenceProvider>
          {children}
          <AnalyticsConsent />
        </MotionPreferenceProvider>
      </body>
    </html>
  );
}
