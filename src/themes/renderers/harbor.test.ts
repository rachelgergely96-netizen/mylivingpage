import { describe, expect, it, vi } from "vitest";
import { renderHarbor } from "@/themes/renderers/harbor";

function createCanvasContext() {
  const gradient = () => ({ addColorStop: vi.fn() });
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(gradient),
    createRadialGradient: vi.fn(gradient),
    fill: vi.fn(),
    fillRect: vi.fn(),
    globalCompositeOperation: "source-over",
    lineTo: vi.fn(),
    lineWidth: 1,
    moveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("Harbor renderer", () => {
  it("keeps atmospheric gradients stable while the pointer-driven horizon moves", () => {
    const context = createCanvasContext();
    const linearGradient = vi.mocked(context.createLinearGradient);

    renderHarbor(context, 960, 640, 1, 0.5, 0.2);
    const initialGradientCount = linearGradient.mock.calls.length;

    renderHarbor(context, 960, 640, 1 + 1 / 60, 0.5, 0.8);
    const pointerFrameGradientCount =
      linearGradient.mock.calls.length - initialGradientCount;

    // Six moving lighthouse/reflection beams are intentionally rebuilt. The
    // three atmospheric gradients are cached by canvas size, not pointer band.
    expect(pointerFrameGradientCount).toBe(6);
  });
});
