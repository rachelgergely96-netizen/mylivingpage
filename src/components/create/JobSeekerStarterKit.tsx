"use client";

import {
  JOB_SEEKER_AUDIENCE_OPTIONS,
  JOB_SEEKER_GOAL_OPTIONS,
  JOB_SEEKER_ROLE_OPTIONS,
  describeJobSeekerProfile,
} from "@/lib/job-seeker-starter";
import type {
  JobSeekerAudience,
  JobSeekerGoal,
  JobSeekerProfile,
  JobSeekerRoleTrack,
} from "@/types/resume";

interface JobSeekerStarterKitProps {
  value: JobSeekerProfile | null;
  onChange: (next: JobSeekerProfile) => void;
  compact?: boolean;
}

function SelectionRow<TValue extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: Array<{ id: TValue; label: string }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.id === value;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                  : "border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.62)] hover:border-[rgba(59,130,246,0.3)] hover:text-[#93C5FD]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function JobSeekerStarterKit({
  value,
  onChange,
  compact = false,
}: JobSeekerStarterKitProps) {
  const current =
    value ??
    ({
      role_track: "engineering",
      primary_goal: "land_interviews",
      target_audience: "recruiter",
    } satisfies JobSeekerProfile);
  const summary = describeJobSeekerProfile(current);
  const roleOption = JOB_SEEKER_ROLE_OPTIONS.find(
    (option) => option.id === current.role_track,
  );

  return (
    <section
      className={`rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] ${
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6"
      }`}
    >
      <div className="max-w-3xl">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
          Job-seeker starter kit
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
          Set the page up for the kind of search you are actually in.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.68)]">
          Choose your role, goal, and target audience once. We will use that to suggest a sharper
          variant, stronger proof framing, and cleaner follow-up language.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <SelectionRow<JobSeekerRoleTrack>
          label="Role track"
          items={JOB_SEEKER_ROLE_OPTIONS.map((option) => ({
            id: option.id,
            label: option.label,
          }))}
          value={current.role_track}
          onChange={(roleTrack) => onChange({ ...current, role_track: roleTrack })}
        />

        <SelectionRow<JobSeekerGoal>
          label="Primary goal"
          items={JOB_SEEKER_GOAL_OPTIONS.map((option) => ({
            id: option.id,
            label: option.label,
          }))}
          value={current.primary_goal}
          onChange={(primaryGoal) => onChange({ ...current, primary_goal: primaryGoal })}
        />

        <SelectionRow<JobSeekerAudience>
          label="Main audience"
          items={JOB_SEEKER_AUDIENCE_OPTIONS.map((option) => ({
            id: option.id,
            label: option.label,
          }))}
          value={current.target_audience}
          onChange={(targetAudience) => onChange({ ...current, target_audience: targetAudience })}
        />
      </div>

      {summary ? (
        <div className="mt-5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
            Current setup
          </p>
          <p className="mt-2 text-sm text-[#F0F4FF]">
            {summary.role} page tuned to {summary.goal.toLowerCase()} with {summary.audience.toLowerCase()} as the first audience.
          </p>
          {roleOption ? (
            <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
              {roleOption.headlineHint} {roleOption.proofPrompt}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
