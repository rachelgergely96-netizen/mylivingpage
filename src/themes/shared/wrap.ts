/**
 * Soft toroidal wrapping for drifting scene elements.
 *
 * Wrapping a particle's intrinsic position (base + drift) with a plain modulo
 * makes it teleport across the seam, and the jump becomes obvious once pointer
 * parallax is layered on top. `wrapSoft` wraps only the intrinsic position and
 * returns an alpha that smoothly fades to zero inside an edge margin, so the
 * seam crossing happens invisibly. Parallax offsets must be added AFTER
 * wrapping — folding them into the wrapped value moves the seam with the
 * pointer and reintroduces the pop.
 */
export interface SoftWrap {
  /** Wrapped position in [0, period). Add parallax offsets to this value. */
  u: number;
  /** Smoothstep visibility weight: 1 in the interior, 0 at the seam. */
  alpha: number;
}

export function wrapSoft(value: number, period: number, margin = 0.08): SoftWrap {
  const p = Number.isFinite(period) && period > 0 ? period : 1;
  const raw = Number.isFinite(value) ? value : 0;
  const u = ((raw % p) + p) % p;
  const edge = Math.min(u, p - u);
  const marginWidth = Math.min(0.5, Math.max(margin, 0.0001)) * p;
  if (edge >= marginWidth) {
    return { u, alpha: 1 };
  }
  const t = edge / marginWidth;
  return { u, alpha: t * t * (3 - 2 * t) };
}
