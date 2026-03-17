export interface ResumeData {
  name: string;
  headline: string;
  location: string;
  email: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  avatar_url: string | null;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    dates: string;
    highlights: string[];
    url: string | null;
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    tech: string[];
    url: string | null;
  }>;
  skills: Array<{
    category: string;
    items: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string | null;
    date: string | null;
  }>;
  stats: Array<{ value: string; label: string }>;
}

export type AtsIssueCategory =
  | "machine_readability"
  | "recruiter_searchability"
  | "one_page_pdf";

export type AtsIssueSeverity = "info" | "warning" | "critical";

export interface AtsTargeting {
  primaryTitle: string;
  titleVariants: string[];
  jobDescription: string;
  lastExtractedKeywords: string[];
}

export interface AtsIssue {
  id: string;
  category: AtsIssueCategory;
  severity: AtsIssueSeverity;
  title: string;
  description: string;
  field?: keyof ResumeData | "targeting";
  suggestedFix?: string;
}

export interface AtsSuggestion {
  id: string;
  category: AtsIssueCategory;
  title: string;
  description: string;
  applyLabel: string;
  preview?: string;
  expectedIssueIds: string[];
  expectedScoreDimensions: AtsScoreDimension[];
  applyData: Partial<ResumeData>;
  source?: "rules" | "ai";
}

export type AtsProposalGroup =
  | "contact"
  | "headline"
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications";

export interface AtsProposalSection {
  id: string;
  group: AtsProposalGroup;
  title: string;
  reason: string;
  beforeText: string;
  afterText: string;
  applyData: Partial<ResumeData>;
  expectedIssueIds: string[];
  expectedScoreDimensions: AtsScoreDimension[];
  source: "rules" | "ai";
}

export interface AtsProposalDecision {
  acceptedProposalIds: string[];
  declinedProposalIds: string[];
  lastDecisionAt: string | null;
}

export interface AtsChangeSummaryItem {
  id: string;
  title: string;
  description: string;
  category: AtsIssueCategory;
}

export interface AtsExportCheck {
  pageCount: number;
  fitsOnOnePage: boolean;
  overflowReasons: string[];
  recommendedFixes: string[];
}

export interface AtsScoreBreakdown {
  machineReadability: number;
  recruiterSearchability: number;
  onePagePdf: number;
  overall: number;
}

export type AtsScoreDimension = Exclude<keyof AtsScoreBreakdown, "overall">;
export type AtsReviewMode = "full" | "fast";
export type AtsReviewStatus = "ready" | "needs_attention";

export interface AtsReviewSnapshot {
  targeting: AtsTargeting;
  score: AtsScoreBreakdown;
  issues: AtsIssue[];
  suggestions: AtsSuggestion[];
  proposals: AtsProposalSection[];
  appliedSuggestionIds: string[];
  proposalDecision: AtsProposalDecision;
  exportCheck: AtsExportCheck;
  candidateResumeData: ResumeData | null;
  candidateExportCheck: AtsExportCheck | null;
  changeSummary: AtsChangeSummaryItem[];
  status: AtsReviewStatus;
  lastReviewedAt: string;
  contentHash: string;
  mode: AtsReviewMode;
  source: "rules" | "rules+ai";
  approvedResumeData?: ResumeData | null;
  approvedExportCheck?: AtsExportCheck | null;
  approvedAt?: string | null;
  approvedContentHash?: string | null;
  approvedSourceFingerprint?: string | null;
  availabilityReason?: string | null;
}

export type AtsSuggestionFeedbackState = "applying" | "confirmed" | "still_needs_work";

export interface AtsSuggestionFeedback {
  suggestion: AtsSuggestion;
  state: AtsSuggestionFeedbackState;
  expectedIssueLabels: string[];
  confirmedIssueLabels: string[];
  remainingIssueLabels: string[];
  improvedScoreDimensions: AtsScoreDimension[];
  baselineScore: AtsScoreBreakdown;
}

export interface PageConfig {
  ats?: AtsReviewSnapshot | null;
  [key: string]: unknown;
}

export interface PageRecord {
  id: string;
  user_id?: string;
  owner_id?: string;
  slug: string;
  status?: "draft" | "live" | "archived";
  visibility?: "private" | "link" | "public";
  title?: string;
  theme_id: string;
  resume_data: ResumeData;
  raw_resume: string | null;
  portfolio_url: string | null;
  page_config: PageConfig | null;
  views: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
