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

async function downloadToBuffer(
  download: import("@playwright/test").Download,
): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

test("paired prototypes keep the Living Page and share card identity in sync", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dev/theme-lab");

  const prototypeThemes = [
    ["Meridian", "meridian", "bearing"],
    ["Halo", "halo", "orbit"],
    ["Sakura", "sakura", "petal"],
    ["Aurora", "aurora", "curtain"],
    ["Silk", "silk", "weave"],
    ["Topo", "topo", "contour"],
  ] as const;

  for (const [name, themeId, motif] of prototypeThemes) {
    await page
      .locator("[data-theme-prototype-selector]")
      .getByRole("button", { name, exact: true })
      .click();

    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
    const shareCard = page.getByTestId("story-share-card");

    await expect(livingPage).toHaveAttribute("data-theme-renderer-status", "ready");
    await expect(shareCard).toHaveAttribute("data-theme-id", themeId);
    await expect(shareCard).toHaveAttribute(
      "data-theme-detail",
      THEME_MAP[themeId].contentProfile,
    );
    await expect(
      shareCard.locator("[data-share-card-profile]"),
    ).toHaveAttribute("data-share-card-profile", motif);
  }
});

test("all themes use one narrative font across Living Pages and share cards", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const expectedFonts = await page.evaluate(() => {
    const styles = window.getComputedStyle(document.body);
    const normalize = (value: string) =>
      value.split(",")[0].replaceAll(/["']/g, "").trim();
    return {
      narrative: normalize(styles.getPropertyValue("--font-dm-sans")),
      functional: normalize(styles.getPropertyValue("--font-dm-mono")),
    };
  });

  const select = page.getByLabel("Catalog theme");
  for (const theme of THEME_REGISTRY) {
    await select.selectOption(theme.id);
    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${theme.id}"]`,
    );
    const shareCard = page.locator(
      `[data-share-card-artwork][data-share-card-theme-id="${theme.id}"]`,
    );

    await expect(livingPage).toHaveAttribute(
      "data-theme-renderer-status",
      "ready",
    );
    await expect(shareCard).toBeVisible();

    const livingFonts = await livingPage.evaluate((element) => {
      const primaryFont = (selector: string) => {
        const node = element.querySelector<HTMLElement>(selector);
        return node
          ? window
              .getComputedStyle(node)
              .fontFamily.split(",")[0]
              .replaceAll(/["']/g, "")
              .trim()
          : "";
      };

      return {
        body: primaryFont(".resume-theme"),
        name: primaryFont("[data-resume-name]"),
        monogram: primaryFont(".resume-theme-monogram"),
        summary: primaryFont("[data-resume-summary]"),
        functional: primaryFont(".resume-theme .font-mono"),
      };
    });
    const shareFont = await shareCard.evaluate((element) =>
      window
        .getComputedStyle(element)
        .fontFamily.split(",")[0]
        .replaceAll(/["']/g, "")
        .trim(),
    );

    expect(livingFonts.body, `${theme.id} narrative font`).not.toBe("");
    expect(livingFonts.body, `${theme.id} DM Sans font`).toBe(
      expectedFonts.narrative,
    );
    expect(livingFonts.name, `${theme.id} name font`).toBe(livingFonts.body);
    expect(livingFonts.monogram, `${theme.id} monogram font`).toBe(
      livingFonts.body,
    );
    expect(livingFonts.summary, `${theme.id} summary font`).toBe(
      livingFonts.body,
    );
    expect(shareFont, `${theme.id} share-card font`).toBe(livingFonts.body);
    expect(livingFonts.functional, `${theme.id} DM Mono font`).toBe(
      expectedFonts.functional,
    );
  }
});

test("the real share-card modal exports one complete 1200 by 630 card on every viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/dev/theme-lab");

  const trigger = page.getByRole("button", {
    name: "Share Avery’s page",
  });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Avery Morgan" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close share card" })).toBeFocused();

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download share card" }).click();
  const download = await downloadPromise;
  const png = await downloadToBuffer(download);

  expect(download.suggestedFilename()).toBe("avery-morgan-share-card.png");
  expect(Array.from(png.subarray(0, 8))).toEqual([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  expect(png.byteLength).toBeGreaterThan(100_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  const mobileGeometry = await page.evaluate(() => {
    const activeDialog = document.querySelector<HTMLElement>("[role='dialog']");
    const preview = activeDialog?.querySelector<HTMLElement>(
      "[data-scaled-share-card]",
    );
    return {
      bodyOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      dialogOverflow: activeDialog
        ? activeDialog.scrollWidth - activeDialog.clientWidth
        : -1,
      previewWidth: preview?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(mobileGeometry.bodyOverflow).toBe(0);
  expect(mobileGeometry.dialogOverflow).toBe(0);
  expect(mobileGeometry.previewWidth).toBeGreaterThan(250);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("attention motion stays brief and fully respects reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/dev/theme-lab");
  const identity = page.locator(
    '[data-theme-lab-canvas] [data-motion-kind="identity"]',
  );
  const standardMotion = await identity.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      duration: Number.parseFloat(style.animationDuration) * 1000,
      name: style.animationName,
    };
  });
  expect(standardMotion.name).toContain("living-identity-resolve");
  expect(standardMotion.duration).toBeLessThanOrEqual(500);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedMotion = await page
    .locator('[data-theme-lab-canvas] [data-motion-kind="identity"]')
    .evaluate((element) => window.getComputedStyle(element).animationName);
  const reducedSignalMotion = await page
    .locator('[data-theme-lab-canvas] [data-attention-signal="metric"]')
    .evaluate((element) => window.getComputedStyle(element).animationName);
  expect(reducedMotion).toBe("none");
  expect(reducedSignalMotion).toBe("none");
});

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
    const theme = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
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

    // Neon lands one bit farther apart on Linux Chromium than on macOS Chrome
    // because of platform rasterization; keep every other theme at the tighter gate.
    const compositionDriftTolerance = themeId === "neon" ? 7 : 6;
    expect(
      perceptualHashDistance(actual.hash, baseline.hash),
      `${themeId} composition drift`,
    ).toBeLessThanOrEqual(compositionDriftTolerance);
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
    const theme = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
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
    const theme = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
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
  const theme = page.locator(
    '[data-theme-lab-canvas] [data-theme-id="topo"]',
  );
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

  const theme = page.locator(
    '[data-theme-lab-canvas] [data-theme-id="solstice"]',
  );
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
