import type {
  DecisionReadinessCheck,
  DecisionReadinessState,
  DecisionReadinessStatus,
  PageVariant,
  ResumeData,
} from "@/types/resume";

function hasQuantifiedProof(data: ResumeData) {
  const texts = [
    data.summary,
    ...data.stats.map((stat) => `${stat.value} ${stat.label}`),
    ...data.experience.flatMap((entry) => entry.highlights),
    ...data.projects.map((project) => project.description),
    ...(data.proofs ?? []).flatMap((proof) => [proof.title, proof.summary, proof.outcome]),
  ];

  return texts.some((text) => /\d/.test(text));
}

function buildCheck(
  id: string,
  title: string,
  status: DecisionReadinessStatus,
  detail: string,
): DecisionReadinessCheck {
  return { id, title, status, detail };
}

export function buildDecisionReadinessState(
  data: ResumeData,
  variants: PageVariant[] = [],
): DecisionReadinessState {
  const hasSummary = data.summary.trim().split(/\s+/).filter(Boolean).length >= 14;
  const hasContact = [data.email, data.linkedin, data.website, data.github].filter(Boolean).length >= 1;
  const hasHeadline = data.headline.trim().length >= 8;
  const quantifiedProof = hasQuantifiedProof(data);
  const totalHighlights = data.experience.reduce(
    (sum, entry) => sum + entry.highlights.filter((highlight) => highlight.trim().length > 0).length,
    0,
  );
  const estimatedPdfFriendly =
    data.experience.length > 0 &&
    totalHighlights <= 12 &&
    data.projects.length <= 4 &&
    data.summary.length <= 420;
  const mobileReadable =
    data.summary.length <= 320 &&
    totalHighlights <= 10 &&
    data.stats.length <= 4;

  const checks = [
    buildCheck(
      "target_role",
      "Target role is clear",
      hasHeadline ? "ready" : "needs_attention",
      hasHeadline
        ? "The page opens with a role signal someone can understand quickly."
        : "Add a clearer headline so someone immediately knows what kind of work you want.",
    ),
    buildCheck(
      "quantified_proof",
      "Proof includes real outcomes",
      quantifiedProof ? "ready" : "needs_attention",
      quantifiedProof
        ? "There is at least one result with numbers or visible scope on the page."
        : "Add one metric, scope number, or outcome so the page feels more decision-ready.",
    ),
    buildCheck(
      "top_summary",
      "Top summary feels strong",
      hasSummary ? "ready" : "needs_attention",
      hasSummary
        ? "The summary gives enough context to justify reading the rest."
        : "Tighten the first paragraph so it explains fit, strengths, and momentum in a few lines.",
    ),
    buildCheck(
      "contact_surface",
      "Contact surface is complete",
      hasContact ? "ready" : "needs_attention",
      hasContact
        ? "Someone can take the next step from the page."
        : "Add at least one public contact option so the page can convert interest into action.",
    ),
    buildCheck(
      "resume_pdf_health",
      "Resume PDF looks safe to export",
      estimatedPdfFriendly ? "ready" : "needs_attention",
      estimatedPdfFriendly
        ? "The current content should stay focused enough for a clean Resume PDF."
        : "The page is getting dense. Tighten bullets or trim sections before relying on the exported PDF.",
    ),
    buildCheck(
      "mobile_readability",
      "Mobile skim looks clean",
      mobileReadable ? "ready" : "needs_attention",
      mobileReadable
        ? "The page should still scan quickly on a phone."
        : "The top of the page may feel heavy on mobile. Shorten the summary or reduce visible proof points.",
    ),
  ];

  const suggestions = checks
    .filter((check) => check.status === "needs_attention")
    .map((check) => ({
      id: check.id,
      title:
        check.id === "quantified_proof"
          ? "Add one concrete result"
          : check.id === "target_role"
            ? "Sharpen the role signal"
            : check.id === "top_summary"
              ? "Upgrade the opening summary"
              : check.id === "contact_surface"
                ? "Add a next-step contact option"
                : check.id === "resume_pdf_health"
                  ? "Trim the exported version"
                  : "Tighten the mobile skim",
      detail: check.detail,
    }));

  if (variants.length === 0) {
    suggestions.unshift({
      id: "variants",
      title: "Create one targeted version",
      detail:
        "A recruiter reply version or application follow-up version gives you a stronger link for the exact moment you are sending.",
    });
  }

  const readyCount = checks.filter((check) => check.status === "ready").length;
  const overallStatus: DecisionReadinessStatus =
    readyCount === checks.length ? "ready" : "needs_attention";

  return {
    overallStatus,
    readyCount,
    totalChecks: checks.length,
    summary:
      overallStatus === "ready"
        ? "This page is ready to send in a real decision moment."
        : `${readyCount} of ${checks.length} decision checks look strong. Tighten the remaining gaps before you send it broadly.`,
    checks,
    suggestions: suggestions.slice(0, 4),
    lastEvaluatedAt: new Date().toISOString(),
  };
}
