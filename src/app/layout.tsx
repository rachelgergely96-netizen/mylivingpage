import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import Script from "next/script";
import JsonLd from "@/components/seo/JsonLd";
import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

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
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-H46XPWEWEC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-H46XPWEWEC');
          `}
        </Script>
      </head>
      <body className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} antialiased`}>
        <JsonLd data={[organizationJsonLd, websiteJsonLd]} />
        {children}
      </body>
    </html>
  );
}
