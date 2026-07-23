"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  MarketingSampleGroup,
  ResolvedMarketingSample,
} from "@/lib/marketing-samples";
import SamplePageCard from "@/components/marketing/SamplePageCard";
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
      return "A recruiter is interested";
    case "when-a-referral-asks":
      return "A referral asks";
    default:
      return "Choose this moment";
  }
}

export default function ExamplesExperience({
  sampleGroups,
  signupHref,
}: ExamplesExperienceProps) {
  const initialGroup = getInitialGroup(sampleGroups);
  const [activeGroupId, setActiveGroupId] = useState(initialGroup.id);
  const [activeSampleId, setActiveSampleId] = useState(initialGroup.samples[0].id);
  const groupTabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

    if (!requestedSampleId) {
      return;
    }

    const requestedGroup = sampleGroups.find((group) =>
      group.samples.some((sample) => sample.id === requestedSampleId),
    );
    if (!requestedGroup) {
      return;
    }

    setActiveGroupId(requestedGroup.id);
    setActiveSampleId(requestedSampleId);
    window.requestAnimationFrame(() => {
      document.getElementById(requestedSampleId)?.scrollIntoView({ block: "start" });
    });
  }, [sampleGroups]);

  const updateHash = (sampleId: string) => {
    const url = new URL(window.location.href);
    url.hash = sampleId;
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const selectGroup = (group: ResolvedMarketingSampleGroup) => {
    const nextSample = group.samples[0];
    if (!nextSample) {
      return;
    }

    setActiveGroupId(group.id);
    setActiveSampleId(nextSample.id);
    updateHash(nextSample.id);
  };

  const selectSample = (sample: ResolvedMarketingSample) => {
    setActiveSampleId(sample.id);
    updateHash(sample.id);
  };

  const handleGroupKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % sampleGroups.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + sampleGroups.length) % sampleGroups.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = sampleGroups.length - 1;
    } else {
      return;
    }

    const nextGroup = sampleGroups[nextIndex];
    if (!nextGroup) {
      return;
    }

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
      <div className={styles.controlPanel}>
        <div id="examples-hero-intro">
          <p className="site-eyebrow">Realistic sample pages</p>
          <h1 id="examples-title" className={styles.title}>
            See what someone sees when they open your link.
          </h1>
          <p className={styles.lead}>
            Choose a situation, then open the sample to see how a Living Page helps someone
            understand your work without replacing your résumé.
          </p>
          <p className={styles.disclosure}>
            These use made-up names and sample information. They are examples, not customer
            stories.
          </p>

          <div className={styles.heroActions}>
            <Link href={signupHref} className="site-button site-button-primary">
              Create my free page
            </Link>
            <a href="#choose-a-moment" className="site-button site-button-secondary">
              Choose a situation
            </a>
          </div>

          <div className={styles.trustStrip} aria-label="Product assurances">
            <span>Completely free</span>
            <span>Private until published</span>
            <span>Keep using your résumé</span>
          </div>
        </div>

        <div className={styles.signalBlock} aria-label="What happens after you share your link">
          <p className="site-eyebrow">What the link changes</p>
          <div key={activeSample.id} className={styles.signalFlow}>
            <span className={styles.signalPulse} aria-hidden="true" />
            <span>
              <small>01</small>
              You send one link
            </span>
            <span>
              <small>02</small>
              They open it
            </span>
            <span>
              <small>03</small>
              They understand faster
            </span>
          </div>
          <p className={styles.resumeRule}>
            Use your résumé PDF when an application asks for a file. Use your Living Page when
            a person can click.
          </p>
        </div>

        <div id="choose-a-moment" className={styles.momentPicker}>
          <div className={styles.pickerHeading}>
            <p className="site-eyebrow">Choose a situation</p>
            <h2>When would you send your link?</h2>
          </div>

          <div
            className={styles.momentTabs}
            role="tablist"
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
                  <small>{group.title}</small>
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

          <p className={styles.selectionStatus} role="status" aria-live="polite">
            Now showing: <strong>{activeSample.roleLabel}</strong>
          </p>
          <p className={styles.groupDescription}>{activeGroup.description}</p>
        </div>
      </div>

      <div
        id="example-stage"
        key={`${activeGroup.id}-${activeSample.id}`}
        className={styles.stage}
        role="tabpanel"
        aria-labelledby={`example-moment-${activeGroup.id}`}
        data-example-stage
      >
        <SamplePageCard
          sample={activeSample}
          anchorId={activeSample.id}
          previewHeight="clamp(22rem, 42vw, 32rem)"
          signupHref={`/signup?ref=examples_${activeSample.id}&next=/create`}
        />
      </div>
    </section>
  );
}
