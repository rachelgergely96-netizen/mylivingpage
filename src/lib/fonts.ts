import { DM_Mono, DM_Sans } from "next/font/google";

// Shared next/font instances so the root layout and the root-replacing
// global-error boundary load identical faces. Weight 800 stays only for the
// homepage hero rules in LivingHomepagePrototype.module.css.
export const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const fontVariableClasses = `${dmSans.variable} ${dmMono.variable}`;
