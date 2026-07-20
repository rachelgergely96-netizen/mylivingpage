import { expect, test } from "@playwright/test";
import { THEME_MAP, THEME_REGISTRY } from "../../src/themes/registry";
import {
  THEME_FRAME_BASELINES,
  type CatalogThemeId,
} from "./theme-frame-baselines";

const CATALOG_THEME_IDS = THEME_REGISTRY.filter((theme) => !theme.signature).map(
  (theme) => theme.id,
) as CatalogThemeId[];
const SIGNATURE_THEME_IDS = THEME_REGISTRY.filter((theme) => theme.signature).map(
  (theme) => theme.id,
);

const NIBBLE_BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

function perceptualHashDistance(left: string, right: string): number {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;

  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const difference =
      Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += NIBBLE_BITS[difference] ?? 0;
  }
  return distance;
}

test("every catalog theme renders a detailed deterministic frame", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");

  const select = page.getByLabel("Catalog theme");
  await expect(select.locator("option")).toHaveCount(THEME_REGISTRY.length);

  const weakFrames: Array<{ themeId: string; colors: number; range: number }> = [];
  const frameSignatures: Record<
    string,
    { hash: string; mean: [number, number, number] }
  > = {};

  for (const themeId of CATALOG_THEME_IDS) {
    await select.selectOption(themeId);
    const theme = page.locator(`[data-theme-id="${themeId}"]`);
    await expect(theme).toHaveAttribute("data-theme-renderer-status", "ready");
    await expect(theme).toHaveAttribute(
      "data-theme-detail",
      THEME_MAP[themeId].contentProfile,
    );

    const detail = await theme.locator("canvas").evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("2d");
      if (!context) {
        return {
          range: 0,
          colors: 0,
          hash: "",
          mean: [0, 0, 0] as [number, number, number],
        };
      }

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const stepX = Math.max(1, Math.floor(canvas.width / 20));
      const stepY = Math.max(1, Math.floor(canvas.height / 16));
      const colors = new Set<string>();
      let minimum = 255;
      let maximum = 0;

      for (let y = 0; y < canvas.height; y += stepY) {
        for (let x = 0; x < canvas.width; x += stepX) {
          const offset = (y * canvas.width + x) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
          minimum = Math.min(minimum, luminance);
          maximum = Math.max(maximum, luminance);
          colors.add(`${red >> 4}-${green >> 4}-${blue >> 4}`);
        }
      }

      const sample = document.createElement("canvas");
      sample.width = 9;
      sample.height = 8;
      const sampleContext = sample.getContext("2d");
      if (!sampleContext) {
        return {
          range: maximum - minimum,
          colors: colors.size,
          hash: "",
          mean: [0, 0, 0] as [number, number, number],
        };
      }

      sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height);
      const sampled = sampleContext.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      const luminances: number[] = [];
      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;
      for (let index = 0; index < sampled.length; index += 4) {
        const red = sampled[index];
        const green = sampled[index + 1];
        const blue = sampled[index + 2];
        redTotal += red;
        greenTotal += green;
        blueTotal += blue;
        luminances.push(red * 0.2126 + green * 0.7152 + blue * 0.0722);
      }

      let bits = "";
      for (let y = 0; y < sample.height; y += 1) {
        for (let x = 0; x < sample.width - 1; x += 1) {
          const offset = y * sample.width + x;
          bits += luminances[offset] > luminances[offset + 1] ? "1" : "0";
        }
      }
      let hash = "";
      for (let offset = 0; offset < bits.length; offset += 4) {
        hash += Number.parseInt(bits.slice(offset, offset + 4), 2).toString(16);
      }

      const pixelCount = sampled.length / 4;
      return {
        range: maximum - minimum,
        colors: colors.size,
        hash,
        mean: [
          Math.round(redTotal / pixelCount),
          Math.round(greenTotal / pixelCount),
          Math.round(blueTotal / pixelCount),
        ] as [number, number, number],
      };
    });

    if (detail.colors <= 3 || detail.range <= 6) {
      weakFrames.push({ themeId, ...detail });
    }
    frameSignatures[themeId] = { hash: detail.hash, mean: detail.mean };
  }

  expect(weakFrames, "catalog themes with insufficient visible detail").toEqual([]);

  if (process.env.UPDATE_THEME_BASELINES === "1") {
    console.log(`THEME_FRAME_BASELINES=${JSON.stringify(frameSignatures)}`);
    return;
  }

  for (const themeId of CATALOG_THEME_IDS) {
    const actual = frameSignatures[themeId];
    const baseline = THEME_FRAME_BASELINES[themeId];
    expect(baseline, `${themeId} fixed-frame baseline`).toBeDefined();
    if (!actual || !baseline) continue;

    expect(
      perceptualHashDistance(actual.hash, baseline.hash),
      `${themeId} composition drift`,
    ).toBeLessThanOrEqual(6);
    actual.mean.forEach((channel, index) => {
      expect(
        Math.abs(channel - baseline.mean[index]),
        `${themeId} mean color channel ${index}`,
      ).toBeLessThanOrEqual(4);
    });
  }
});

test("signature themes expose authored content profiles and deterministic detail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");
  const select = page.getByLabel("Catalog theme");

  for (const themeId of SIGNATURE_THEME_IDS) {
    await select.selectOption(themeId);
    const theme = page.locator(`[data-theme-id="${themeId}"]`);
    await expect(theme).toHaveAttribute("data-theme-renderer-status", "ready");
    await expect(theme).toHaveAttribute(
      "data-theme-detail",
      THEME_MAP[themeId].contentProfile,
    );

    const canvas = theme.locator("canvas");
    const firstFrame = await canvas.evaluate((element) =>
      (element as HTMLCanvasElement).toDataURL(),
    );
    await page.waitForTimeout(120);
    const secondFrame = await canvas.evaluate((element) =>
      (element as HTMLCanvasElement).toDataURL(),
    );
    const detail = await canvas.evaluate((element) => {
      const canvasElement = element as HTMLCanvasElement;
      const context = canvasElement.getContext("2d");
      if (!context) return { colors: 0, range: 0 };
      const pixels = context.getImageData(
        0,
        0,
        canvasElement.width,
        canvasElement.height,
      ).data;
      const step = Math.max(4, Math.floor(pixels.length / 4 / 640));
      const colors = new Set<string>();
      let minimum = 255;
      let maximum = 0;
      for (let pixel = 0; pixel < pixels.length / 4; pixel += step) {
        const offset = pixel * 4;
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        minimum = Math.min(minimum, luminance);
        maximum = Math.max(maximum, luminance);
        colors.add(`${red >> 4}-${green >> 4}-${blue >> 4}`);
      }
      return { colors: colors.size, range: maximum - minimum };
    });

    expect(secondFrame, `${themeId} static frame`).toBe(firstFrame);
    expect(detail.colors, `${themeId} visible color detail`).toBeGreaterThan(3);
    expect(detail.range, `${themeId} visible luminance detail`).toBeGreaterThan(6);
  }
});

test("signature themes fit mobile and keep Living Resume surfaces sharp", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/theme-lab");
  const select = page.getByLabel("Catalog theme");

  for (const themeId of SIGNATURE_THEME_IDS) {
    await select.selectOption(themeId);
    const theme = page.locator(`[data-theme-id="${themeId}"]`);
    await expect(theme).toHaveAttribute("data-theme-renderer-status", "ready");

    const geometry = await theme.evaluate((element) => {
      const surfaces = Array.from(
        element.querySelectorAll(
          ".resume-theme-card, .resume-theme-card-accent, .resume-theme-avatar, .resume-theme-monogram, .resume-theme-pill",
        ),
      );
      const sharp = surfaces.every((surface) => {
        const style = window.getComputedStyle(surface);
        return [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius,
        ].every((radius) => radius === "0px");
      });

      return {
        overflow: element.scrollWidth - element.clientWidth,
        sharp,
        surfaceCount: surfaces.length,
      };
    });

    expect(geometry.overflow, `${themeId} mobile overflow`).toBeLessThanOrEqual(0);
    expect(geometry.surfaceCount, `${themeId} themed surfaces`).toBeGreaterThan(0);
    expect(geometry.sharp, `${themeId} sharp corners`).toBe(true);
  }
});

test("theme lab remains static with reduced motion and fits mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/theme-lab");

  await page.getByLabel("Catalog theme").selectOption("topo");
  const theme = page.locator('[data-theme-id="topo"]');
  await expect(theme).toHaveAttribute("data-theme-renderer-status", "ready");
  await page.getByRole("button", { name: "Enable motion" }).click();

  const firstFrame = await theme.locator("canvas").evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  await page.waitForTimeout(250);
  const secondFrame = await theme.locator("canvas").evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  expect(secondFrame).toBe(firstFrame);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("catalog motion advances and keeps keyboard focus connected to the world", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");
  await page.getByLabel("Catalog theme").selectOption("solstice");

  const theme = page.locator('[data-theme-id="solstice"]');
  await expect(theme).toHaveAttribute("data-theme-renderer-status", "ready");
  const canvas = theme.locator("canvas");
  const firstFrame = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );

  await page.getByRole("button", { name: "Enable motion" }).click();
  await page.waitForTimeout(350);
  const animatedFrame = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  expect(animatedFrame).not.toBe(firstFrame);

  await page.getByRole("button", { name: /Focus/ }).focus();
  await expect(theme).toHaveAttribute("data-motion-focus-kind", "quality-signal");
});
