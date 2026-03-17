import type { DemoPage } from "@/lib/demo-data";
import { DEMO_PAGES } from "@/lib/demo-data";
import { PRO_PLAN_PRICE } from "@/lib/billing";

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

export interface SearchOperatorExample {
  operator: string;
  example: string;
  guidance: string;
}

export interface HiringWorkflowStep {
  stage: string;
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
}

export interface ProofSignal {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

export interface TrustSignal {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

export interface LandingFaq {
  question: string;
  answer: string;
}

export interface DemoHighlight {
  title: string;
  body: string;
}

export interface ResolvedMarketingSample extends MarketingSample {
  demo: DemoPage;
}

export const CREDIBILITY_POINTS = [
  "Start with your current resume",
  "One page link stays current",
];

export const CLICK_MOMENT_DEMO_HIGHLIGHTS: DemoHighlight[] = [
  {
    title: "Headline lands immediately",
    body: "A recruiter sees your role, proof points, and links without opening another dense attachment tab.",
  },
  {
    title: "The right context is already visible",
    body: "Projects, credibility, and contact paths are already on the page when someone decides whether to reach out.",
  },
  {
    title: "One link stays current",
    body: "Instead of resending new PDFs every week, you update one page and keep sharing the same URL.",
  },
];

export const HIRING_WORKFLOW_STEPS: HiringWorkflowStep[] = [
  {
    stage: "ATS extraction",
    title: "Your resume still has to extract clean text.",
    body: "If the parser cannot read the file, you never make it into the searchable pile.",
    href: "/guides/ats-resume-test?ref=landing_workflow_readability",
    ctaLabel: "Run the ATS test",
  },
  {
    stage: "Recruiter search",
    title: "Recruiters usually search exact titles and explicit skills.",
    body: "If your resume implies the skill but never names it, the search can miss you before a person reviews anything else.",
    href: "/guides/recruiter-search-keywords?ref=landing_workflow_keywords",
    ctaLabel: "See keyword guide",
  },
  {
    stage: "Human click",
    title: "MyLivingPage takes over after someone opens your link.",
    body: "Keep the ATS-safe resume for applications, then give the recruiter or hiring manager a faster page to scan once they click.",
    href: "/examples?ref=landing_workflow_examples",
    ctaLabel: "See example pages",
  },
];

export const PROOF_SIGNALS: ProofSignal[] = [
  {
    title: "Competition is the default",
    body: "Popular roles can pull in hundreds of applicants before a recruiter opens the first file.",
    href: "/guides/recruiter-search-keywords?ref=landing_proof_competition",
    linkLabel: "Why exact language matters",
  },
  {
    title: "Readable files still fail",
    body: "A polished PDF can still break during extraction, which is why the copy-paste check comes first.",
    href: "/guides/ats-resume-test?ref=landing_proof_readability",
    linkLabel: "See the 30-second test",
  },
  {
    title: "Tailoring creates lift",
    body: "Small, specific alignment changes usually outperform generic applications in crowded funnels.",
    href: "/guides/recruiter-search-keywords?ref=landing_proof_tailoring",
    linkLabel: "See how to align honestly",
  },
];

export const TRUST_SIGNALS: TrustSignal[] = [
  {
    title: "Your resume stays intact",
    body: "MyLivingPage is a companion after the click, not a replacement for the file you already submit through ATS portals.",
    href: "/guides/living-page-vs-pdf-resume",
    linkLabel: "See how both work together",
  },
  {
    title: "You choose when a page goes live",
    body: "Build and preview first, then publish only when you are ready to share the link with recruiters, hiring managers, or referrals.",
    href: "/signup?ref=landing_trust_publish&next=/create",
    linkLabel: "Start with a private build",
  },
  {
    title: "Delete your page or account anytime",
    body: "Removal instructions are published and easy to find before you ever sign up or share a page.",
    href: "/delete-account",
    linkLabel: "Review deletion options",
  },
  {
    title: "Privacy and security details are published",
    body: "Policies, security commitments, and data-handling details are available publicly before you trust us with your information.",
    href: "/security",
    linkLabel: "Read the security page",
  },
];

export const LANDING_FAQS: LandingFaq[] = [
  {
    question: "Will this replace my resume?",
    answer:
      "No. Keep the resume you already use for applications and ATS portals. MyLivingPage is for the moment after a person clicks your name and wants faster context.",
  },
  {
    question: "Will my page look professional enough?",
    answer:
      "Yes. The product is designed to feel polished without asking you to redesign your career story from scratch. You start from the resume you already use and shape it into a cleaner reading experience.",
  },
  {
    question: "What happens to my data?",
    answer:
      "Your legal, privacy, and security details are published before signup. You control what gets published, and you can review deletion options publicly at any time.",
  },
  {
    question: "Can I delete my page anytime?",
    answer:
      "Yes. You can remove your page or delete your account, and the public deletion policy is linked on the site before you sign up.",
  },
  {
    question: "Is it actually free?",
    answer:
      "Yes. The free tier gives you one public page, core themes, and the main workflow. Upgrade later only if you want premium themes, share cards, or analytics.",
  },
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
    title: "Keep one link and export fresh assets",
    body: "Keep using the same page link everywhere a person can click, and upgrade later if you want QR-ready share cards and other premium presentation extras from the same source.",
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
    livingPage: "Update one page, keep sharing the same URL, and create fresh sendable assets from the same source when you need them.",
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
    "Keep one page link current",
    "Start free with no credit card",
  ],
  pro: [
    "Unlock premium themes built for creative, technical, and leadership roles",
    "Download a PNG share card for outreach and follow-ups",
    "See page analytics",
    "Remove the MyLivingPage badge",
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
    id: "after-you-apply",
    title: "After you apply",
    description: "Use the ATS-safe resume for the portal, then send one page that helps a human understand you faster in follow-up.",
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

export const MARKETING_SAMPLES: MarketingSample[] = [
  {
    id: "laid-off-tech",
    groupId: "when-a-recruiter-clicks",
    audienceLabel: "Recruiter follow-up",
    roleLabel: "Software engineer re-entering the market",
    bestUsedAfter: "You have already applied or a recruiter asked for more context than the resume gave them.",
    humanBenefit: "It turns scattered links, proof points, and recent momentum into one surface that feels current right away.",
    resumeBoundary: "Keep the resume for ATS portals and exact keyword matching. Use the page once a person wants faster context.",
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
    resumeBoundary: "Keep the resume for application systems. Use the page for people who can click before they request the file.",
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
    resumeBoundary: "Keep the resume for the application itself. Use the page once credibility and clarity matter more than parser rules.",
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
    resumeBoundary: "Keep the resume for submissions and record-keeping. Use the page when the next step depends on speed of comprehension.",
    sampleBadge: "Sample page",
    ctaRef: "landing_recruiter_click_finance",
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
