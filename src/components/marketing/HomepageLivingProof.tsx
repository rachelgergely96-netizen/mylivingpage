"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  buildLivingProofProjection,
  createLivingProofState,
  createLivingProofStateFromText,
  editLivingProofAchievement,
  LIVING_PROOF_ACHIEVEMENT_MAX,
  LIVING_PROOF_SAMPLES,
  normalizeLivingProofAchievement,
} from "@/lib/homepage-living-proof";
import { MAX_RESUME_TEXT_CHARACTERS } from "@/lib/resume-import";
import {
  MOTION_EVENTS,
  MOTION_SIGNALS,
  type MotionEventName,
  type MotionSignalName,
} from "@/lib/motion";
import { THEME_MAP } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import styles from "./HomepageLivingProof.module.css";

interface HomepageLivingProofProps {
  themeId: ThemeId;
}

function MiniQr() {
  return (
    <svg
      aria-label="Sample QR code for the linked Living Page"
      className={styles.miniQr}
      role="img"
      shapeRendering="crispEdges"
      viewBox="0 0 21 21"
    >
      <rect width="21" height="21" fill="#ffffff" />
      <path
        d="M1 1h6v6H1V1Zm1 1v4h4V2H2Zm12-1h6v6h-6V1Zm1 1v4h4V2h-4ZM1 14h6v6H1v-6Zm1 1v4h4v-4H2ZM3 3h2v2H3V3Zm12 0h2v2h-2V3ZM3 16h2v2H3v-2ZM9 1h2v2H9V1Zm3 1h1v3h-2V4h1V2ZM8 5h2v2H8V5Zm3 2h2v2h-2V7Zm3 1h2v2h-2V8Zm3 0h3v2h-1v2h-2V8ZM8 9h2v3H8V9Zm3 1h2v2h-2v-2Zm3 2h2v2h-2v-2Zm3 1h3v2h-3v-2ZM8 13h2v2H8v-2Zm3 1h2v3h-2v-3Zm3 1h2v2h-2v-2Zm3 1h2v4h-2v-4ZM8 17h2v3H8v-3Zm3 1h2v2h-2v-2Zm3 0h2v2h-2v-2Z"
        fill="#071321"
      />
    </svg>
  );
}

export default function HomepageLivingProof({
  themeId,
}: HomepageLivingProofProps) {
  const [proofState, setProofState] = useState(() =>
    createLivingProofState(LIVING_PROOF_SAMPLES[0]),
  );
  const [draftAchievement, setDraftAchievement] = useState(
    LIVING_PROOF_SAMPLES[0].achievement,
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteIssue, setPasteIssue] = useState<string | null>(null);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [recruiterLens, setRecruiterLens] = useState(false);
  const [motionSequence, setMotionSequence] = useState(0);
  const [motionEvent, setMotionEvent] = useState<MotionEventName>(
    MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED,
  );
  const [motionSignal, setMotionSignal] = useState<MotionSignalName>(
    MOTION_SIGNALS.TRUTH_TRANSFER,
  );
  const [status, setStatus] = useState(
    "Platform leader sample ready in all three views.",
  );

  const projection = useMemo(
    () => buildLivingProofProjection(proofState),
    [proofState],
  );
  const theme = THEME_MAP[themeId];

  const announceSync = (
    message: string,
    event: MotionEventName,
    signal: MotionSignalName,
  ) => {
    setMotionEvent(event);
    setMotionSignal(signal);
    setMotionSequence((current) => current + 1);
    setStatus(message);
  };

  const selectSample = (sampleIndex: number) => {
    const sample = LIVING_PROOF_SAMPLES[sampleIndex];
    if (!sample) return;
    const nextState = createLivingProofState(sample);
    setProofState(nextState);
    setDraftAchievement(nextState.achievement);
    setPasteIssue(null);
    announceSync(
      `${sample.label} sample updated in all three views.`,
      MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED,
      MOTION_SIGNALS.TRUTH_TRANSFER,
    );
  };

  const applyPaste = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createLivingProofStateFromText(pasteText);
    if (!result.state) {
      setPasteIssue(result.issue);
      setStatus(result.issue ?? "Review the pasted text and try again.");
      return;
    }

    setProofState(result.state);
    setDraftAchievement(result.state.achievement);
    setPasteIssue(null);
    // Keep only the source-backed fields rendered by this demo; drop the raw
    // pasted block immediately after it is read.
    setPasteText("");
    announceSync(
      `Read ${result.detectedCount} résumé areas locally and updated all three views.`,
      MOTION_EVENTS.RESUME_IMPORT_FACT_DETECTED,
      MOTION_SIGNALS.TRUTH_TRANSFER,
    );
  };

  const applyAchievement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const achievement = normalizeLivingProofAchievement(draftAchievement);
    if (!achievement) return;
    setProofState((current) =>
      editLivingProofAchievement(current, achievement),
    );
    setDraftAchievement(achievement);
    announceSync(
      "Updated in three places: Living Page, Recruiter Lens, and share card.",
      MOTION_EVENTS.EDITOR_FIELD_CHANGED,
      MOTION_SIGNALS.EDIT_TO_PROOF,
    );
  };

  return (
    <section
      aria-labelledby="living-proof-title"
      className={styles.root}
      data-living-proof
      data-motion-sequence={motionSequence}
      data-theme-id={themeId}
    >
      <div className={styles.heading}>
        <p>Living proof / local to this tab</p>
        <h3 id="living-proof-title">
          Change one achievement. Watch it stay connected.
        </h3>
        <span>
          Pick a sample or paste résumé text. Nothing here is uploaded, saved,
          scored, or sent to AI.
        </span>
      </div>

      <div className={styles.workbench}>
        <div className={styles.sourcePanel}>
          <div className={styles.sourceHeader}>
            <span>01 / Source</span>
            <b>Memory only</b>
          </div>

          <fieldset className={styles.sampleFieldset}>
            <legend>Start with a sample</legend>
            <div className={styles.sampleOptions} data-proof-source-options>
              {LIVING_PROOF_SAMPLES.map((sample, index) => (
                <button
                  aria-pressed={proofState.sourceLabel.startsWith(sample.label)}
                  className={styles.sampleButton}
                  data-proof-sample={sample.id}
                  key={sample.id}
                  onClick={() => selectSample(index)}
                  type="button"
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {sample.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            aria-controls="living-proof-paste"
            aria-expanded={pasteOpen}
            className={styles.pasteToggle}
            data-proof-paste-toggle
            onClick={() => setPasteOpen((current) => !current)}
            type="button"
          >
            <span>Paste résumé text instead</span>
            <b aria-hidden="true">{pasteOpen ? "−" : "+"}</b>
          </button>

          {pasteOpen ? (
            <form
              className={styles.pasteForm}
              id="living-proof-paste"
              onSubmit={applyPaste}
            >
              <label htmlFor="living-proof-paste-input">
                Résumé text
                <textarea
                  aria-describedby="living-proof-paste-note"
                  data-proof-paste-input
                  id="living-proof-paste-input"
                  maxLength={MAX_RESUME_TEXT_CHARACTERS}
                  onChange={(event) => setPasteText(event.target.value)}
                  placeholder="Paste a résumé with your name and at least one clear result."
                  rows={5}
                  value={pasteText}
                />
              </label>
              <p id="living-proof-paste-note">
                Read in this tab. Refreshing clears it.
              </p>
              <button
                data-proof-paste-apply
                disabled={pasteText.trim().length < 40}
                type="submit"
              >
                Build local preview
              </button>
              {pasteIssue ? <p className={styles.issue}>{pasteIssue}</p> : null}
            </form>
          ) : null}

          <form className={styles.editorForm} onSubmit={applyAchievement}>
            <label htmlFor="living-proof-achievement">
              Featured achievement
              <span>
                {draftAchievement.length}/{LIVING_PROOF_ACHIEVEMENT_MAX}
              </span>
            </label>
            <textarea
              data-proof-achievement-input
              id="living-proof-achievement"
              maxLength={LIVING_PROOF_ACHIEVEMENT_MAX}
              onChange={(event) => setDraftAchievement(event.target.value)}
              rows={3}
              value={draftAchievement}
            />
            <button
              className={styles.applyButton}
              disabled={!draftAchievement.trim()}
              type="submit"
            >
              Apply to all views
            </button>
          </form>

          <button
            aria-controls="living-proof-lineage"
            aria-expanded={lineageOpen}
            className={styles.lineageToggle}
            data-proof-lineage-toggle
            onClick={() => setLineageOpen((current) => !current)}
            type="button"
          >
            <span>
              <i aria-hidden="true" />
              {proofState.edited ? "Edited locally" : proofState.sourceLabel}
            </span>
            {lineageOpen ? "Hide source" : "Trace this fact"}
          </button>

          <div
            className={styles.lineage}
            data-motion-event={MOTION_EVENTS.RESUME_IMPORT_REVIEW_REQUIRED}
            data-motion-signal={MOTION_SIGNALS.REVIEW_GATE}
            data-proof-lineage
            hidden={!lineageOpen}
            id="living-proof-lineage"
          >
            <span>Original résumé line</span>
            <q data-proof-source-line>{proofState.sourceLine}</q>
            <p>
              {proofState.edited
                ? "The original stays visible. The new wording is marked as your local edit."
                : "This wording came from the selected source. MyLivingPage did not invent it."}
            </p>
          </div>
        </div>

        <div className={styles.outputPanel}>
          <div className={styles.outputHeader}>
            <div>
              <span>02 / Correspondence</span>
              <strong>One fact · three recruiter-facing surfaces</strong>
            </div>
            <b>{theme.name} world</b>
          </div>

          <div
            aria-label="Three synchronized outputs"
            className={styles.syncRail}
            role="list"
          >
            <i aria-hidden="true" />
            {[
              ["01", "Living Page"],
              ["02", "Recruiter Lens"],
              ["03", "Share card"],
            ].map(([number, label]) => (
              <span key={label} role="listitem">
                <b>{number}</b>
                {label}
              </span>
            ))}
            {motionSequence > 0 ? (
              <em
                aria-hidden="true"
                className={styles.syncSignal}
                data-motion-event={motionEvent}
                data-motion-signal={motionSignal}
                data-proof-sync-signal
                key={motionSequence}
              />
            ) : null}
          </div>

          <div className={styles.pageAndRecruiter}>
            <article
              className={`${styles.pageExcerpt} ${
                recruiterLens ? styles.pageExcerptLens : ""
              }`}
              data-proof-output="page"
              id="living-proof-page-excerpt"
            >
              <div className={styles.browserBar}>
                <span>mylivingpage.com/{projection.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}</span>
                <b>Live preview</b>
              </div>
              <div className={styles.pageBody}>
                <span className={styles.pageKicker}>Living Page / {theme.name}</span>
                <h4>{projection.name}</h4>
                <p className={styles.pageRole}>{projection.role}</p>
                <p
                  className={styles.fact}
                  data-proof-fact="achievement"
                >
                  {projection.achievement}
                </p>
                <div className={styles.skillRow}>
                  {projection.skills.slice(0, 3).map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
                <ol aria-label="Recruiter scan order" className={styles.scanOrder}>
                  <li>Role</li>
                  <li>Result</li>
                  <li>Skills</li>
                </ol>
              </div>
            </article>

            <article
              className={styles.recruiterExcerpt}
              data-proof-output="recruiter"
              data-recruiter-lens-panel
            >
              <div className={styles.recruiterHeader}>
                <div>
                  <span>Recruiter Lens</span>
                  <strong>What reads first</strong>
                </div>
                <button
                  aria-controls="living-proof-page-excerpt"
                  aria-pressed={recruiterLens}
                  data-recruiter-lens-toggle
                  onClick={() => setRecruiterLens((current) => !current)}
                  type="button"
                >
                  {recruiterLens ? "Lens on" : "Show lens"}
                </button>
              </div>
              <dl>
                <div>
                  <dt>Exact role</dt>
                  <dd>{projection.role}</dd>
                </div>
                <div>
                  <dt>Lead proof</dt>
                  <dd data-proof-fact="achievement">
                    {projection.achievement}
                  </dd>
                </div>
                <div>
                  <dt>Searchable skills</dt>
                  <dd>
                    {projection.skills.length > 0
                      ? projection.skills.slice(0, 3).join(" · ")
                      : "No skills detected"}
                  </dd>
                </div>
              </dl>
              <small>Source-backed only · no ranking or invented score</small>
            </article>
          </div>

          <article
            className={styles.shareExcerpt}
            data-motion-event={
              motionSequence > 0 ? MOTION_EVENTS.SHARE_ARTIFACT_READY : undefined
            }
            data-motion-signal={MOTION_SIGNALS.SHARE_HANDOFF}
            data-proof-output="share-card"
          >
            <div className={styles.sharePlate}>
              <div className={styles.shareIdentity}>
                <span>MyLivingPage / Living Resume</span>
                <strong>{projection.name}</strong>
                <p>{projection.role}</p>
              </div>
              <div className={styles.shareTags}>
                {projection.skills.slice(0, 2).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
              <MiniQr />
            </div>
            <div className={styles.linkedProof}>
              <span>Lead proof on the linked page</span>
              <strong data-proof-fact="achievement">
                {projection.achievement}
              </strong>
            </div>
          </article>

          <p
            aria-atomic="true"
            aria-live="polite"
            className={styles.status}
            data-proof-sync-status
            role="status"
          >
            <i aria-hidden="true" />
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}
