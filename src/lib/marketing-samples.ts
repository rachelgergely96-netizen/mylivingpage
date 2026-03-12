import type { DemoPage } from "@/lib/demo-data";
import { DEMO_PAGES } from "@/lib/demo-data";
import { PRO_PLAN_PRICE } from "@/lib/billing";

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

export interface SearchOperatorExample {
  operator: string;
  example: string;
  guidance: string;
}

export interface ResolvedMarketingSample extends MarketingSample {
  demo: DemoPage;
}

export const CREDIBILITY_POINTS = [
  "Keep your ATS-safe resume",
  "Personal page URL",
  "Start from current resume text",
  "No design skills",
];

export const PROCESS_STEPS = [
  {
    title: "Start with resume text that already works",
    body: "Paste the resume you already use for applications and keep the clean structure that ATS systems need.",
  },
  {
    title: "Turn it into a living page",
    body: "Choose a theme and shape the same experience into a page recruiters and hiring managers can scan quickly.",
  },
  {
    title: "Send one link after the click",
    body: "Keep your ATS-safe resume attached when required, then use the same page in outreach, referrals, LinkedIn, and follow-ups.",
  },
];

export const COMPARISON_ROWS = [
  {
    label: "How you get surfaced",
    resume: "Needs clean extraction, exact titles, and explicit keywords to appear in recruiter searches.",
    livingPage: "Gives someone instant context once they open your link after the search result or email.",
  },
  {
    label: "What happens after the click",
    resume: "Often opens as a download tab or dense document that takes work to scan.",
    livingPage: "Presents your story, links, and proof in a format built for quick understanding.",
  },
  {
    label: "How you keep it current",
    resume: "Create and resend a new file whenever something changes.",
    livingPage: "Update one page and keep sharing the same URL everywhere your search goes.",
  },
  {
    label: "Where it helps",
    resume: "Mostly inside applications that require attachments.",
    livingPage: "Works in networking, referrals, LinkedIn, follow-ups, and any moment a human can click.",
  },
];

export const PRICING_REASSURANCE = {
  free: [
    "One living page",
    "Core themes and guided setup from your current resume",
    "Public page URL",
    "Start free with no credit card",
  ],
  pro: [
    "Unlock premium themes built for creative, technical, and leadership roles",
    "Download a polished PDF from your page",
    "Download a PNG share card for outreach and follow-ups",
    "See page analytics and remove the MyLivingPage badge",
    `Upgrade anytime for ${PRO_PLAN_PRICE.displayLabel}`,
  ],
};

export const READABILITY_TEST_STEPS = [
  "Open your resume PDF and highlight a few lines with your mouse.",
  "Copy that text and paste it into Notepad or TextEdit.",
  "If the pasted text breaks, fix the resume before you send it anywhere.",
];

export const READABILITY_FAILURE_SIGNALS = [
  "Sections disappear even though they looked fine visually.",
  "Bullets turn into question marks or odd symbols.",
  "Words run together without normal spacing.",
  "Random characters replace clean text.",
];

export const SEARCH_OPERATOR_EXAMPLES: SearchOperatorExample[] = [
  {
    operator: "AND",
    example: '"Product Manager" AND "SQL"',
    guidance: "Use exact titles and explicit skill names, not only implied concepts.",
  },
  {
    operator: "OR",
    example: '"Product Manager" OR "Product Owner"',
    guidance: "Include relevant title variations when they honestly match the work you have done.",
  },
  {
    operator: "NOT",
    example: '"Engineer" NOT "Intern"',
    guidance: "Be deliberate about how level words appear, because they can affect which searches include you.",
  },
];

export const SEARCH_VISIBILITY_CHECKLIST = [
  "Use the exact target title in your headline when it genuinely fits.",
  "Mention critical skills explicitly, not just conceptually.",
  "Add a small set of relevant title variations in your summary when helpful.",
  'Use both full and abbreviated forms, such as "User Experience (UX)."',
];

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
