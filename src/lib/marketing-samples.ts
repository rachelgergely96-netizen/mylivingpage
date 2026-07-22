import type { DemoPage } from "@/lib/demo-data";
import { DEMO_PAGES } from "@/lib/demo-data";

export interface MarketingSample {
  id: string;
  groupId: string;
  audienceLabel: string;
  roleLabel: string;
  bestUsedAfter: string;
  humanBenefit: string;
  resumeBoundary: string;
  sampleBadge: string;
  ctaRef: string;
  demoIndex: number;
}

export interface MarketingSampleGroup {
  id: string;
  title: string;
  description: string;
}

export interface ResolvedMarketingSample extends MarketingSample {
  demo: DemoPage;
}

export const ATS_READINESS_DISCLOSURE =
  "Built for ATS readability with real text, standard sections, and a clear reading order. The free readiness check flags common issues, but no checker can guarantee how an employer's system will score a resume or whether it will lead to an interview.";

export const FREE_PRODUCT_FEATURE_GROUPS = [
  {
    name: "Living Resume",
    eyebrow: "One link, always current",
    body: "Publish one polished page at your personal URL and update it whenever your experience changes.",
    features: [
      "One public living resume",
      "A reusable personal link",
      "Polished, mobile-ready themes",
    ],
  },
  {
    name: "ATS-Ready PDF",
    eyebrow: "A clean file when you need one",
    body: "Download a straightforward resume with real text, standard sections, and a clear reading order.",
    features: [
      "Selectable, machine-readable text",
      "Standard resume sections",
      "Deterministic ATS readiness check",
      "A fresh PDF from your saved information",
    ],
  },
  {
    name: "Share Card + QR",
    eyebrow: "Built to share anywhere",
    body: "Create a personalized visual card that sends people directly to your living resume.",
    features: [
      "Downloadable PNG share card",
      "QR code linked to your page",
      "Copyable link and page-view count",
    ],
  },
] as const;

const MARKETING_SAMPLE_GROUPS: MarketingSampleGroup[] = [
  {
    id: "after-you-apply",
    title: "After you apply",
    description: "Use one Living Page and one Resume PDF from the same source so follow-up stays clear and consistent.",
  },
  {
    id: "when-a-recruiter-clicks",
    title: "When a recruiter clicks",
    description: "The search already worked. These pages help the next human decision happen faster.",
  },
  {
    id: "when-a-referral-asks",
    title: "When a referral asks for your link",
    description: "Networking and warm intros move faster when you can send one page instead of another attachment.",
  },
];

const MARKETING_SAMPLES: MarketingSample[] = [
  {
    id: "laid-off-tech",
    groupId: "when-a-recruiter-clicks",
    audienceLabel: "Recruiter follow-up",
    roleLabel: "Software engineer re-entering the market",
    bestUsedAfter: "You have already applied or a recruiter asked for more context than the resume gave them.",
    humanBenefit: "It turns scattered links, proof points, and recent momentum into one surface that feels current right away.",
    resumeBoundary: "Use the PDF when a file is requested. Use the page once a person wants faster context.",
    sampleBadge: "Sample page",
    ctaRef: "landing_recruiter_click_engineer",
    demoIndex: 0,
  },
  {
    id: "career-switching-designer",
    groupId: "when-a-referral-asks",
    audienceLabel: "Warm intro",
    roleLabel: "Designer moving into a new in-house role",
    bestUsedAfter: "A referral, portfolio contact, or hiring manager asks for a link that explains your pivot quickly.",
    humanBenefit: "It keeps the personality of a portfolio while still presenting your experience like a serious hiring asset.",
    resumeBoundary: "Use the PDF when someone asks for a file. Use the page for people who can click before they request it.",
    sampleBadge: "Sample page",
    ctaRef: "landing_referral_designer",
    demoIndex: 1,
  },
  {
    id: "early-career-attorney",
    groupId: "after-you-apply",
    audienceLabel: "Application follow-up",
    roleLabel: "Attorney who needs polish fast",
    bestUsedAfter: "You submitted the application and need a cleaner follow-up asset for emails, bios, or recruiter outreach.",
    humanBenefit: "It keeps a formal tone while giving your credentials, writing, and case work more context than a one-page resume.",
    resumeBoundary: "Use the PDF for formal submissions. Use the page once credibility and clarity matter more than attachment friction.",
    sampleBadge: "Sample page",
    ctaRef: "landing_after_apply_attorney",
    demoIndex: 3,
  },
  {
    id: "senior-finance-search",
    groupId: "when-a-recruiter-clicks",
    audienceLabel: "Executive click",
    roleLabel: "Finance leader exploring new roles",
    bestUsedAfter: "A recruiter or senior contact has your resume and now wants a faster way to scan the headline, metrics, and positioning.",
    humanBenefit: "It lets high-stakes experience and proof points land faster than a document someone may never open closely.",
    resumeBoundary: "Use the PDF for submissions and record-keeping. Use the page when the next step depends on speed of comprehension.",
    sampleBadge: "Sample page",
    ctaRef: "landing_recruiter_click_finance",
    demoIndex: 2,
  },
];

function getMarketingSamples(): ResolvedMarketingSample[] {
  return MARKETING_SAMPLES.map((sample) => ({
    ...sample,
    demo: DEMO_PAGES[sample.demoIndex],
  }));
}

export function getMarketingSampleGroups(): Array<MarketingSampleGroup & { samples: ResolvedMarketingSample[] }> {
  const samples = getMarketingSamples();

  return MARKETING_SAMPLE_GROUPS.map((group) => ({
    ...group,
    samples: samples.filter((sample) => sample.groupId === group.id),
  }));
}
