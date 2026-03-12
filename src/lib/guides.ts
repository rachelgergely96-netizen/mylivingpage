export const GUIDE_AUTHOR_NAME = "MyLivingPage Editorial Team";
export const GUIDE_PUBLISHED_AT = "2026-03-12";
export const GUIDE_UPDATED_AT = "2026-03-12";

export type GuideSlug =
  | "ats-resume-test"
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
    slug: "ats-resume-test",
    title: "ATS Resume Test: How to Check If Your Resume Is Readable",
    description:
      "Run a 30-second ATS resume test to see whether your PDF extracts clean text and what to fix before you apply.",
    answer:
      "Open the PDF, highlight a few lines, copy them into plain text, and compare the result. If sections disappear, bullets break, or spacing collapses, fix the resume before you apply.",
    summary:
      "Use this guide when you suspect your PDF looks polished but may be unreadable to the systems that parse it first.",
    hubSummary:
      "Use a quick copy-and-paste test to catch broken text extraction before a recruiter search ever has a chance to find you.",
    readTime: "4 min read",
    author: GUIDE_AUTHOR_NAME,
    publishedAt: GUIDE_PUBLISHED_AT,
    updatedAt: GUIDE_UPDATED_AT,
    sections: [
      {
        title: "What does the 30-second ATS resume test catch?",
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
        title: "Why does readability come before keywords?",
        paragraphs: [
          "Keyword strategy cannot help if the parser cannot see the words in the first place. A readable resume is the floor, not the extra credit.",
          "That is why the safest workflow starts with the resume you already use, checks readability, and only then worries about exact title and skill coverage.",
        ],
      },
      {
        title: "What should you do after the ATS resume test passes?",
        paragraphs: [
          "Start with the resume you already use, publish a page that is easier to scan, and keep one link everywhere a recruiter or hiring manager can click.",
          "From the same structured information, you can also create a fresh, search-friendly PDF resume and a PNG share card with a QR code that opens your page directly.",
        ],
      },
    ],
    related: ["recruiter-search-keywords", "living-page-vs-pdf-resume"],
  },
  {
    slug: "recruiter-search-keywords",
    title: "Recruiter Search Keywords: How Exact Titles and Skills Affect Visibility",
    description:
      "Learn how exact job titles, explicit skill names, and title variations affect whether a recruiter ever sees your resume in search.",
    answer:
      "Recruiters often search with exact titles and exact skill strings. If your resume implies a concept but never names it, you can be invisible to the search before a person reviews the rest.",
    summary:
      "Use this guide when you need your resume to match recruiter search behavior more directly without stuffing it with random keywords.",
    hubSummary:
      "Exact titles, explicit skills, and honest title variations matter more than vague concepts when recruiters search inside ATS tools.",
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
        title: "Which keyword variations should your resume include?",
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
          "Once the recruiter finds your resume, the living page gives them a faster surface to scan than another dense attachment.",
          "You can keep the same link everywhere, then use PDF export and a QR-ready share card when you need something portable for follow-up or in-person conversations.",
        ],
      },
    ],
    related: ["ats-resume-test", "living-page-vs-pdf-resume"],
  },
  {
    slug: "living-page-vs-pdf-resume",
    title: "Living Page vs PDF Resume: When Job Seekers Should Use Each One",
    description:
      "Use an ATS-safe resume for machine visibility and a living page for the human click, then create a fresh PDF and share card from the same source.",
    answer:
      "Use both. Keep the ATS-safe resume for applications that require a document, then use a living page when you need something faster to scan, easier to share, and easier to keep current.",
    summary:
      "Use this guide when you want a practical workflow for attachments, page links, PDF exports, and share cards without managing five different versions of your story.",
    hubSummary:
      "Use the resume for machine visibility, the page for the human click, and one shared source to keep your PDF and share assets current.",
    readTime: "4 min read",
    author: GUIDE_AUTHOR_NAME,
    publishedAt: GUIDE_PUBLISHED_AT,
    updatedAt: GUIDE_UPDATED_AT,
    sections: [
      {
        title: "Should you start with the resume you already use?",
        paragraphs: [
          "You do not need a redesign project before you publish anything. The fastest path is to start with the resume text you already send and turn that into a cleaner public page.",
          "That keeps the ATS-safe version intact while reducing how often you rebuild your story from scratch.",
        ],
      },
      {
        title: "Why is a living page easier to scan than a PDF?",
        paragraphs: [
          "The living page helps recruiters and hiring managers understand your experience faster because the information is already visible, linked, and easier to move through than a static download tab.",
          "That matters most in networking, referrals, LinkedIn, follow-ups, and any situation where a person can click before they ask for the attachment.",
        ],
      },
      {
        title: "Can one source create your sendable assets?",
        paragraphs: [
          "From the information you upload, you can create a new PDF ready to send in a cleaner, search-friendly resume format.",
          "You can also generate a PNG share card with a QR code that leads straight to your page, which is useful for follow-up emails, events, and quick mobile sharing.",
        ],
      },
      {
        title: "Why keep the same page link everywhere someone can click?",
        paragraphs: [
          "A stable link reduces version drift across outreach, referrals, and profile links. Instead of scattering stale attachments, you keep one page current and update it in place.",
          "That way the resume handles machine visibility, while the page, PDF export, and share card handle the human side of the job search.",
        ],
      },
    ],
    related: ["ats-resume-test", "recruiter-search-keywords"],
  },
];

export type Guide = GuideEntry;

export function getGuide(slug: string): GuideEntry | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
