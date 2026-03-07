import type { DemoPage } from "@/lib/demo-data";
import { DEMO_PAGES } from "@/lib/demo-data";

export interface MarketingSample {
  id: string;
  groupId: string;
  audienceLabel: string;
  roleLabel: string;
  searchMoment: string;
  intendedUse: string;
  whyItWorks: string;
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

export const CREDIBILITY_POINTS = [
  "Live in minutes",
  "Own your URL",
  "Keep your PDF",
  "Free to start",
  "No design skills",
];

export const PROCESS_STEPS = [
  {
    title: "Paste your current resume",
    body: "Start with what you already have. No redesign or formatting marathon required.",
  },
  {
    title: "Choose a living theme",
    body: "Pick a visual direction that feels like you without touching code or layout tools.",
  },
  {
    title: "Publish one link",
    body: "Share the same page in outreach, referrals, LinkedIn, and follow-up emails while keeping your PDF for ATS systems.",
  },
];

export const COMPARISON_ROWS = [
  {
    label: "How you update it",
    resume: "Create a new PDF every time something changes.",
    livingPage: "Edit once and keep sharing the same link.",
  },
  {
    label: "What someone sees first",
    resume: "A download tab and a dense document.",
    livingPage: "A page with your story, links, and work already live.",
  },
  {
    label: "Where it works",
    resume: "Mostly as an attachment.",
    livingPage: "In applications, outreach, referrals, and your LinkedIn profile.",
  },
  {
    label: "What you own",
    resume: "Another file in somebody else's inbox.",
    livingPage: "A professional URL that stays current as your search moves.",
  },
];

export const PRICING_REASSURANCE = {
  free: [
    "One living page",
    "Core themes and AI resume structuring",
    "Public page URL",
    "Start free with no credit card",
  ],
  pro: [
    "More premium themes",
    "PDF export and share card downloads",
    "Remove the badge",
    "Upgrade only when you need more polish",
  ],
};

export const MARKETING_SAMPLE_GROUPS: MarketingSampleGroup[] = [
  {
    id: "searching-after-a-change",
    title: "Searching after a change",
    description: "Pages for layoffs, pivots, and moments when your old resume no longer feels current.",
  },
  {
    id: "credibility-first",
    title: "Credibility first",
    description: "Pages for roles where polish, trust, and a fast first impression matter immediately.",
  },
];

export const MARKETING_SAMPLES: MarketingSample[] = [
  {
    id: "laid-off-tech",
    groupId: "searching-after-a-change",
    audienceLabel: "Layoff recovery",
    roleLabel: "Software engineer re-entering the market",
    searchMoment: "You were laid off and your resume still looks like the version you sent last year.",
    intendedUse: "Best for recruiter outreach, LinkedIn featured links, and warm intros.",
    whyItWorks: "It turns scattered achievements, links, and credibility signals into one page that feels current right away.",
    sampleBadge: "Sample page",
    ctaRef: "landing_sample_laid_off_tech",
    demoIndex: 0,
  },
  {
    id: "career-switching-designer",
    groupId: "searching-after-a-change",
    audienceLabel: "Career pivot",
    roleLabel: "Designer moving into a new in-house role",
    searchMoment: "You need something more personal than a resume but more professional than a link-in-bio.",
    intendedUse: "Best for portfolio outreach, hiring manager follow-up, and networking.",
    whyItWorks: "It keeps the visual personality of a portfolio while still explaining your experience like a serious application asset.",
    sampleBadge: "Sample page",
    ctaRef: "landing_sample_career_switching_designer",
    demoIndex: 1,
  },
  {
    id: "early-career-attorney",
    groupId: "credibility-first",
    audienceLabel: "Early-career law",
    roleLabel: "Attorney who needs polish fast",
    searchMoment: "You need to look credible, precise, and memorable without getting gimmicky.",
    intendedUse: "Best for applications, networking emails, and professional bio links.",
    whyItWorks: "It keeps a formal tone while giving your writing, credentials, and case work more context than a one-page resume.",
    sampleBadge: "Sample page",
    ctaRef: "landing_sample_early_career_attorney",
    demoIndex: 3,
  },
  {
    id: "senior-finance-search",
    groupId: "credibility-first",
    audienceLabel: "Experienced leadership",
    roleLabel: "Finance leader exploring new roles",
    searchMoment: "You need a sharper first impression than another executive resume attachment.",
    intendedUse: "Best for recruiter packets, investor-facing intros, and senior-role conversations.",
    whyItWorks: "It lets high-stakes experience, metrics, and positioning land faster than a document someone may never open.",
    sampleBadge: "Sample page",
    ctaRef: "landing_sample_senior_finance_search",
    demoIndex: 2,
  },
];

export function getMarketingSamples(): ResolvedMarketingSample[] {
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
