"use client";

import { useEffect, useRef } from "react";

interface CosmicBackgroundProps {
  activeWhileId?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  hue: number;
  alpha: number;
}

interface CosmicPoint {
  x: number;
  y: number;
}

type CosmicLinkSegment = readonly [startX: number, startY: number, endX: number, endY: number];

export const COSMIC_BACKGROUND_MAX_FPS = 30;
export const COSMIC_BACKGROUND_FRAME_INTERVAL_MS = 1000 / COSMIC_BACKGROUND_MAX_FPS;

const LINK_OPACITIES = [0.02, 0.06, 0.1, 0.14] as const;
const FRAME_TIMESTAMP_EPSILON_MS = 0.01;

export function redistributeCosmicPoints(
  points: CosmicPoint[],
  previousWidth: number,
  previousHeight: number,
  nextWidth: number,
  nextHeight: number,
) {
  if (previousWidth <= 0 || previousHeight <= 0 || nextWidth <= 0 || nextHeight <= 0) {
    return;
  }

  const scaleX = nextWidth / previousWidth;
  const scaleY = nextHeight / previousHeight;

  for (const point of points) {
    point.x *= scaleX;
    point.y *= scaleY;
  }
}

export function shouldPaintCosmicFrame(now: number, lastPaint: number | null) {
  return lastPaint === null
    || now - lastPaint + FRAME_TIMESTAMP_EPSILON_MS >= COSMIC_BACKGROUND_FRAME_INTERVAL_MS;
}

export function buildCosmicLinkBatches(
  points: CosmicPoint[],
  linkDistance: number,
  maxLinksPerPoint: number,
): CosmicLinkSegment[][] {
  const batches = LINK_OPACITIES.map(() => [] as CosmicLinkSegment[]);
  if (linkDistance <= 0 || maxLinksPerPoint <= 0) {
    return batches;
  }

  const linkDistanceSquared = linkDistance * linkDistance;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    let links = 0;

    for (let other = index + 1; other < points.length && links < maxLinksPerPoint; other += 1) {
      const neighbor = points[other];
      const dx = point.x - neighbor.x;
      const dy = point.y - neighbor.y;
      const distanceSquared = dx * dx + dy * dy;

      // Avoid the square root for the overwhelming majority of pairs that are
      // too far apart to connect.
      if (distanceSquared >= linkDistanceSquared) {
        continue;
      }

      const strength = (1 - Math.sqrt(distanceSquared) / linkDistance) * 0.16;
      const bucketIndex = Math.min(
        LINK_OPACITIES.length - 1,
        Math.floor(strength / 0.04),
      );
      batches[bucketIndex].push([point.x, point.y, neighbor.x, neighbor.y]);
      links += 1;
    }
  }

  return batches;
}

// Deep-space constellation field rendered with the 2D canvas API. This replaces
// an earlier three.js/WebGL implementation: the effect is decorative, so the
// ~150KB three.js runtime it used to pull onto every homepage visit was pure
// weight. A drifting particle field with proximity links and gentle pointer
// parallax reproduces the look at a fraction of the cost, and keeps the same
// motion/visibility discipline (reduced-motion static frame, off-screen pause).
export default function CosmicBackground({ activeWhileId }: CosmicBackgroundProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      canvas.dataset.ambient = "static";
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const coarsePointer = coarsePointerQuery.matches;

    const particleCount = coarsePointer ? 90 : 150;
    const linkDistance = coarsePointer ? 0 : 130;
    const maxLinksPerParticle = 5;

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    const particles: Particle[] = [];
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let animationId: number | null = null;
    let elapsed = 0;
    let lastPaint: number | null = null;
    let sceneVisible = true;
    let visibilityObserver: IntersectionObserver | null = null;

    const seedParticles = () => {
      particles.length = 0;
      for (let index = 0; index < particleCount; index += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: 0.35 + Math.random() * 0.65,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          hue: 205 + Math.random() * 45,
          alpha: 0.35 + Math.random() * 0.5,
        });
      }
    };

    const resize = () => {
      const previousWidth = width;
      const previousHeight = height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 2);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (particles.length === 0) {
        seedParticles();
      } else {
        redistributeCosmicPoints(particles, previousWidth, previousHeight, width, height);
      }
    };

    const drawFrame = (animate: boolean, deltaSeconds = 0) => {
      const frameScale = animate ? Math.max(0, deltaSeconds * 60) : 0;
      if (animate) {
        const parallaxEase = 1 - Math.pow(0.95, frameScale);
        mouse.x += (mouse.tx - mouse.x) * parallaxEase;
        mouse.y += (mouse.ty - mouse.y) * parallaxEase;
      }
      const parallaxX = mouse.x * 18;
      const parallaxY = mouse.y * 18;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      const screenPoints: CosmicPoint[] = [];

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (animate) {
          particle.x += (particle.vx + Math.sin(elapsed * 0.4 + index) * 0.02) * frameScale;
          particle.y += (particle.vy + Math.cos(elapsed * 0.32 + index) * 0.02) * frameScale;
          if (particle.x < -20) particle.x = width + 20;
          if (particle.x > width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = height + 20;
          if (particle.y > height + 20) particle.y = -20;
        }

        const px = particle.x + parallaxX * particle.z;
        const py = particle.y + parallaxY * particle.z;
        screenPoints.push({ x: px, y: py });
      }

      const linkBatches = buildCosmicLinkBatches(screenPoints, linkDistance, maxLinksPerParticle);
      context.lineWidth = 1;
      for (let bucketIndex = 0; bucketIndex < linkBatches.length; bucketIndex += 1) {
        const segments = linkBatches[bucketIndex];
        if (segments.length === 0) {
          continue;
        }
        context.strokeStyle = `rgba(96, 165, 250, ${LINK_OPACITIES[bucketIndex]})`;
        context.beginPath();
        for (const [startX, startY, endX, endY] of segments) {
          context.moveTo(startX, startY);
          context.lineTo(endX, endY);
        }
        context.stroke();
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const { x: px, y: py } = screenPoints[index];
        const radius = particle.z * 1.6;
        const twinkle = animate ? 0.85 + Math.sin(elapsed * 1.6 + index) * 0.15 : 1;
        context.fillStyle = `hsla(${particle.hue}, 80%, 72%, ${(particle.alpha * twinkle).toFixed(3)})`;
        context.beginPath();
        context.arc(px, py, radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = "source-over";
    };

    const animateLoop = (now: number) => {
      if (shouldPaintCosmicFrame(now, lastPaint)) {
        const delta = lastPaint === null
          ? 1 / 60
          : Math.min(0.05, (now - lastPaint) * 0.001);
        lastPaint = now;
        elapsed += delta;
        drawFrame(true, delta);
      }
      animationId = window.requestAnimationFrame(animateLoop);
    };

    const stop = () => {
      lastPaint = null;
      if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    const start = () => {
      stop();
      if (document.hidden || reducedMotionQuery.matches || !sceneVisible) {
        drawFrame(false);
        return;
      }
      animationId = window.requestAnimationFrame(animateLoop);
    };

    const syncMotionPreference = () => {
      canvas.dataset.ambient = reducedMotionQuery.matches ? "static" : "full";
      start();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (reducedMotionQuery.matches) {
        return;
      }
      mouse.tx = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    const handleResize = () => {
      resize();
      drawFrame(false);
    };

    resize();
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);
    if (!coarsePointer) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }
    reducedMotionQuery.addEventListener?.("change", syncMotionPreference);

    if (activeWhileId && "IntersectionObserver" in window) {
      const activeElement = document.getElementById(activeWhileId);
      if (activeElement) {
        visibilityObserver = new IntersectionObserver(
          ([entry]) => {
            sceneVisible = Boolean(entry?.isIntersecting);
            if (sceneVisible) {
              start();
            } else {
              stop();
            }
          },
          { rootMargin: "120px 0px", threshold: 0 },
        );
        visibilityObserver.observe(activeElement);
      }
    }

    syncMotionPreference();

    return () => {
      stop();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("mousemove", handleMouseMove);
      reducedMotionQuery.removeEventListener?.("change", syncMotionPreference);
      visibilityObserver?.disconnect();
    };
  }, [activeWhileId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="cosmic-background"
      data-ambient="full"
      className="fixed inset-0 z-0 h-full w-full pointer-events-none"
    />
  );
}
