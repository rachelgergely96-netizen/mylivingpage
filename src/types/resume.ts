export type ProofType =
  | "case_study"
  | "quantified_result"
  | "project_artifact"
  | "writing_sample"
  | "selected_win";

export interface ProofItem {
  id: string;
  type: ProofType;
  title: string;
  summary: string;
  outcome: string;
  url: string | null;
  source_label: string | null;
}

/**
 * Display state, not verification state.
 *
 * This once described a request-and-approve workflow that had no mechanism
 * behind it: no request was ever sent, nothing was ever confirmed with the
 * person quoted, and the owner marked their own quotes approved. The editor now
 * offers a plain "show this on my page" switch.
 *
 * The stored values are unchanged so existing pages show exactly what they
 * showed before. "requested" is legacy-only — it still reads as hidden, and
 * nothing writes it any more.
 */
export type TestimonialStatus = "draft" | "requested" | "approved";

export interface TestimonialRecord {
  id: string;
  name: string;
  role: string;
  company: string;
  relationship: string | null;
  quote: string;
  status: TestimonialStatus;
  requested_at: string | null;
  approved_at: string | null;
}

export type JobSeekerRoleTrack =
  | "general"
  | "engineering"
  | "product"
  | "marketing"
  | "sales"
  | "operations"
  | "other";

export type JobSeekerGoal =
  | "share_profile"
  | "land_interviews"
  | "strengthen_followups"
  | "turn_referrals"
  | "build_network"
  | "win_clients"
  | "book_speaking";

export type JobSeekerAudience =
  | "general_public"
  | "recruiter"
  | "hiring_manager"
  | "referral"
  | "clients"
  | "collaborators"
  | "event_organizers";

export interface JobSeekerProfile {
  role_track: JobSeekerRoleTrack;
  primary_goal: JobSeekerGoal;
  target_audience: JobSeekerAudience;
}

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
  proofs?: ProofItem[];
  testimonials?: TestimonialRecord[];
}

export interface PageVariant {
  id: string;
  slug: string;
  label: string;
  roleTitle: string;
  headline: string | null;
  summary: string | null;
  featuredStatLabels: string[];
  featuredProjectNames: string[];
  ctaEmphasis: string | null;
}

export type DecisionReadinessStatus = "ready" | "needs_attention";

export interface DecisionReadinessCheck {
  id: string;
  title: string;
  status: DecisionReadinessStatus;
  detail: string;
}

export interface DecisionReadinessSuggestion {
  id: string;
  title: string;
  detail: string;
}

export interface DecisionReadinessState {
  overallStatus: DecisionReadinessStatus;
  readyCount: number;
  totalChecks: number;
  summary: string;
  checks: DecisionReadinessCheck[];
  suggestions: DecisionReadinessSuggestion[];
  lastEvaluatedAt: string;
}

export type AtsIssueCategory =
  | "machine_readability"
  | "recruiter_searchability"
  | "one_page_pdf";

export type AtsIssueSeverity = "info" | "warning" | "critical";

/**
 * Per-evaluation input to the review engine. Holds one job description because
 * one evaluation compares against one role.
 */
export interface AtsTargeting {
  primaryTitle: string;
  titleVariants: string[];
  jobDescription: string;
  lastExtractedKeywords: string[];
}

/**
 * A role the owner saved to check against. Job seekers run many applications at
 * once, so the persisted shape is a list — the single `jobDescription` above is
 * what one comparison uses, not what the account remembers.
 */
export interface AtsTargetRole {
  id: string;
  title: string;
  jobDescription: string;
  savedAt: string;
}

/**
 * What `page_config.ats` stores.
 *
 * Deliberately not the full `AtsReviewSnapshot`: that carries
 * `candidateResumeData` and `approvedResumeData`, so persisting it would copy
 * the entire résumé into page_config on every save, two or three times over,
 * against a 256 KB ceiling. The review is deterministic and cheap to recompute
 * from the résumé plus the active role, so only the part that cannot be
 * recomputed — what the owner typed and chose — is stored.
 */
export interface AtsPersistedTargeting {
  savedRoles: AtsTargetRole[];
  activeRoleId: string | null;
  lastReviewedAt: string | null;
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
  renderable?: boolean;
  renderFailureReason?: string | null;
  pageCount: number | null;
  fitsOnOnePage: boolean | null;
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
export type AtsApprovalStatus = "pending" | "approved" | "out_of_sync";

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
  approvalStatus?: AtsApprovalStatus | null;
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
  ats?: AtsPersistedTargeting | null;
  variants?: PageVariant[] | null;
  decision_readiness?: DecisionReadinessState | null;
  job_search_profile?: JobSeekerProfile | null;
  [key: string]: unknown;
}

export interface PageRecord {
  id: string;
  user_id?: string;
  owner_id?: string;
  slug: string;
  status?: "draft" | "live" | "archived";
  visibility?: "private" | "link" | "public";
  /** False on "link only" pages: live and reachable, withheld from search. */
  search_indexable?: boolean | null;
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
