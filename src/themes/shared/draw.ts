/**
 * Small shared canvas-drawing helpers used across the theme renderers.
 *
 * These were previously injected as globals in the theme-lab preview; the
 * renderers import them here so the modules stay self-contained.
 */

/**
 * Fills a soft radial-gradient glow disc from `rgba0` (center) to `rgba1`
 * (edge). Pass "transparent" for `rgba1` for a glow that fades to nothing.
 */
export function softGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgba0: string,
  rgba1: string,
): void {
  const radius = r > 0 ? r : 0.01;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba0);
  gradient.addColorStop(1, rgba1);
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/**
 * A soft round bloom kept under the historical name `star4`. The product
 * deliberately avoids cross-shaped light glints, so this renders a round glow
 * (not a diffraction cross); the name is retained so renderers need no rewrite.
 */
export function star4(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  _width: number,
  color: string,
): void {
  softGlow(ctx, x, y, Math.max(1, len * 1.05), color, "transparent");
}
