import type { ThemeRenderer } from "../types";
import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";

const TAU = Math.PI * 2;

interface NodePoint {
  x: number;
  y: number;
}

const NODES: NodePoint[] = [
  { x: 0.16, y: 0.26 },
  { x: 0.34, y: 0.2 },
  { x: 0.58, y: 0.24 },
  { x: 0.78, y: 0.18 },
  { x: 0.22, y: 0.56 },
  { x: 0.46, y: 0.48 },
  { x: 0.7, y: 0.58 },
  { x: 0.86, y: 0.42 },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [1, 5],
  [2, 5],
  [2, 6],
  [3, 7],
  [4, 5],
  [5, 6],
  [6, 7],
];

export const AXIOM_STORY_PATH = [0, 1, 2, 3, 7, 6, 5, 4] as const;

const STORY_INDEX_BY_NODE = AXIOM_STORY_PATH.reduce<number[]>((indices, node, index) => {
  indices[node] = index;
  return indices;
}, []);

export interface AxiomStoryPosition {
  fromNode: number;
  toNode: number;
  segmentProgress: number;
}

/** Locates a continuous page-story position along Axiom's connected graph path. */
export function resolveAxiomStoryPosition(
  storyProgress: number,
): AxiomStoryPosition {
  const position =
    finiteClamp(storyProgress, 0, 1) * (AXIOM_STORY_PATH.length - 1);
  const segmentIndex = Math.min(
    AXIOM_STORY_PATH.length - 2,
    Math.floor(position),
  );
  return {
    fromNode: AXIOM_STORY_PATH[segmentIndex],
    toNode: AXIOM_STORY_PATH[segmentIndex + 1],
    segmentProgress: position - segmentIndex,
  };
}

export function nodeForSection(section: string | null): number | null {
  switch (section) {
    case "summary":
      return 0;
    case "proof":
      return 1;
    case "testimonials":
      return 2;
    case "experience":
      return 3;
    case "projects":
      return 7;
    case "education":
      return 6;
    case "skills":
      return 5;
    case "certifications":
      return 4;
    default:
      return null;
  }
}

export const renderAxiom: ThemeRenderer = (ctx, w, h, t, mx, my, _deltaSeconds, motion) => {
  const pageMotion = resolveThemeMotion(motion);
  const velocity = finiteClamp(pageMotion.scrollVelocity / 3, -1, 1);
  const activeNode = nodeForSection(pageMotion.activeSection);
  const semanticStoryIndex =
    activeNode === null ? undefined : STORY_INDEX_BY_NODE[activeNode];
  const storyProgress =
    pageMotion.sectionCount > 0 || semanticStoryIndex === undefined
      ? pageMotion.storyProgress
      : semanticStoryIndex / (AXIOM_STORY_PATH.length - 1);
  const storyPosition = resolveAxiomStoryPosition(storyProgress);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#07111A");
  bg.addColorStop(0.55, "#071019");
  bg.addColorStop(1, "#03070B");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let x = 0; x <= w; x += 36) {
    ctx.strokeStyle = "rgba(120,155,215,0.03)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  const gridYOffset = (storyProgress * 36) % 36;
  for (let y = gridYOffset; y <= h; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const points = NODES.map((node, index) => ({
    x:
      w * node.x +
      Math.sin(t * (0.25 + index * 0.02) + index) * 10 +
      (mx - 0.5) * 14 +
      velocity * (node.y - 0.5) * 18 +
      (storyProgress - 0.5) * (node.y - 0.5) * 10,
    y:
      h * node.y +
      Math.cos(t * (0.2 + index * 0.03) + index) * 8 +
      (my - 0.5) * 12 +
      velocity * (node.x - 0.5) * 10 +
      (storyProgress - 0.5) * (node.x - 0.5) * 8,
  }));

  const storyFrom = points[storyPosition.fromNode];
  const storyTo = points[storyPosition.toNode];
  const storyX =
    storyFrom.x + (storyTo.x - storyFrom.x) * storyPosition.segmentProgress;
  const storyY =
    storyFrom.y + (storyTo.y - storyFrom.y) * storyPosition.segmentProgress;

  for (const [fromIndex, toIndex] of EDGES) {
    const from = points[fromIndex];
    const to = points[toIndex];
    const isStorySegment =
      (fromIndex === storyPosition.fromNode &&
        toIndex === storyPosition.toNode) ||
      (fromIndex === storyPosition.toNode &&
        toIndex === storyPosition.fromNode);
    const endpointWeight = Math.max(
      storyStepWeight(
        storyProgress,
        STORY_INDEX_BY_NODE[fromIndex],
        AXIOM_STORY_PATH.length,
      ),
      storyStepWeight(
        storyProgress,
        STORY_INDEX_BY_NODE[toIndex],
        AXIOM_STORY_PATH.length,
      ),
    );
    const chapterWeight = Math.max(endpointWeight * 0.5, Number(isStorySegment));
    const rawPulse =
      t * 0.18 +
      fromIndex * 0.13 +
      toIndex * 0.09 +
      storyProgress * 1.1 +
      velocity * 0.025;
    const pulse = ((rawPulse % 1) + 1) % 1;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = `rgba(142,186,255,${0.14 + chapterWeight * 0.22})`;
    ctx.lineWidth = 1 + chapterWeight * 0.55;
    ctx.stroke();

    const px = from.x + (to.x - from.x) * pulse;
    const py = from.y + (to.y - from.y) * pulse;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, TAU);
    ctx.fillStyle = "rgba(234,243,255,0.72)";
    ctx.fill();
  }

  ctx.save();
  ctx.translate(storyX, storyY);
  ctx.rotate(Math.PI * 0.25);
  ctx.fillStyle = "rgba(235,245,255,0.9)";
  ctx.fillRect(-3, -3, 6, 6);
  ctx.strokeStyle = "rgba(137,194,255,0.48)";
  ctx.lineWidth = 1;
  ctx.strokeRect(-7, -7, 14, 14);
  ctx.restore();

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    ctx.beginPath();
    ctx.moveTo(storyX, storyY);
    ctx.lineTo(focusX, focusY);
    ctx.strokeStyle = `rgba(164, 207, 255, ${0.18 + pageMotion.interactionImpulse * 0.28})`;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = "rgba(229, 244, 255, 0.78)";
    ctx.fillRect(focusX - 3, focusY - 3, 6, 6);
    if (pageMotion.interactionImpulse > 0.01) {
      const echoSize = 8 + (1 - pageMotion.interactionImpulse) * 30;
      ctx.strokeStyle = `rgba(137, 194, 255, ${pageMotion.interactionImpulse * 0.42})`;
      ctx.strokeRect(
        focusX - echoSize * 0.5,
        focusY - echoSize * 0.5,
        echoSize,
        echoSize,
      );
    }
  }

  for (let i = 0; i < points.length - 2; i += 2) {
    const a = points[i];
    const b = points[i + 1];
    const radius = Math.hypot(b.x - a.x, b.y - a.y) * 0.8;
    ctx.beginPath();
    ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, radius, Math.PI * 1.1 + i * 0.08, Math.PI * 1.6 + i * 0.08);
    ctx.strokeStyle = `rgba(118,178,255,${0.08 + i * 0.01})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const chapterWeight = storyStepWeight(
      storyProgress,
      STORY_INDEX_BY_NODE[i],
      AXIOM_STORY_PATH.length,
    );
    const glow = 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 1.4));
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6 + chapterWeight * 4, 0, TAU);
    ctx.fillStyle = `rgba(130,180,255,${glow * (0.25 + chapterWeight * 0.2)})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.4 + chapterWeight, 0, TAU);
    ctx.fillStyle = "rgba(235,245,255,0.8)";
    ctx.fill();
  }
};
