import type { AnalyticsRangeKey } from "@/lib/analytics/constants";

export interface AnalyticsRangeMotionIntent {
  pageId: string;
  fromRange: AnalyticsRangeKey;
  toRange: AnalyticsRangeKey;
  sequence: number;
}

export interface AnalyticsRangeMotionResolution {
  rangeKey: AnalyticsRangeKey;
  sequence: number;
}

export interface AnalyticsRangeMotionIntentState {
  pending: AnalyticsRangeMotionIntent | null;
  nextSequence: number;
}

export const INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE: AnalyticsRangeMotionIntentState = {
  pending: null,
  nextSequence: 1,
};

export function isCurrentAnalyticsRangeMotionResolution(
  resolution: AnalyticsRangeMotionResolution | null,
  rangeKey: AnalyticsRangeKey,
  canResolve: boolean,
): resolution is AnalyticsRangeMotionResolution {
  return canResolve && resolution?.rangeKey === rangeKey;
}

interface MarkAnalyticsRangeIntentInput {
  pageId: string;
  fromRange: AnalyticsRangeKey;
  toRange: AnalyticsRangeKey;
}

interface ConsumeAnalyticsRangeIntentInput {
  pageId: string;
  renderedRange: AnalyticsRangeKey;
  canResolve: boolean;
}

/**
 * Records a range-control interaction without treating same-range clicks as changes.
 * The returned state is intentionally document-local so reloads and history restores
 * cannot replay an old animation.
 */
export function markAnalyticsRangeIntent(
  state: AnalyticsRangeMotionIntentState,
  input: MarkAnalyticsRangeIntentInput,
): AnalyticsRangeMotionIntentState {
  if (input.fromRange === input.toRange) {
    return state;
  }

  const sequence = Math.max(1, Math.trunc(state.nextSequence));

  return {
    pending: {
      ...input,
      sequence,
    },
    nextSequence: sequence + 1,
  };
}

/**
 * Consumes only the intent whose destination has actually rendered. Unsupported
 * results still clear their matching intent, but never resolve a motion event.
 */
export function consumeAnalyticsRangeIntent(
  state: AnalyticsRangeMotionIntentState,
  input: ConsumeAnalyticsRangeIntentInput,
): {
  state: AnalyticsRangeMotionIntentState;
  resolved: AnalyticsRangeMotionIntent | null;
} {
  const pending = state.pending;

  if (
    !pending ||
    pending.pageId !== input.pageId ||
    pending.toRange !== input.renderedRange
  ) {
    return { state, resolved: null };
  }

  return {
    state: {
      ...state,
      pending: null,
    },
    resolved: input.canResolve ? pending : null,
  };
}

let clientIntentState = INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE;

export function markClientAnalyticsRangeIntent(input: MarkAnalyticsRangeIntentInput) {
  clientIntentState = markAnalyticsRangeIntent(clientIntentState, input);
}

export function consumeClientAnalyticsRangeIntent(
  input: ConsumeAnalyticsRangeIntentInput,
) {
  const result = consumeAnalyticsRangeIntent(clientIntentState, input);
  clientIntentState = result.state;
  return result.resolved;
}
