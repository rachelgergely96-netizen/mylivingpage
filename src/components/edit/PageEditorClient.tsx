"use client";

import Image from "next/image";
import Link from "next/link";
import {
  memo,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  PUBLISH_CC_TRIAL_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";
import AtsReadinessCard from "@/components/AtsReadinessCard";
import DraftBanner from "@/components/DraftBanner";
import EditorReadinessBriefing, {
  getReadinessSection,
} from "@/components/edit/EditorReadinessBriefing";
import EditorSectionNav, {
  type EditorSectionAnchorId,
} from "@/components/edit/EditorSectionNav";
import PublishPageButton from "@/components/PublishPageButton";
import ResumeLayout from "@/components/ResumeLayout";
import ResumeEditorFields from "@/components/resume/ResumeEditorFields";
import ResumePdfPreview from "@/components/resume/ResumePdfPreview";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import VariantPlanner from "@/components/VariantPlanner";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { buildDecisionReadinessState } from "@/lib/decision-readiness";
import {
  EDITOR_SIGNAL_DWELL_MS,
  INITIAL_EDITOR_SIGNAL,
  getEditorSaveMotionState,
  getEditorSignalLabel,
  getEditorSignalSection,
  getEditorSignalTargetSelector,
} from "@/lib/editor-motion-signal";
import { MOTION_EVENTS, MOTION_MODE_POLICIES } from "@/lib/motion";
import { EDITOR_LAYOUT_PREVIEW_PAGE_ID } from "@/lib/editor-preview";
import { sanitizeAtsTargeting } from "@/lib/ats-target-roles";
import { PAGE_VISIBILITY_WRITES } from "@/lib/page-visibility";
import { mergeResumePatch } from "@/lib/ats-review";
import {
  applyPageVariant,
  buildVariantHref,
  getPageVariants,
  sanitizePageVariants,
} from "@/lib/page-variants";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type {
  AtsPersistedTargeting,
  PageRecord,
  PageVariant,
  ResumeData,
} from "@/types/resume";

interface EditDraft {
  data: ResumeData;
  themeId: ThemeId;
  variants?: PageVariant[];
  atsTargeting?: AtsPersistedTargeting;
}

interface PageEditorClientProps {
  pageId: string;
  /** Test harness only; always on in the real editor. */
  autosaveEnabled?: boolean;
}

/**
 * Quiet period before an edit is persisted. Long enough that typing a sentence
 * is one save rather than several, short enough that closing the laptop mid-
 * thought does not cost the paragraph.
 */
const AUTOSAVE_DELAY_MS = 2500;

const EditorThemePicker = memo(ThemePicker);
const EditorPreviewResumeLayout = memo(ResumeLayout);

function normalizeLegacyResumeData(data: ResumeData) {
  const next = { ...data };

  if (next.skills?.length && typeof next.skills[0] === "string") {
    next.skills = [{ category: "General", items: next.skills as unknown as string[] }];
  }

  if (next.certifications?.length && typeof next.certifications[0] === "string") {
    next.certifications = (next.certifications as unknown as string[]).map((item) => ({
      name: item,
      issuer: null,
      date: null,
    }));
  }

  next.proofs = next.proofs ?? [];
  next.testimonials = next.testimonials ?? [];

  return next;
}

export default function PageEditorClient({
  pageId,
  autosaveEnabled = true,
}: PageEditorClientProps) {
  const router = useRouter();
  const { mode } = useMotionPreference();
  const allowsSmoothScroll = MOTION_MODE_POLICIES[mode].allowsSmoothScroll;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saveConfirmationSequence, setSaveConfirmationSequence] = useState(0);

  const [page, setPage] = useState<PageRecord | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>("cosmic");
  const [variants, setVariants] = useState<PageVariant[]>([]);
  const [previewVariantId, setPreviewVariantId] = useState<string | null>(null);
  const [atsTargeting, setAtsTargeting] = useState<AtsPersistedTargeting>(() =>
    sanitizeAtsTargeting(null),
  );
  const [publicSlug, setPublicSlug] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [mobileWorkspaceView, setMobileWorkspaceView] = useState<"edit" | "preview">("edit");
  const [commandBarInView, setCommandBarInView] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmingAvatarRemoval, setConfirmingAvatarRemoval] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [copiedVariantId, setCopiedVariantId] = useState<string | null>(null);
  const [editorSignal, setEditorSignal] = useState(INITIAL_EDITOR_SIGNAL);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const variantCopyTimerRef = useRef<number | null>(null);
  const editorPreviewRef = useRef<HTMLElement | null>(null);
  const editorSignalTargetRef = useRef<HTMLElement | null>(null);
  const editorSignalTimerRef = useRef<number | null>(null);
  // The live path is derived below from state this callback must not depend on;
  // a ref keeps the copy handler stable without going stale.
  const livePathRef = useRef("/");
  const latestEditorSnapshotRef = useRef("");
  // The last snapshot autosave tried to persist, successfully or not. Retrying
  // only once the content changes again is what stops a failing save from
  // looping against the server every few seconds.
  const lastAutosaveAttemptRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const [accountAccess, setAccountAccess] = useState(() =>
    getAccountAccessState({
      plan: "spark",
      billing_cohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
    }),
  );

  const { pendingDraft, saveDraft, clearDraft, dismissDraft } = useLocalDraft<EditDraft>(
    `mlp-draft-edit-${pageId}-living-page`,
  );
  const hasChanges = useMemo(() => {
    if (!data || !savedSnapshot) {
      return false;
    }

    return (
      JSON.stringify({ data, themeId, variants, atsTargeting }) !== savedSnapshot
    );
  }, [atsTargeting, data, savedSnapshot, themeId, variants]);
  const readiness = useMemo(
    () => (data ? buildDecisionReadinessState(data) : null),
    [data],
  );
  const signalSectionIds = useMemo<EditorSectionAnchorId[]>(() => {
    if (!data) return [];

    const sectionIds: EditorSectionAnchorId[] = [
      "editor-section-setup",
      "editor-section-design",
    ];
    if (
      data.name.trim() ||
      data.headline.trim() ||
      data.location.trim() ||
      data.email ||
      data.linkedin ||
      data.github ||
      data.website
    ) {
      sectionIds.push("editor-section-profile");
    }
    if (data.summary.trim()) sectionIds.push("editor-section-summary");
    if (data.stats.some((stat) => stat.value.trim() || stat.label.trim())) {
      sectionIds.push("editor-section-stats");
    }
    if (
      data.experience.some(
        (entry) =>
          entry.title.trim() ||
          entry.company.trim() ||
          entry.highlights.some((highlight) => highlight.trim()),
      )
    ) {
      sectionIds.push("editor-section-experience");
    }
    if (data.education.some((entry) => entry.degree.trim() || entry.school.trim())) {
      sectionIds.push("editor-section-education");
    }
    if (data.skills.some((entry) => entry.category.trim() || entry.items.some(Boolean))) {
      sectionIds.push("editor-section-skills");
    }
    if (data.projects.some((entry) => entry.name.trim() || entry.description.trim())) {
      sectionIds.push("editor-section-projects");
    }
    if (data.proofs?.some((entry) => entry.title.trim() || entry.outcome.trim())) {
      sectionIds.push("editor-section-proof");
    }
    if (data.testimonials?.some((entry) => entry.name.trim() || entry.quote.trim())) {
      sectionIds.push("editor-section-testimonials");
    }
    if (data.certifications.some((entry) => entry.name.trim() || entry.issuer?.trim())) {
      sectionIds.push("editor-section-certifications");
    }
    if (
      readiness?.checks.find((check) => check.id === "resume_pdf_health")?.status ===
      "ready"
    ) {
      sectionIds.push("editor-section-ats");
    }

    return sectionIds;
  }, [data, readiness]);

  useEffect(() => {
    latestEditorSnapshotRef.current = data
      ? JSON.stringify({ data, themeId, variants, atsTargeting })
      : "";
  }, [atsTargeting, data, themeId, variants]);

  useUnsavedChanges(hasChanges);

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (variantCopyTimerRef.current !== null) {
        window.clearTimeout(variantCopyTimerRef.current);
      }
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      if (editorSignalTimerRef.current !== null) {
        window.clearTimeout(editorSignalTimerRef.current);
      }
      editorSignalTargetRef.current?.removeAttribute("data-editor-signal-active");
    },
    [],
  );

  useEffect(() => {
    if (hasChanges) setCopyStatus("idle");
  }, [hasChanges]);

  useEffect(() => {
    if (
      previewVariantId &&
      !variants.some((variant) => variant.id === previewVariantId)
    ) {
      setPreviewVariantId(null);
    }
  }, [previewVariantId, variants]);

  useEffect(() => {
    livePathRef.current = `/${publicSlug || page?.slug || "your-username"}`;
  }, [page?.slug, publicSlug]);

  // The mobile dock's save button appears only once the command bar (and its
  // primary save) has scrolled out of view, so two dominant save actions are
  // never on screen together. Without IntersectionObserver, always show it.
  const editorReady = !loading && Boolean(data);
  useEffect(() => {
    if (!editorReady) {
      return;
    }

    const commandBar = document.querySelector("[data-editor-command-bar]");
    if (!commandBar || typeof IntersectionObserver === "undefined") {
      setCommandBarInView(false);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setCommandBarInView(entry?.isIntersecting ?? false);
    });
    observer.observe(commandBar);
    return () => observer.disconnect();
  }, [editorReady]);

  // Deep links (e.g. the legacy ATS route redirect) target section anchors that
  // only mount after the initial fetch, so re-apply the hash once the editor is ready.
  useEffect(() => {
    if (!editorReady || !window.location.hash) {
      return;
    }

    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: allowsSmoothScroll ? "smooth" : "auto" });
  }, [allowsSmoothScroll, editorReady]);

  useEffect(() => {
    if (!hasChanges || !data) {
      return;
    }

    saveDraft({
      data,
      themeId,
      variants,
      atsTargeting,
    });
  }, [atsTargeting, data, hasChanges, saveDraft, themeId, variants]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }

    const draft = pendingDraft.data;
    setData(draft.data);
    setThemeId(draft.themeId);
    // A draft stored before these fields existed carries neither. Restoring it
    // must not read "absent" as "empty" and wipe saved versions or target roles
    // that the draft simply predates.
    if (draft.variants) {
      setVariants(sanitizePageVariants(draft.variants));
    }
    if (draft.atsTargeting) {
      setAtsTargeting(sanitizeAtsTargeting(draft.atsTargeting));
    }
    dismissDraft();
  }, [dismissDraft, pendingDraft]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/pages/${pageId}`);
        if (response.status === 401) {
          router.push("/login?next=/dashboard");
          return;
        }
        if (!response.ok) {
          setError("Page not found or you don't have access.");
          setLoading(false);
          return;
        }

        const row = (await response.json()) as PageRecord;
        const livingData = normalizeLegacyResumeData({ ...row.resume_data });
        const storedVariants = getPageVariants(row.page_config);
        const storedTargeting = sanitizeAtsTargeting(row.page_config?.ats ?? null);

        setPage(row);
        setData(livingData);
        setThemeId(row.theme_id as ThemeId);
        setVariants(storedVariants);
        setAtsTargeting(storedTargeting);
        setPublicSlug(row.slug);
        setSavedSnapshot(
          JSON.stringify({
            data: livingData,
            themeId: row.theme_id,
            variants: storedVariants,
            atsTargeting: storedTargeting,
          }),
        );

        const profileResponse = await fetch("/api/profile");
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as {
            plan?: string;
            username?: string;
            billing_cohort?: string | null;
            hosting_trial_started_at?: string | null;
            stripe_subscription_status?: string | null;
            stripe_trial_ends_at?: string | null;
          };
          setAccountAccess(
            getAccountAccessState({
              plan: profile.plan ?? "spark",
              billing_cohort: profile.billing_cohort ?? null,
              hosting_trial_started_at: profile.hosting_trial_started_at ?? null,
              stripe_subscription_status: profile.stripe_subscription_status ?? null,
              stripe_trial_ends_at: profile.stripe_trial_ends_at ?? null,
            }),
          );
          setPublicSlug(profile.username ?? row.slug);
        }
      } catch {
        setError("Failed to load page.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [pageId, router]);

  useEffect(() => {
    if (
      accountAccess.allowedThemeIds &&
      !accountAccess.allowedThemeIds.includes(themeId)
    ) {
      setThemeId(accountAccess.allowedThemeIds[0] ?? "cosmic");
    }
  }, [accountAccess.allowedThemeIds, themeId]);

  const persistPage = useCallback(
    async (
      nextData: ResumeData,
      nextThemeId = themeId,
      nextVariants = variants,
      nextAtsTargeting = atsTargeting,
      options?: { auto?: boolean },
    ) => {
      if (!page || saving) {
        return false;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      const submittedSnapshot = JSON.stringify({
        data: nextData,
        themeId: nextThemeId,
        variants: nextVariants,
        atsTargeting: nextAtsTargeting,
      });

      try {
        const payload: Record<string, unknown> = {
          resume_data: nextData,
          theme_id: nextThemeId,
          // Merge rather than replace: page_config also carries the ATS review,
          // decision readiness, and the job-search profile, none of which this
          // editor owns.
          page_config: {
            ...(page.page_config ?? {}),
            variants: nextVariants,
            ats: nextAtsTargeting,
          },
          updated_at: new Date().toISOString(),
        };
        const saveResponse = await fetch(`/api/pages/${page.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!saveResponse.ok) {
          const body = (await saveResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Save failed.");
        }

        const hasNewerEdits = latestEditorSnapshotRef.current !== submittedSnapshot;
        setSavedSnapshot(submittedSnapshot);
        setSaveConfirmationSequence((sequence) => sequence + 1);
        if (!hasNewerEdits) {
          clearDraft();
        }
        setSuccess(
          hasNewerEdits
            ? "Saved. Newer edits are still unsaved."
            : options?.auto
              ? "Saved automatically."
              : "Saved.",
        );
        if (successTimerRef.current !== null) {
          window.clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = window.setTimeout(() => {
          setSuccess("");
          successTimerRef.current = null;
        }, 3000);
        return true;
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [atsTargeting, clearDraft, page, saving, themeId, variants],
  );

  const handleSave = useCallback(async () => {
    if (!data || !page || saving || !hasChanges) {
      return;
    }

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    lastAutosaveAttemptRef.current = null;

    await persistPage(data, themeId, variants, atsTargeting);
  }, [atsTargeting, data, hasChanges, page, persistPage, saving, themeId, variants]);

  // Autosave. The editor is thirteen sections long and previously only ever
  // saved on an explicit click, so work survived a refresh on the same browser
  // (via the local draft) and nothing else.
  useEffect(() => {
    if (!autosaveEnabled || !editorReady || !hasChanges || saving || !data || !page) {
      return;
    }

    const snapshot = JSON.stringify({ data, themeId, variants, atsTargeting });
    if (lastAutosaveAttemptRef.current === snapshot) {
      return;
    }

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      lastAutosaveAttemptRef.current = snapshot;
      void persistPage(data, themeId, variants, atsTargeting, { auto: true });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    atsTargeting,
    autosaveEnabled,
    data,
    editorReady,
    hasChanges,
    page,
    persistPage,
    saving,
    themeId,
    variants,
  ]);

  const handlePublished = useCallback(
    (state: "public" | "link") => {
      const write = PAGE_VISIBILITY_WRITES[state];
      setPage((prev) =>
        prev
          ? {
              ...prev,
              status: write.status,
              visibility: write.visibility,
              search_indexable: write.search_indexable,
            }
          : prev,
      );
    },
    [],
  );

  const copyVariantLink = useCallback(
    async (variantId: string) => {
      if (hasChanges || !page) return;

      const href = buildVariantHref(livePathRef.current as `/${string}`, {
        variantId,
      });
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin.replace(/\/$/, "")}${href}`,
        );
        setCopiedVariantId(variantId);
        void fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "page.share.copy_link",
            metadata: {
              page_id: page.id,
              surface: "living_page_editor",
              mode: "variant",
              variant_id: variantId,
              share_path: href,
            },
          }),
          keepalive: true,
        }).catch(() => undefined);

        if (variantCopyTimerRef.current !== null) {
          window.clearTimeout(variantCopyTimerRef.current);
        }
        variantCopyTimerRef.current = window.setTimeout(() => {
          setCopiedVariantId(null);
          variantCopyTimerRef.current = null;
        }, 2400);
      } catch {
        setCopiedVariantId(null);
      }
    },
    [hasChanges, page],
  );

  const handleCopyLiveLink = useCallback(async () => {
    if (hasChanges || !page || copyStatus === "copied") return;

    const livePath = `/${publicSlug || page.slug || "your-username"}`;
    const liveUrl = `${window.location.origin.replace(/\/$/, "")}${livePath}`;

    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopyStatus("copied");
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "page.share.copy_link",
          metadata: {
            page_id: page.id,
            surface: "living_page_editor",
            mode: "link_only",
            share_path: livePath,
          },
        }),
        keepalive: true,
      }).catch(() => undefined);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopyStatus("idle");
        copyTimerRef.current = null;
      }, 2400);
    } catch {
      setCopyStatus("error");
    }
  }, [copyStatus, hasChanges, page, publicSlug]);

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/avatar", { method: "POST", body: form });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        throw new Error(json.error ?? "Upload failed.");
      }

      setData((prev) => (prev ? { ...prev, avatar_url: json.url as string } : prev));
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    setRemovingAvatar(true);
    try {
      await fetch("/api/avatar", { method: "DELETE" });
      setData((prev) => (prev ? { ...prev, avatar_url: null } : prev));
      setConfirmingAvatarRemoval(false);
    } finally {
      setRemovingAvatar(false);
    }
  };

  const previewVariant = useMemo(
    () => variants.find((variant) => variant.id === previewVariantId) ?? null,
    [previewVariantId, variants],
  );
  const deferredPreviewSource = useDeferredValue(data);
  const previewData = useMemo(
    () =>
      deferredPreviewSource
        ? applyPageVariant(deferredPreviewSource, previewVariant)
        : null,
    [deferredPreviewSource, previewVariant],
  );

  const markEditorSourceChange = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return;
    }

    const sourceSection = target.closest<HTMLElement>("[data-editor-section]");
    const section = getEditorSignalSection(sourceSection?.dataset.editorSection);
    if (!section) {
      return;
    }

    setEditorSignal((current) => ({
      section,
      sequence: current.sequence + 1,
      state: "source-changed",
    }));
  }, []);

  const handleEditorChangeCapture = useCallback(
    (event: FormEvent<HTMLDivElement>) => markEditorSourceChange(event.target),
    [markEditorSourceChange],
  );

  const handleEditorActionCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target instanceof Element && event.target.closest("button")) {
        markEditorSourceChange(event.target);
      }
    },
    [markEditorSourceChange],
  );

  const editorSignalSection = editorSignal.section;
  const editorSignalSequence = editorSignal.sequence;

  useEffect(() => {
    const section = editorSignalSection;
    const sequence = editorSignalSequence;
    if (!section || sequence === 0) {
      return;
    }

    if (deferredPreviewSource !== data) {
      return;
    }

    if (editorSignalTimerRef.current !== null) {
      window.clearTimeout(editorSignalTimerRef.current);
      editorSignalTimerRef.current = null;
    }
    editorSignalTargetRef.current?.removeAttribute("data-editor-signal-active");

    const target = editorPreviewRef.current?.querySelector<HTMLElement>(
      getEditorSignalTargetSelector(section),
    );
    if (!target) {
      editorSignalTargetRef.current = null;
      setEditorSignal((current) =>
        current.sequence === sequence && current.state !== "preview-empty"
          ? { ...current, state: "preview-empty" }
          : current,
      );
      return;
    }

    editorSignalTargetRef.current = target;
    target.setAttribute("data-editor-signal-active", "true");
    setEditorSignal((current) =>
      current.sequence === sequence && current.state !== "preview-matched"
        ? { ...current, state: "preview-matched" }
        : current,
    );

    editorSignalTimerRef.current = window.setTimeout(() => {
      if (editorSignalTargetRef.current === target) {
        target.removeAttribute("data-editor-signal-active");
        editorSignalTargetRef.current = null;
      }
      editorSignalTimerRef.current = null;
      setEditorSignal((current) =>
        current.sequence === sequence ? { ...current, state: "settled" } : current,
      );
    }, EDITOR_SIGNAL_DWELL_MS);

    return () => {
      if (editorSignalTimerRef.current !== null) {
        window.clearTimeout(editorSignalTimerRef.current);
        editorSignalTimerRef.current = null;
      }
      if (editorSignalTargetRef.current === target) {
        target.removeAttribute("data-editor-signal-active");
        editorSignalTargetRef.current = null;
      }
    };
  }, [
    data,
    deferredPreviewSource,
    editorSignalSection,
    editorSignalSequence,
    previewData,
  ]);

  const editorFieldEventActive =
    editorSignal.state === "source-changed" || editorSignal.state === "preview-matched";

  const editorSignalLabel = editorSignal.section
    ? getEditorSignalLabel(editorSignal.section)
    : null;
  const editorSaveMotionState = getEditorSaveMotionState({
    confirmed: Boolean(success),
    hasChanges,
    saving,
  });
  const editorSaveConfirmed = editorSaveMotionState === "confirmed";

  const selectedTheme = THEME_REGISTRY.find((theme) => theme.id === themeId);
  const nextReadinessCheck = readiness?.checks.find(
    (check) => check.status === "needs_attention",
  );
  const nextReadinessTarget = nextReadinessCheck
    ? getReadinessSection(nextReadinessCheck.id)
    : null;
  const livePath = `/${publicSlug || page?.slug || "your-username"}`;
  // Records without a status column keep the live-page actions they always had.
  const isDraft = Boolean(page?.status && page.status !== "live");
  // A page that was link-only before it went offline comes back link-only.
  const republishAs: "public" | "link" =
    page?.search_indexable === false ? "link" : "public";
  const themePickerCollection =
    accountAccess.allowedThemeIds && !accountAccess.allowedThemeIds.includes(themeId)
      ? THEME_REGISTRY.find((theme) => theme.id === accountAccess.allowedThemeIds?.[0])
          ?.collection
      : selectedTheme?.collection;

  const showMobileWorkspaceView = (view: "edit" | "preview") => {
    setMobileWorkspaceView(view);
    window.requestAnimationFrame(() => {
      document.getElementById("editor-workspace")?.scrollIntoView({
        block: "start",
        behavior: allowsSmoothScroll ? "smooth" : "auto",
      });
    });
  };

  if (loading) {
    return (
      <main className="site-container-wide max-w-6xl py-8" id="main-content">
        <div className="site-panel p-6 text-center sm:p-8">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-site-border border-t-site-action" />
          <p className="mt-4 text-sm text-site-muted" role="status">Loading page…</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="site-container-wide max-w-6xl py-8" id="main-content">
        <div className="site-panel p-6 text-center sm:p-8">
          <p className="text-sm text-site-danger" role="alert">{error || "Page not found."}</p>
          <Link
            href="/dashboard"
            className="site-button site-button-secondary mt-5 inline-flex px-4"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="site-container-wide overflow-x-clip pb-24 pt-4 sm:pt-6 xl:pb-10" id="main-content">
      <section
        aria-label="Editor commands"
        data-editor-command-bar
        className="site-panel-raised relative z-30 min-w-0 max-w-full overflow-hidden px-3 py-3 sm:px-4 xl:sticky xl:top-16"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.42fr)_auto] lg:items-center lg:gap-5">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-xs font-semibold text-site-muted transition-colors hover:text-site-text"
            >
              <span aria-hidden="true">←</span>
              Dashboard
            </button>
            <p className="site-eyebrow">Signal studio · Edit your page</p>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2.5">
              <h1 className="truncate font-site text-xl font-semibold tracking-[-0.03em] text-site-text sm:text-2xl">
                {data.name || "Untitled page"}
              </h1>
              <span
                role="status"
                aria-live="polite"
                data-motion-event={
                  editorSaveConfirmed ? MOTION_EVENTS.EDITOR_SAVE_CONFIRMED : undefined
                }
                data-motion-signal={editorSaveConfirmed ? "edit-to-proof" : undefined}
                data-motion-state={editorSaveConfirmed ? "confirmed" : undefined}
                data-motion-sequence={editorSaveConfirmed ? saveConfirmationSequence : undefined}
                data-motion-target={editorSaveConfirmed ? "page" : undefined}
                className={`inline-flex items-center gap-2 border px-2.5 py-1 text-xs font-medium transition-colors ${
                  saving
                    ? "border-site-warning text-site-warning"
                    : hasChanges
                      ? "border-site-action text-site-action-hover"
                      : "border-site-border text-site-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  data-motion-ambient
                  className={`h-1.5 w-1.5 ${
                    saving
                      ? "animate-pulse bg-site-warning"
                      : hasChanges
                        ? "bg-site-action"
                        : "bg-site-success"
                  }`}
                />
                {saving
                  ? "Saving changes"
                  : hasChanges
                    ? autosaveEnabled
                      ? "Saving shortly…"
                      : "Unsaved changes"
                    : "All changes saved"}
              </span>
              {isDraft ? (
                <span className="inline-flex items-center border border-site-border px-2.5 py-1 text-xs font-medium text-site-secondary">
                  Draft — only you can see it
                </span>
              ) : null}
            </div>
          </div>

          {readiness ? (
            // Persistent status readout. The per-check segmented bars live only
            // in the readiness briefing (their accessible home); here we name the
            // next gap in text, which stays useful once the briefing scrolls off.
            <div className="border-t border-site-border pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <p className="site-eyebrow text-site-muted">
                Page signal
              </p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-site-text">
                {readiness.readyCount}/{readiness.totalChecks} checks strong
              </p>
              <p className="mt-1.5 truncate text-xs text-site-muted">
                {nextReadinessTarget
                  ? `Next: ${nextReadinessTarget.label}`
                  : "Ready to save and share"}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-start lg:justify-end">
            <button
              type="button"
              disabled={saving || !hasChanges}
              onClick={() => void handleSave()}
              className="site-button site-button-primary col-span-2 min-w-0 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {isDraft && page ? (
              <div className="col-span-2 min-w-0 lg:max-w-xs">
                {/* While edits are unsaved, saving is the one primary action;
                    publish steps back to secondary until the page is saved. */}
                <PublishPageButton
                  pageId={page.id}
                  emphasis={hasChanges ? "secondary" : "primary"}
                  label="Publish page"
                  publishAs={republishAs}
                  onPublished={handlePublished}
                />
                <p className="mt-1.5 text-xs leading-5 text-site-muted">
                  {republishAs === "link"
                    ? `Publishing puts mylivingpage.com/${publicSlug || page.slug} back online, still hidden from search.`
                    : `Publishing makes mylivingpage.com/${publicSlug || page.slug} public.`}
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  aria-disabled={hasChanges || undefined}
                  aria-describedby="editor-copy-guidance"
                  onClick={() => void handleCopyLiveLink()}
                  className="site-button site-button-secondary min-w-0 px-3 py-2 text-xs aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:px-4"
                >
                  {copyStatus === "copied" ? "Link copied" : "Copy link"}
                </button>
                <Link
                  href={livePath}
                  target="_blank"
                  rel="noreferrer"
                  className="site-button site-button-secondary min-w-0 px-3 py-2 text-center text-xs sm:px-4"
                >
                  View live
                </Link>
                {hasChanges ? (
                  <p
                    id="editor-copy-guidance"
                    className="col-span-2 text-xs leading-5 text-site-muted lg:basis-full lg:text-right"
                  >
                    Your changes are saving now — the live link follows in a moment.
                  </p>
                ) : (
                  <p id="editor-copy-guidance" className="sr-only">
                    Copy the saved live page link.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div
          role="group"
          aria-label="Editor workspace view"
          className="mt-3 grid grid-cols-2 border border-site-border xl:hidden"
        >
          {(["edit", "preview"] as const).map((view) => {
            const active = mobileWorkspaceView === view;
            return (
              <button
                key={view}
                type="button"
                aria-pressed={active}
                onClick={() => showMobileWorkspaceView(view)}
                className={`min-h-11 px-3 py-2 text-xs font-semibold tracking-[0.06em] transition-colors ${
                  view === "preview" ? "border-l border-site-border" : ""
                } ${
                  active
                    ? "bg-site-selected text-site-action-hover"
                    : "bg-site-canvas-alt text-site-muted hover:text-site-text"
                }`}
              >
                {view === "edit" ? "Edit content" : "Live preview"}
              </button>
            );
          })}
        </div>

        {mobileWorkspaceView === "edit" ? (
          <div
            data-editor-mobile-peek
            className="mt-2 flex min-w-0 items-center gap-2 border-l-2 border-site-action px-2 py-1 text-xs xl:hidden"
          >
            <span className="site-eyebrow shrink-0 text-site-action-hover">
              Preview signal
            </span>
            <span className="truncate text-site-muted">
              {data.headline || "Add a headline to sharpen the first impression"}
            </span>
          </div>
        ) : null}

        {/* While the mobile preview is active every editor section is hidden,
            so the scroll-tracking page map would pin to a meaningless stop. */}
        <div className={mobileWorkspaceView === "preview" ? "hidden xl:block" : undefined}>
          <EditorSectionNav
            allowsSmoothScroll={allowsSmoothScroll}
            signalSectionIds={signalSectionIds}
          />
        </div>
        {copyStatus === "copied" ? (
          <p role="status" className="sr-only">Live page link copied.</p>
        ) : null}
        {copyStatus === "error" ? (
          <p role="alert" className="mt-2 text-xs text-site-danger">
            The link could not be copied. Open the live page and copy its address instead.
          </p>
        ) : null}
      </section>

      <div className="mt-4" aria-live="polite">
        {error ? (
          <div className="site-alert-danger mb-4 flex items-start gap-2 px-4 py-3 text-sm" role="alert">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.75v3.75" strokeLinecap="square" />
              <path d="M8 11.25h.01" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}
        {success ? (
          <p className="site-alert-success mb-4 px-4 py-3 text-sm" role="status">
            {success}
          </p>
        ) : null}
      </div>

      <div
        id="editor-workspace"
        data-editor-workspace
        className="scroll-mt-24 xl:grid xl:scroll-mt-40 xl:grid-cols-[minmax(0,46rem)_minmax(24rem,1fr)] xl:items-start xl:gap-5"
      >
        <section
          aria-labelledby="editor-content-title"
          className={`${mobileWorkspaceView === "edit" ? "block" : "hidden"} min-w-0 xl:block`}
        >
          <div className="mb-4 flex items-end justify-between gap-4 px-1">
            <div>
              <p className="site-eyebrow">Your page, in working order</p>
              <h2 id="editor-content-title" className="site-panel-title mt-1.5">
                Shape the signal, section by section
              </h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs leading-5 text-site-muted sm:block">
              Every edit appears in the preview, and saves on its own a moment later.
            </p>
          </div>

          <div className="space-y-6">
            {/* Once the user edits, autosave tracks the newer state and the
                stored draft is stale — the restore decision moment has passed. */}
            {pendingDraft && !hasChanges ? (
              <DraftBanner
                savedAt={pendingDraft.savedAt}
                onRestore={restoreDraft}
                onDiscard={dismissDraft}
              />
            ) : null}

            {readiness ? <EditorReadinessBriefing readiness={readiness} /> : null}

            <section
              id="editor-section-setup"
              data-editor-section="setup"
              aria-labelledby="editor-setup-title"
              className="scroll-mt-24 xl:scroll-mt-72"
            >
              <div className="mb-3 px-1">
                <p className="site-eyebrow">
                  <span className="mr-2 font-mono text-site-muted">01</span>
                  Page setup
                </p>
                <h2 id="editor-setup-title" className="site-panel-title mt-1.5">
                  Your address and first impression
                </h2>
                <p className="mt-2 text-xs leading-5 text-site-muted">
                  Keep the link memorable and choose the face—or monogram—people meet first.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
                <fieldset className="site-panel min-w-0 space-y-3 p-4 sm:p-6">
                  <legend className="site-eyebrow px-1">Public URL</legend>
                  <div className="min-w-0 break-all border border-site-border bg-site-canvas-alt px-3 py-2 font-mono text-sm leading-6 text-site-action">
                    mylivingpage.com/{publicSlug || page?.slug || "your-username"}
                  </div>
                  <p className="text-xs leading-5 text-site-muted">
                    This address is shared by your professional page and downloadable résumé.
                  </p>
                </fieldset>

                <fieldset className="site-panel space-y-3 p-4 sm:p-6">
                  <legend className="site-eyebrow px-1">Profile photo</legend>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {data.avatar_url ? (
                      <Image
                        src={data.avatar_url}
                        alt="Avatar"
                        width={64}
                        height={64}
                        sizes="(min-width: 640px) 64px, 56px"
                        className="h-14 w-14 shrink-0 rounded-none border-2 border-site-action object-cover sm:h-16 sm:w-16"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-none bg-site-action font-site text-xl font-bold text-site-action-ink sm:h-16 sm:w-16 sm:text-2xl">
                        {(data.name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void handleAvatarUpload(file);
                          }
                          event.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        className="site-button site-button-secondary w-full px-3 py-2 text-xs disabled:opacity-50"
                      >
                        {uploadingAvatar
                          ? "Uploading…"
                          : data.avatar_url
                            ? "Change photo"
                            : "Upload photo"}
                      </button>
                      {data.avatar_url ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmingAvatarRemoval(true)}
                            className="flex min-h-11 w-full items-center text-left text-xs text-site-muted transition-colors hover:text-site-danger"
                          >
                            Remove · use monogram
                          </button>
                          <ConfirmDialog
                            open={confirmingAvatarRemoval}
                            title="Remove this photo?"
                            body="This deletes the uploaded photo right away. Your page shows your monogram instead."
                            confirmLabel="Remove photo"
                            destructive
                            loading={removingAvatar}
                            onConfirm={() => void removeAvatar()}
                            onClose={() => setConfirmingAvatarRemoval(false)}
                          />
                        </>
                      ) : (
                        <p className="text-xs leading-5 text-site-muted">JPEG, PNG, or WebP · 2 MB max</p>
                      )}
                    </div>
                  </div>
                </fieldset>
              </div>
            </section>

            <div
              onChangeCapture={handleEditorChangeCapture}
              onClickCapture={handleEditorActionCapture}
            >
              <ResumeEditorFields data={data} onChange={setData} />
            </div>

            <section
              id="editor-section-design"
              data-editor-section="design"
              aria-labelledby="editor-design-title"
              className="site-panel scroll-mt-24 p-4 sm:p-6 xl:scroll-mt-72"
            >
              <div className="mb-5 border-b border-site-border pb-4">
                <p className="site-eyebrow">
                  <span className="mr-2 font-mono text-site-muted">12</span>
                  Design
                </p>
                <div className="mt-1.5 flex flex-wrap items-end justify-between gap-3">
                  <h2 id="editor-design-title" className="site-panel-title">
                    Choose the world around your story
                  </h2>
                  <span className="border border-site-action bg-site-selected px-2.5 py-1 text-xs font-medium text-site-action-hover">
                    {selectedTheme?.name ?? themeId}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  Your professional story stays the same while the style changes.
                </p>
              </div>
              <EditorThemePicker
                themes={THEME_REGISTRY}
                selectedThemeId={themeId}
                onSelectTheme={setThemeId}
                allowedThemeIds={accountAccess.allowedThemeIds}
                initialCollection={themePickerCollection}
                lockedLabel="Paid plan"
                showDescription
              />
            </section>

            <section
              id="editor-section-versions"
              data-editor-section="versions"
              aria-labelledby="editor-versions-title"
              className="site-panel scroll-mt-24 p-4 sm:p-6 xl:scroll-mt-72"
            >
              <div className="mb-5 border-b border-site-border pb-4">
                <p className="site-eyebrow">
                  <span className="mr-2 font-mono text-site-muted">13</span>
                  Versions
                </p>
                <h2 id="editor-versions-title" className="site-panel-title mt-1.5">
                  Sharpen the same page for a specific conversation
                </h2>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  Each version gets its own share link, and analytics reports which one people
                  opened.
                </p>
              </div>
              <VariantPlanner
                baseData={data}
                variants={variants}
                selectedVariantId={previewVariantId}
                onSelectVariant={setPreviewVariantId}
                onChange={(next) => setVariants(sanitizePageVariants(next))}
                maxVariants={Math.max(accountAccess.variantLimit, variants.length)}
              />
              {variants.length > 0 && !isDraft ? (
                <ul className="mt-5 space-y-2 border-t border-site-border pt-4">
                  {variants.map((variant) => {
                    const href = buildVariantHref(livePath as `/${string}`, {
                      variantId: variant.id,
                    });
                    return (
                      <li
                        key={variant.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <span className="min-w-0 truncate font-mono text-site-muted">
                          mylivingpage.com{href}
                        </span>
                        <button
                          type="button"
                          aria-disabled={hasChanges || undefined}
                          onClick={() => void copyVariantLink(variant.id)}
                          className="site-button site-button-secondary px-3 py-1.5 text-xs aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                        >
                          {copiedVariantId === variant.id ? "Copied" : "Copy link"}
                        </button>
                      </li>
                    );
                  })}
                  {hasChanges ? (
                    <li className="text-xs leading-5 text-site-muted">
                      Your changes are saving now — version links follow in a moment.
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </section>

            <section
              id="editor-section-ats"
              data-editor-section="ats"
              aria-labelledby="editor-tools-title"
              className="scroll-mt-24 space-y-4 xl:scroll-mt-72"
            >
              <div className="px-1">
                <p className="site-eyebrow">
                  <span className="mr-2 font-mono text-site-muted">13</span>
                  ATS &amp; job check
                </p>
                <h2 id="editor-tools-title" className="site-panel-title mt-1.5">
                  Check the saved résumé against the next role
                </h2>
                <p className="mt-2 text-xs leading-5 text-site-muted">
                  Review the PDF structure on its own, or paste one job description to make the word match visible.
                </p>
              </div>
              <AtsReadinessCard
                resumeData={data}
                showHeader={false}
                targeting={atsTargeting}
                onTargetingChange={setAtsTargeting}
                onApplyProposal={(patch) =>
                  setData((prev) => (prev ? mergeResumePatch(prev, patch) : prev))
                }
              />
              <ResumePdfPreview
                resumeData={data}
                localPreviewMode={pageId === EDITOR_LAYOUT_PREVIEW_PAGE_ID}
              />
              <p className="px-1 text-xs leading-5 text-site-muted">
                The check uses the fields currently in this editor. Save your changes before relying
                on the public PDF.
              </p>
            </section>
          </div>
        </section>

        <aside
          ref={editorPreviewRef}
          aria-labelledby="editor-preview-title"
          data-editor-preview
          className={`${mobileWorkspaceView === "preview" ? "block" : "hidden"} min-w-0 xl:sticky xl:top-72 xl:block [&_[data-editor-signal-active=true]]:ring-2 [&_[data-editor-signal-active=true]]:ring-inset [&_[data-editor-signal-active=true]]:ring-site-action [&_[data-editor-signal-active=true]]:transition-shadow [&_[data-editor-signal-active=true]]:duration-150`}
        >
          <section className="overflow-hidden rounded-none border border-site-border-strong bg-site-surface shadow-[var(--site-shadow-raised)]">
            {/* Below xl the mobile viewport is short, so the panel opens straight
                on the status strip and the themed page itself. */}
            <div className="hidden items-start justify-between gap-4 border-b border-site-border bg-site-surface-raised px-4 py-3 xl:flex">
              <div>
                <p className="site-eyebrow">What they see</p>
                <h2 id="editor-preview-title" className="mt-1 font-site text-lg font-semibold text-site-text">
                  Your page, alive while you edit
                </h2>
                <p className="mt-1 text-xs text-site-muted">Scroll the real page without leaving the studio.</p>
              </div>
              <span className="shrink-0 border border-site-border bg-site-canvas-alt px-2.5 py-1 text-xs font-medium text-site-action-hover">
                {selectedTheme?.name ?? themeId}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2 border-b border-site-border bg-site-canvas-alt px-3 py-2.5">
              <span
                aria-hidden="true"
                data-motion-ambient
                className={`h-2 w-2 ${hasChanges ? "animate-pulse bg-site-warning" : "bg-site-success"}`}
              />
              <span
                data-editor-preview-status
                className={`site-eyebrow shrink-0 ${
                  hasChanges ? "text-site-warning" : "text-site-success"
                }`}
              >
                {hasChanges ? "Unsaved view" : "Live signal"}
              </span>
              <div className="ml-1 min-w-0 flex-1 truncate rounded-none border border-site-border bg-site-surface px-2.5 py-1 font-mono text-xs text-site-muted">
                mylivingpage.com/<span className="text-site-action">{publicSlug || page?.slug}</span>
              </div>
            </div>

            <p
              role="status"
              aria-live="polite"
              data-editor-signal-status
              data-motion-event={
                editorFieldEventActive ? MOTION_EVENTS.EDITOR_FIELD_CHANGED : undefined
              }
              data-motion-signal={editorFieldEventActive ? "edit-to-proof" : undefined}
              data-motion-state={editorFieldEventActive ? editorSignal.state : undefined}
              data-motion-sequence={editorFieldEventActive ? editorSignal.sequence : undefined}
              data-motion-target={
                editorFieldEventActive ? editorSignal.section ?? undefined : undefined
              }
              className="flex min-h-9 min-w-0 items-center gap-2 border-b border-site-border bg-site-surface-raised px-3 py-2 text-xs text-site-secondary"
            >
              <span className="site-eyebrow shrink-0 text-site-action">Preview correspondence</span>
              <span className="min-w-0 truncate">
                {!editorSignalLabel
                  ? "Edit a section to trace it into the live preview."
                  : editorSignal.state === "preview-empty"
                    ? `${editorSignalLabel} is not shown because it is empty.`
                    : `${editorSignalLabel} changes update the live preview.`}
              </span>
            </p>

            <ThemeCanvas
              themeId={themeId}
              height="clamp(420px, calc(100dvh - 26.5rem), 680px)"
              className="rounded-none"
              interactive={false}
              maxFps={30}
              motionAware
            >
              <div className="h-full">
                <EditorPreviewResumeLayout
                  data={previewData ?? data}
                  headingLevel="h2"
                  disableExternalLinks
                />
              </div>
            </ThemeCanvas>
          </section>
        </aside>
      </div>

      <nav
        aria-label="Mobile editor actions"
        data-editor-mobile-dock
        className={`site-panel-raised fixed inset-x-5 bottom-3 z-40 grid gap-2 p-2 shadow-[var(--site-shadow-overlay)] xl:hidden ${
          commandBarInView ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"
        }`}
      >
        {error ? (
          // Announced by the alert at the top of the page; this strip keeps the
          // failure visible when saving from deep inside the form.
          <p
            aria-hidden="true"
            className="site-alert-danger col-span-full flex items-start gap-2 px-3 py-2 text-xs leading-5"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.75v3.75" strokeLinecap="square" />
              <path d="M8 11.25h.01" strokeLinecap="round" />
            </svg>
            <span className="min-w-0">{error}</span>
          </p>
        ) : null}
        {success && !commandBarInView ? (
          // Announced by the status region at the top of the page; this strip
          // keeps the confirmation visible when saving from deep inside the form.
          <p
            aria-hidden="true"
            className="site-alert-success col-span-full px-3 py-2 text-xs leading-5"
          >
            {success}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() =>
            showMobileWorkspaceView(
              mobileWorkspaceView === "edit" ? "preview" : "edit",
            )
          }
          className="site-button site-button-secondary min-w-0 px-3 py-2 text-xs"
        >
          {mobileWorkspaceView === "edit" ? "Preview your page" : "Return to editing"}
        </button>
        {/* The command bar already shows the primary save; surface the dock
            save only after that bar scrolls out of view (no double primary). */}
        {!commandBarInView ? (
          <button
            type="button"
            disabled={saving || !hasChanges}
            onClick={() => void handleSave()}
            className="site-button site-button-primary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save now"}
          </button>
        ) : null}
      </nav>
    </main>
  );
}
