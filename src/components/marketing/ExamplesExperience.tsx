"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SamplePageCard from "@/components/marketing/SamplePageCard";
import { MOTION_EVENTS, MOTION_SIGNALS } from "@/lib/motion";
import type {
  MarketingSampleGroup,
  ResolvedMarketingSample,
} from "@/lib/marketing-samples";
import styles from "./ExamplesExperience.module.css";

interface ResolvedMarketingSampleGroup extends MarketingSampleGroup {
  samples: ResolvedMarketingSample[];
}

interface ExamplesExperienceProps {
  sampleGroups: ResolvedMarketingSampleGroup[];
  signupHref: string;
}

function getInitialGroup(sampleGroups: ResolvedMarketingSampleGroup[]) {
  const group =
    sampleGroups.find((candidate) => candidate.id === "when-a-recruiter-clicks") ??
    sampleGroups[0];

  if (!group || !group.samples[0]) {
    throw new Error("ExamplesExperience requires at least one sample.");
  }

  return group;
}

function getMomentLabel(groupId: string) {
  switch (groupId) {
    case "after-you-apply":
      return "After applying";
    case "when-a-recruiter-clicks":
      return "Recruiter interested";
    case "when-a-referral-asks":
      return "Referral asks";
    default:
      return "Another moment";
  }
}

function getMomentHelper(groupId: string) {
  switch (groupId) {
    case "after-you-apply":
      return "A clear follow-up after you apply.";
    case "when-a-recruiter-clicks":
      return "They have your résumé; give them one scannable link.";
    case "when-a-referral-asks":
      return "A warm introduction they can understand and forward.";
    default:
      return "One link that makes your work easier to understand.";
  }
}

export default function ExamplesExperience({
  sampleGroups,
  signupHref,
}: ExamplesExperienceProps) {
  const initialGroup = getInitialGroup(sampleGroups);
  const [activeGroupId, setActiveGroupId] = useState(initialGroup.id);
  const [activeSampleId, setActiveSampleId] = useState(initialGroup.samples[0].id);
  const [selectionSequence, setSelectionSequence] = useState(0);
  const groupTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const activeGroup =
    sampleGroups.find((group) => group.id === activeGroupId) ?? initialGroup;
  const activeSample =
    activeGroup.samples.find((sample) => sample.id === activeSampleId) ??
    activeGroup.samples[0] ??
    initialGroup.samples[0];

  useEffect(() => {
    let requestedSampleId = "";
    try {
      requestedSampleId = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }

    if (!requestedSampleId) return;

    const requestedGroup = sampleGroups.find((group) =>
      group.samples.some((sample) => sample.id === requestedSampleId),
    );
    if (!requestedGroup) return;

    setActiveGroupId(requestedGroup.id);
    setActiveSampleId(requestedSampleId);
    window.requestAnimationFrame(() => {
      document.getElementById(requestedSampleId)?.scrollIntoView({ block: "start" });
    });
  }, [sampleGroups]);

  useEffect(() => {
    const scrollRoot = stageRef.current?.querySelector<HTMLElement>(
      '[data-analytics-scroll-root="true"]',
    );
    if (scrollRoot) scrollRoot.scrollTo({ top: 0, behavior: "auto" });
  }, [activeSample.id]);

  const updateHash = (sampleId: string) => {
    const url = new URL(window.location.href);
    url.hash = sampleId;
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const announceSelection = () => {
    setSelectionSequence((sequence) => sequence + 1);
  };

  const selectGroup = (group: ResolvedMarketingSampleGroup) => {
    const nextSample = group.samples[0];
    if (!nextSample) return;

    setActiveGroupId(group.id);
    setActiveSampleId(nextSample.id);
    announceSelection();
    updateHash(nextSample.id);
  };

  const selectSample = (sample: ResolvedMarketingSample) => {
    setActiveSampleId(sample.id);
    announceSelection();
    updateHash(sample.id);
  };

  const handleGroupKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % sampleGroups.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + sampleGroups.length) % sampleGroups.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = sampleGroups.length - 1;
    } else {
      return;
    }

    const nextGroup = sampleGroups[nextIndex];
    if (!nextGroup) return;

    event.preventDefault();
    selectGroup(nextGroup);
    groupTabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      id="examples-hero"
      className={styles.experience}
      aria-labelledby="examples-title"
      data-examples-experience
      data-site-ui
    >
      <header id="examples-hero-intro" className={styles.intro}>
        <div>
          <p className="site-eyebrow">Sample Living Pages</p>
          <h1 id="examples-title" className={styles.title}>
            See a Living Page in action.
          </h1>
          <p className={styles.lead}>
            Choose an example and explore the full page right here.
          </p>
          <p className={styles.disclosure}>
            Made-up profiles for illustration — not customer stories.
          </p>
        </div>
        <div className={styles.introActions}>
          <div className={styles.heroActions}>
            <Link href={signupHref} className="site-button site-button-primary">
              Create my free page
            </Link>
          </div>
          <p className={styles.trustLine}>
            Free · Private until published · Keep your résumé
          </p>
        </div>
      </header>

      <div className={styles.showcase}>
        <aside className={styles.controlPanel} data-example-switcher>
          <div id="choose-a-moment" className={styles.momentPicker}>
            <div className={styles.pickerHeading}>
              <p className="site-eyebrow">Choose an example</p>
              <h2>When would you send it?</h2>
            </div>

            <div
              className={styles.momentTabs}
              role="tablist"
              aria-orientation="vertical"
              aria-label="Choose when you would share a Living Page"
            >
              {sampleGroups.map((group, index) => {
                const selected = group.id === activeGroup.id;
                return (
                  <button
                    key={group.id}
                    ref={(node) => {
                      groupTabRefs.current[index] = node;
                    }}
                    id={`example-moment-${group.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="example-stage"
                    tabIndex={selected ? 0 : -1}
                    data-active={selected}
                    onClick={() => selectGroup(group)}
                    onKeyDown={(event) => handleGroupKeyDown(event, index)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{getMomentLabel(group.id)}</strong>
                  </button>
                );
              })}
            </div>

            {activeGroup.samples.length > 1 ? (
              <div
                className={styles.sampleChoices}
                role="group"
                aria-label="Choose a sample role"
              >
                {activeGroup.samples.map((sample) => {
                  const selected = sample.id === activeSample.id;
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      aria-pressed={selected}
                      data-active={selected}
                      onClick={() => selectSample(sample)}
                    >
                      <span>{sample.demo.data.headline}</span>
                      <small>{sample.audienceLabel}</small>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <p className={styles.selectionStatus}>
              Showing: <strong>{activeSample.roleLabel}</strong>
            </p>
            <p className={styles.groupDescription}>{getMomentHelper(activeGroup.id)}</p>
          </div>
        </aside>

        <div
          ref={stageRef}
          id="example-stage"
          className={styles.stage}
          role="tabpanel"
          aria-labelledby={`example-moment-${activeGroup.id}`}
          data-example-stage
        >
          <div
            className={styles.correspondence}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-selection-correspondence
            data-motion-event={
              selectionSequence > 0 ? MOTION_EVENTS.EXAMPLE_CONTEXT_CHANGED : undefined
            }
            data-motion-signal={MOTION_SIGNALS.CAREER_CHAPTERS}
            data-motion-sequence={selectionSequence || undefined}
            data-motion-state={selectionSequence > 0 ? "changed" : undefined}
            data-motion-target="example-context"
          >
            <span
              className={styles.correspondenceSignal}
              data-example-correspondence-indicator
              aria-hidden="true"
            />
            <span>
              <strong>{getMomentLabel(activeGroup.id)}</strong>
              <span aria-hidden="true"> → </span>
              {activeSample.demo.data.headline}
            </span>
          </div>
          <SamplePageCard
            sample={activeSample}
            anchorId={activeSample.id}
            previewHeight="clamp(22rem, 38vw, 30rem)"
          />
        </div>
      </div>
    </section>
  );
}
