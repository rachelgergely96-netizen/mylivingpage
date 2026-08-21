export interface LivingPageViewportInput {
  rootTop: number;
  rootHeight: number;
  stickyInset?: number;
}

export interface LivingPageViewportGeometry {
  viewportTop: number;
  viewportHeight: number;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Returns the visible chapter viewport after accounting for a sticky rail.
 *
 * Both the rail scroll-spy and the canvas bridge must use this geometry so
 * their active chapter cannot disagree near a section boundary.
 */
export function calculateLivingPageViewport({
  rootTop,
  rootHeight,
  stickyInset = 0,
}: LivingPageViewportInput): LivingPageViewportGeometry {
  const safeRootTop = finiteOr(rootTop, 0);
  const safeRootHeight = Math.max(1, finiteOr(rootHeight, 1));
  const safeStickyInset = Math.min(
    Math.max(0, finiteOr(stickyInset, 0)),
    Math.max(0, safeRootHeight - 1),
  );

  return {
    viewportTop: safeRootTop + safeStickyInset,
    viewportHeight: Math.max(1, safeRootHeight - safeStickyInset),
  };
}
