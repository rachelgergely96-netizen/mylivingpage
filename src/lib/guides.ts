export const GUIDE_AUTHOR_NAME = "MyLivingPage Editorial Team";
export const GUIDE_PUBLISHED_AT = "2026-03-12";
export const GUIDE_UPDATED_AT = "2026-03-20";

export type GuideSlug =
  | "resume-pdf-check"
  | "recruiter-search-keywords"
  | "living-page-vs-pdf-resume";

export interface GuideSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface GuideEntry {
  slug: GuideSlug;
  title: string;
  description: string;
  decisionStage: string;
  answer: string;
  summary: string;
  hubSummary: string;
  readTime: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  sections: GuideSection[];
  related: GuideSlug[];
}

export const GUIDES: GuideEntry[] = [
  {
    slug: "resume-pdf-check",
    title: "Résumé PDF check: how to make sure your PDF reads cleanly",
    description:
      "Run a quick Résumé PDF check to confirm your file copies clean text and is ready to share.",
    decisionStage: "Before you send it",
    answer:
      "Open the PDF, highlight a few lines, copy them into plain text, and compare the result. If sections disappear, bullets break, or spacing collapses, fix the file before you send it.",
    summary:
      "Use this guide when your PDF looks polished visually but you want to confirm the text layer still behaves cleanly.",
    hubSummary:
      "Use a quick copy-and-paste check to catch broken text extraction before your PDF gets shared more widely.",
    readTime: "4 min read",
    author: GUIDE_AUTHOR_NAME,
    publishedAt: GUIDE_PUBLISHED_AT,
    updatedAt: GUIDE_UPDATED_AT,
    sections: [
      {
        title: "What does a quick Résumé PDF check catch?",
        paragraphs: [
          "The fastest way to spot extraction problems is to copy text out of the PDF and paste it into Notepad or TextEdit. What matters is whether the machine-readable layer matches what you thought you sent.",
          "This catches hidden failures before you spend another week assuming the issue is your experience instead of the file itself.",
        ],
        bullets: [
          "Missing sections that were visible in the PDF",
          "Bullets turning into question marks or odd symbols",
          "Text running together without normal spacing",
          "Custom fonts or layouts producing garbled characters",
        ],
      },
      {
        title: "Why should the PDF read cleanly before you share it?",
        paragraphs: [
          "A clean PDF is the floor, not the extra credit. If the copied text is broken, the file becomes harder to reuse, review, or search later.",
          "That is why the safest workflow starts with the information you already have, checks the PDF, and only then worries about sharpening titles, links, and positioning.",
        ],
      },
      {
        title: "What should you do after the Résumé PDF check passes?",
        paragraphs: [
          "Start with the information you already use, publish a Living Page that is easier to scan, and keep one link everywhere a recruiter or hiring manager can click.",
          "From the same saved content, you can also create a fresh Résumé PDF and a PNG share card with a QR code that opens your page directly.",
        ],
      },
    ],
    related: ["recruiter-search-keywords", "living-page-vs-pdf-resume"],
  },
  {
    slug: "recruiter-search-keywords",
    title: "Recruiter search keywords: how exact titles and skills affect visibility",
    description:
      "Learn how exact job titles, explicit skill names, and title variations affect whether a recruiter ever sees your profile in search.",
    decisionStage: "Get found in search",
    answer:
      "Recruiters often search with exact titles and exact skill strings. If your résumé implies a concept but never names it, you can be invisible to the search before a person reviews the rest.",
    summary:
      "Use this guide when you need your résumé to match recruiter search behavior more directly without stuffing it with random keywords.",
    hubSummary:
      "Exact titles, explicit skills, and honest title variations matter more than vague concepts when recruiters search for people.",
    readTime: "5 min read",
    author: GUIDE_AUTHOR_NAME,
    publishedAt: GUIDE_PUBLISHED_AT,
    updatedAt: GUIDE_UPDATED_AT,
    sections: [
      {
        title: "How do recruiters search for titles and skills?",
        paragraphs: [
          "Search systems reward explicit matches. If the job is looking for Product Manager and your background supports that title, saying Product Lead only may reduce visibility.",
          "The practical rule is simple: match the real job language when it is truthful, then explain the nuance in the bullets.",
        ],
      },
      {
        title: "Which keyword variations should your résumé include?",
        paragraphs: [
          "Recruiters search for presence first. They need to see the exact term, not just a nearby idea.",
          "That is why it helps to use natural sentences that include the full phrase and the shorthand when relevant.",
        ],
        bullets: [
          "List critical skills explicitly, not only conceptually",
          "Use full and abbreviated forms like User Experience (UX)",
          "Include a small set of relevant title variations when they are true",
        ],
      },
      {
        title: "What should happen after the recruiter finds you?",
        paragraphs: [
          "Once the recruiter finds your résumé, the Living Page gives them a faster surface to scan than another dense attachment.",
          "You can keep the same link everywhere, then use Résumé PDF download and a QR-ready share card when you need something portable for follow-up or in-person conversations.",
        ],
      },
    ],
    related: ["resume-pdf-check", "living-page-vs-pdf-resume"],
  },
  {
    slug: "living-page-vs-pdf-resume",
    title: "Living Page vs PDF résumé: when job seekers should use each one",
    description:
      "Use a Résumé PDF when you need a file, use a Living Page when you want something easier to scan, and keep both generated from the same source.",
    decisionStage: "After the click",
    answer:
      "Use both. Keep the PDF for moments that require a document, then use a Living Page when you need something faster to scan, easier to share, and easier to keep current.",
    summary:
      "Use this guide when you want a practical workflow for attachments, page links, PDF exports, and share cards without managing five different versions of your story.",
    hubSummary:
      "Use the PDF when a file is required, use the page when a person can click, and keep one shared source for both.",
    readTime: "4 min read",
    author: GUIDE_AUTHOR_NAME,
    publishedAt: GUIDE_PUBLISHED_AT,
    updatedAt: GUIDE_UPDATED_AT,
    sections: [
      {
        title: "Should you start with the information you already use?",
        paragraphs: [
          "You do not need a redesign project before you publish anything. The fastest path is to start with the information you already send and turn that into a cleaner public page.",
          "That keeps your story consistent while reducing how often you rebuild it from scratch.",
        ],
      },
      {
        title: "Why is a Living Page easier to scan than a PDF?",
        paragraphs: [
          "The Living Page helps recruiters and hiring managers understand your experience faster because the information is already visible, linked, and easier to move through than a static download tab.",
          "That matters most in networking, referrals, LinkedIn, follow-ups, and any situation where a person can click before they ask for the attachment.",
        ],
      },
      {
        title: "Can one source create your sendable assets?",
        paragraphs: [
          "From the information you upload, you can create a new Résumé PDF ready to send in a cleaner one-column format.",
          "You can also generate a PNG share card with a QR code that leads straight to your page, which is useful for follow-up emails, events, and quick mobile sharing.",
        ],
      },
      {
        title: "Why keep the same page link everywhere someone can click?",
        paragraphs: [
          "A stable link reduces version drift across outreach, referrals, and profile links. Instead of scattering stale attachments, you keep one page current and update it in place.",
          "That way the page, Résumé PDF, and share card all stay aligned to the same saved story.",
        ],
      },
    ],
    related: ["resume-pdf-check", "recruiter-search-keywords"],
  },
];

export type Guide = GuideEntry;

export function getGuide(slug: string): GuideEntry | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
