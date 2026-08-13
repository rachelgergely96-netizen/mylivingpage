import { expect, test } from "@playwright/test";
import { THEME_MAP, THEME_REGISTRY } from "../../src/themes/registry";
import {
  THEME_FRAME_BASELINES,
  type CatalogThemeId,
} from "./theme-frame-baselines";

const CATALOG_THEME_IDS = THEME_REGISTRY.filter(
  (theme) => !theme.signature,
).map((theme) => theme.id) as CatalogThemeId[];
const SIGNATURE_THEME_IDS = THEME_REGISTRY.filter(
  (theme) => theme.signature,
).map((theme) => theme.id);
const ALL_THEME_IDS = THEME_REGISTRY.map((theme) => theme.id);
const FORMER_FORMAT_THEME_IDS = [
  "atlas",
  "axiom",
  "atelier",
  "sakura",
  "solstice",
  "nocturne",
] as const;
const LEGACY_FORMAT_LABEL_PATTERN = /Waypoint|Exhibit|PLATE|STEM|FLARE|ENTRY/i;

type RgbaColor = { r: number; g: number; b: number; a: number };

function parseCssColor(value: string): RgbaColor {
  const normalized = value.trim();
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    const expanded = hex.length === 3
      ? hex.split("").map((part) => part + part).join("")
      : hex;
    if (expanded.length !== 6) {
      throw new Error(`Unsupported hex color: ${value}`);
    }
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a: 1,
    };
  }

  const channels = normalized.match(/[0-9.]+/g)?.map(Number) ?? [];
  if (channels.length < 3) {
    throw new Error(`Unsupported CSS color: ${value}`);
  }
  return {
    r: channels[0],
    g: channels[1],
    b: channels[2],
    a: channels[3] ?? 1,
  };
}

function compositeColor(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

function relativeLuminance(color: RgbaColor): number {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linearize(color.r) +
    0.7152 * linearize(color.g) +
    0.0722 * linearize(color.b)
  );
}

function contrastRatio(foreground: RgbaColor, background: RgbaColor): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

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

test("paired prototypes keep the Living Page palette and canonical share-card skeleton in sync", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dev/theme-lab");

  const prototypeThemes = [
    ["Meridian", "meridian"],
    ["Halo", "halo"],
    ["Sakura", "sakura"],
    ["Aurora", "aurora"],
    ["Silk", "silk"],
    ["Topo", "topo"],
  ] as const;
  let canonicalLayerOrder: string[] | null = null;

  for (const [name, themeId] of prototypeThemes) {
    await page
      .locator("[data-theme-prototype-selector]")
      .getByRole("button", { name, exact: true })
      .click();

    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
    const shareCard = page.getByTestId("story-share-card");

    await expect(livingPage).toHaveAttribute(
      "data-theme-renderer-status",
      "ready",
    );
    await expect(livingPage).toHaveAttribute(
      "data-theme-format",
      "uniform",
    );
    await expect(shareCard).toHaveAttribute("data-theme-id", themeId);
    await expect(shareCard).toHaveAttribute(
      "data-theme-detail",
      THEME_MAP[themeId].contentProfile,
    );
    const skeleton = shareCard.locator(
      '[data-share-card-skeleton="canonical"]',
    );
    await expect(skeleton).toBeVisible();
    await expect(shareCard.locator("[data-share-card-profile]")).toHaveCount(0);

    const layerOrder = await skeleton
      .locator("[data-share-card-skeleton-layer]")
      .evaluateAll((layers) =>
        layers.map(
          (layer) => layer.getAttribute("data-share-card-skeleton-layer") ?? "",
        ),
      );
    if (canonicalLayerOrder === null) {
      canonicalLayerOrder = layerOrder;
    } else {
      expect(layerOrder).toEqual(canonicalLayerOrder);
    }
  }
});

test("all themes share one stationary foreground system across desktop and mobile", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");
  const select = page.getByLabel("Catalog theme");
  let canonicalForeground: {
    accent: string;
    profileHeight: number;
    profileWidth: number;
    stageBackground: string;
    stagePadding: string;
    stageWidth: number;
    text: string;
    nameType: string;
    headlineType: string;
    sectionType: string;
    experienceDisplay: string;
    experienceGrid: string;
    experienceWidths: number[];
    proofGrid: string;
  } | null = null;

  for (const themeId of ALL_THEME_IDS) {
    await select.selectOption(themeId);
    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
    await expect(livingPage).toHaveAttribute(
      "data-theme-format",
      "uniform",
    );
    await expect(livingPage).toHaveAttribute(
      "data-theme-renderer-status",
      "ready",
    );
    const photo = livingPage.locator(".resume-theme-avatar");
    await expect(photo).toBeVisible();
    await expect
      .poll(() =>
        photo.evaluate(
          (element) => {
            const image = element as HTMLImageElement;
            return image.complete && image.naturalWidth > 0;
          },
        ),
      )
      .toBe(true);

    const foreground = await livingPage.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const stage = element.querySelector<HTMLElement>(".resume-theme-content");
      const profile = element.querySelector<HTMLImageElement>(
        ".resume-theme-avatar",
      );
      const name = element.querySelector<HTMLElement>("[data-resume-name]");
      const headline = element.querySelector<HTMLElement>("[data-resume-headline]");
      const sectionTitle = element.querySelector<HTMLElement>(
        ".resume-theme-section-title",
      );
      const experienceList = element.querySelector<HTMLElement>(
        "[data-experience-list]",
      );
      const proofGrid = element.querySelector<HTMLElement>("[data-proof-grid]");
      const experienceEntries = Array.from(
        element.querySelectorAll<HTMLElement>(".resume-theme-experience-entry"),
      ).slice(0, 2);
      const stageBounds = stage?.getBoundingClientRect();
      const profileBounds = profile?.getBoundingClientRect();
      const stageStyle = stage ? window.getComputedStyle(stage) : null;
      const experienceStyle = experienceList
        ? window.getComputedStyle(experienceList)
        : null;
      const typeSignature = (node: HTMLElement | null) => {
        if (!node) return "";
        const nodeStyle = window.getComputedStyle(node);
        return [
          nodeStyle.fontSize,
          nodeStyle.fontWeight,
          nodeStyle.lineHeight,
          nodeStyle.letterSpacing,
        ].join("|");
      };
      return {
        accent: style.getPropertyValue("--theme-accent").trim(),
        experienceDisplay: experienceStyle?.display ?? "",
        experienceGrid: experienceStyle?.gridTemplateColumns ?? "",
        experienceWidths: experienceEntries.map((entry) =>
          Math.round(entry.getBoundingClientRect().width * 100) / 100,
        ),
        headlineType: typeSignature(headline),
        nameType: typeSignature(name),
        profileHeight: profileBounds?.height ?? 0,
        profileWidth: profileBounds?.width ?? 0,
        proofGrid: proofGrid
          ? window.getComputedStyle(proofGrid).gridTemplateColumns
          : "",
        sectionType: typeSignature(sectionTitle),
        stageBackground: stage ? window.getComputedStyle(stage).backgroundImage : "",
        stagePadding: stageStyle
          ? [
              stageStyle.paddingTop,
              stageStyle.paddingRight,
              stageStyle.paddingBottom,
              stageStyle.paddingLeft,
            ].join("|")
          : "",
        stageWidth: stageBounds?.width ?? 0,
        text: style.getPropertyValue("--theme-text").trim(),
      };
    });
    expect(foreground.profileWidth, `${themeId} profile width`).toBe(80);
    expect(foreground.profileHeight, `${themeId} profile height`).toBe(80);
    if (canonicalForeground === null) {
      canonicalForeground = foreground;
    } else {
      const exactKeys = [
        "accent",
        "experienceDisplay",
        "experienceGrid",
        "experienceWidths",
        "headlineType",
        "nameType",
        "proofGrid",
        "sectionType",
        "stageBackground",
        "stagePadding",
        "text",
      ] as const;
      for (const key of exactKeys) {
        expect(foreground[key], `${themeId} uniform ${key}`).toEqual(
          canonicalForeground[key],
        );
      }
      expect(
        Math.abs(foreground.stageWidth - canonicalForeground.stageWidth),
        `${themeId} uniform stage width`,
      ).toBeLessThanOrEqual(1);
    }

    const card = livingPage.locator(".resume-theme-card").first();
    const restingStyle = await card.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backdrop: style.backdropFilter,
        borderRadius: style.borderRadius,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    expect(restingStyle.borderRadius).toBe("0px");
    expect(restingStyle.outlineStyle).toBe("none");
    expect(restingStyle.outlineWidth).toBe("0px");
    expect(restingStyle.backdrop).toBe("none");

    await card.hover();
    const readCardState = () =>
      card.evaluate((element) => {
        const computed = window.getComputedStyle(element);
        if (computed.transform === "none") {
          return { boxShadow: computed.boxShadow, x: 0, y: 0 };
        }
        const matrix = new DOMMatrixReadOnly(computed.transform);
        return { boxShadow: computed.boxShadow, x: matrix.m41, y: matrix.m42 };
      });
    await expect.poll(readCardState).toEqual({ boxShadow: "none", x: 0, y: 0 });

    await page.mouse.move(1, 1);
    await card.evaluate((element) => {
      element.tabIndex = 0;
      element.focus();
    });
    await expect.poll(readCardState).toEqual({ boxShadow: "none", x: 0, y: 0 });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const themeId of ALL_THEME_IDS) {
    await select.selectOption(themeId);
    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
    await livingPage.scrollIntoViewIfNeeded();
    const profileBounds = await livingPage
      .locator(".resume-theme-avatar")
      .first()
      .boundingBox();
    expect(profileBounds?.width, `${themeId} mobile profile width`).toBe(64);
    expect(profileBounds?.height, `${themeId} mobile profile height`).toBe(64);
    expect(
      await livingPage.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    ).toBe(0);
  }
});

test("legacy format markers stay absent from the shared narrative order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");
  const select = page.getByLabel("Catalog theme");
  let canonicalSectionOrder: string[] | null = null;

  for (const themeId of FORMER_FORMAT_THEME_IDS) {
    await select.selectOption(themeId);
    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );

    await expect(livingPage).toHaveAttribute(
      "data-theme-format",
      "uniform",
    );
    await expect(livingPage).toHaveAttribute(
      "data-theme-renderer-status",
      "ready",
    );
    expect(await livingPage.getAttribute("data-theme-experience")).toBeNull();

    const sectionOrder = await livingPage
      .locator("[data-motion-section]")
      .evaluateAll((sections) =>
        sections.map(
          (section) => section.getAttribute("data-motion-section") ?? "",
        ),
      );
    if (canonicalSectionOrder === null) {
      canonicalSectionOrder = sectionOrder;
    } else {
      expect(sectionOrder).toEqual(canonicalSectionOrder);
    }

    const generatedContent = await livingPage
      .locator("[data-motion-kind]")
      .evaluateAll((elements) =>
        elements
          .flatMap((element) => [
            window.getComputedStyle(element, "::before").content,
            window.getComputedStyle(element, "::after").content,
          ])
          .join(" "),
      );
    expect(generatedContent).not.toMatch(LEGACY_FORMAT_LABEL_PATTERN);
  }
});

test("former signature themes use the shared laptop scale and mobile flow", async ({
  page,
}) => {
  const laptopViewports = [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1512, height: 982 },
  ];

  await page.setViewportSize(laptopViewports[0]);
  await page.goto("/dev/theme-lab");
  const select = page.getByLabel("Catalog theme");

  for (const viewport of laptopViewports) {
    await page.setViewportSize(viewport);

    for (const themeId of FORMER_FORMAT_THEME_IDS) {
      await select.selectOption(themeId);
      const livingPage = page.locator(
        `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
      );
      await expect(livingPage).toHaveAttribute(
        "data-theme-renderer-status",
        "ready",
      );

      const scale = await livingPage.evaluate((element) => {
        const header = element.querySelector<HTMLElement>(
          "[data-resume-header]",
        );
        const name = element.querySelector<HTMLElement>("[data-resume-name]");
        const scrollRoot = element.querySelector<HTMLElement>(
          "[data-analytics-scroll-root='true']",
        );

        return {
          headerHeight: header?.getBoundingClientRect().height ?? 0,
          nameFontSize: Number.parseFloat(
            name ? window.getComputedStyle(name).fontSize : "0",
          ),
          viewportHeight: scrollRoot?.clientHeight ?? 0,
        };
      });

      expect(scale.viewportHeight).toBeGreaterThan(0);
      expect(
        scale.headerHeight / scale.viewportHeight,
        `${themeId} masthead share at ${viewport.width}x${viewport.height}`,
      ).toBeLessThan(0.8);
      expect(
        scale.nameFontSize,
        `${themeId} name scale at ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(112);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });

  for (const themeId of FORMER_FORMAT_THEME_IDS) {
    await select.selectOption(themeId);
    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
    await expect(livingPage).toHaveAttribute(
      "data-theme-renderer-status",
      "ready",
    );

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `${themeId} mobile overflow`).toBe(0);
  }
});

test("former signature themes use the same hierarchy without moving content rows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/dev/theme-lab");
  const select = page.getByLabel("Catalog theme");

  await select.selectOption("atlas");
  const atlas = page.locator(
    '[data-theme-lab-canvas] [data-theme-id="atlas"]',
  );
  const atlasExperience = atlas.locator("[data-experience-list]");
  const atlasProof = atlas.locator("[data-proof-grid]");
  expect((await atlasExperience.boundingBox())?.height ?? 0).toBeGreaterThan(
    (await atlasProof.boundingBox())?.height ?? 0,
  );

  await select.selectOption("axiom");
  const axiom = page.locator(
    '[data-theme-lab-canvas] [data-theme-id="axiom"]',
  );
  const axiomProofs = axiom.locator('[data-motion-kind="proof"]');
  expect(
    Math.abs(
      ((await axiomProofs.nth(0).boundingBox())?.width ?? 0) -
        ((await axiomProofs.nth(1).boundingBox())?.width ?? 0),
    ),
  ).toBeLessThanOrEqual(1);

  await select.selectOption("atelier");
  const atelier = page.locator(
    '[data-theme-lab-canvas] [data-theme-id="atelier"]',
  );
  const atelierType = await atelier.evaluate((element) => {
    const summary = element.querySelector<HTMLElement>(
      "[data-resume-summary] > p",
    );
    const experienceBody = element.querySelector<HTMLElement>(
      '[data-motion-kind="experience"] li',
    );
    return {
      experience: Number.parseFloat(
        experienceBody ? window.getComputedStyle(experienceBody).fontSize : "0",
      ),
      summary: Number.parseFloat(
        summary ? window.getComputedStyle(summary).fontSize : "0",
      ),
    };
  });
  expect(atelierType.summary).toBeGreaterThan(atelierType.experience);

  await select.selectOption("sakura");
  const sakura = page.locator(
    '[data-theme-lab-canvas] [data-theme-id="sakura"]',
  );
  const sakuraProofs = sakura.locator('[data-motion-kind="proof"]');
  expect(
    Math.abs(
      ((await sakuraProofs.nth(0).boundingBox())?.width ?? 0) -
        ((await sakuraProofs.nth(1).boundingBox())?.width ?? 0),
    ),
  ).toBeLessThanOrEqual(1);

  await select.selectOption("solstice");
  const solstice = page.locator(
    '[data-theme-lab-canvas] [data-theme-id="solstice"]',
  );
  const solsticeMetricType = await solstice.evaluate((element) => {
    const primary = element.querySelector<HTMLElement>(
      '[data-stat-index="0"] [data-attention-signal="metric"]',
    );
    const secondary = element.querySelector<HTMLElement>(
      '[data-stat-index="1"] > div:first-child',
    );
    return {
      primary: Number.parseFloat(
        primary ? window.getComputedStyle(primary).fontSize : "0",
      ),
      secondary: Number.parseFloat(
        secondary ? window.getComputedStyle(secondary).fontSize : "0",
      ),
    };
  });
  expect(
    Math.abs(solsticeMetricType.primary - solsticeMetricType.secondary),
  ).toBeLessThanOrEqual(0.1);

  await select.selectOption("nocturne");
  const nocturne = page.locator(
    '[data-theme-lab-canvas] [data-theme-id="nocturne"]',
  );
  const nocturneType = await nocturne.evaluate((element) => {
    const testimonial = element.querySelector<HTMLElement>(
      '[data-motion-kind="testimonial"] > p:first-child',
    );
    const experience = element.querySelector<HTMLElement>(
      '[data-motion-kind="experience"] li',
    );
    return {
      testimonial: Number.parseFloat(
        testimonial ? window.getComputedStyle(testimonial).fontSize : "0",
      ),
      experience: Number.parseFloat(
        experience ? window.getComputedStyle(experience).fontSize : "0",
      ),
    };
  });
  expect(
    Math.abs(nocturneType.testimonial - nocturneType.experience),
  ).toBeLessThanOrEqual(0.1);

  for (const themeId of FORMER_FORMAT_THEME_IDS) {
    await select.selectOption(themeId);
    const plate = page
      .locator(
        `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
      )
      .locator('[data-motion-kind="experience"]')
      .first();
    await plate.hover();
    const translation = await plate.evaluate((element) => {
      const transform = window.getComputedStyle(element).transform;
      if (transform === "none") return { x: 0, y: 0 };
      const matrix = new DOMMatrixReadOnly(transform);
      return { x: matrix.m41, y: matrix.m42 };
    });
    expect(Math.abs(translation.x)).toBeLessThan(0.001);
    expect(Math.abs(translation.y)).toBeLessThan(0.001);
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
        headline: primaryFont("[data-resume-headline]"),
        name: primaryFont("[data-resume-name]"),
        sectionTitle: primaryFont(".resume-theme-section-title"),
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
    expect(livingFonts.headline, `${theme.id} headline font`).toBe(
      livingFonts.body,
    );
    expect(livingFonts.sectionTitle, `${theme.id} section font`).toBe(
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

test("all themes use a transparent stage with local reading plates", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");

  const select = page.getByLabel("Catalog theme");
  for (const theme of THEME_REGISTRY) {
    await select.selectOption(theme.id);
    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${theme.id}"]`,
    );
    await expect(livingPage).toHaveAttribute(
      "data-theme-format",
      "uniform",
    );

    const guard = await livingPage.evaluate((element) => {
      const stage = element.querySelector<HTMLElement>(
        ".resume-theme-content",
      );
      const masthead = element.querySelector<HTMLElement>(
        ".resume-theme-masthead",
      );
      const summary = element.querySelector<HTMLElement>(
        ".resume-theme-summary",
      );
      const card = element.querySelector<HTMLElement>(
        ".resume-theme-card",
      );
      const experience = element.querySelector<HTMLElement>(
        "[data-experience-list]",
      );
      const sectionHeading = element.querySelector<HTMLElement>(
        "[data-section-heading]",
      );
      const stats = element.querySelector<HTMLElement>("[data-resume-stats]");
      const statsCard = stats?.querySelector<HTMLElement>(".resume-theme-card");
      const muted = element.querySelector<HTMLElement>(".resume-theme-muted");
      const read = (node: HTMLElement | null | undefined) =>
        node ? window.getComputedStyle(node) : null;
      const stageStyle = read(stage);
      const mastheadStyle = read(masthead);
      const summaryStyle = read(summary);
      const cardStyle = read(card);
      const experienceStyle = read(experience);
      const sectionHeadingStyle = read(sectionHeading);
      const statsStyle = read(stats);
      const statsCardStyle = read(statsCard);
      const mutedStyle = read(muted);
      const colorAlphas = (value: string | undefined) => {
        if (!value) return [];
        return [
          ...Array.from(value.matchAll(/rgba?\(([^)]*)\)/g), (match) => {
            const slashAlpha = /\/\s*([0-9.]+)/.exec(match[1])?.[1];
            const commaAlpha = match[1].split(",")[3]?.trim();
            return {
              alpha: Number(slashAlpha ?? commaAlpha ?? 1),
              index: match.index,
            };
          }),
          ...Array.from(
            value.matchAll(/color\([^)]*?\/\s*([0-9.]+)\s*\)/g),
            (match) => ({
              alpha: Number(match[1]),
              index: match.index,
            }),
          ),
        ]
          .sort((left, right) => left.index - right.index)
          .map((match) => match.alpha);
      };
      const colorAlpha = (value: string | undefined) =>
        Math.max(0, ...colorAlphas(value));
      const alphaFloor = (value: string | undefined) => {
        const alphas = colorAlphas(value);
        return alphas.length > 0 ? Math.min(...alphas) : 0;
      };
      const alpha = mutedStyle?.color.match(
        /rgba?\([^,]+,[^,]+,[^,]+(?:,\s*([0-9.]+))?\)/,
      )?.[1];

      return {
        cardBackdrop: cardStyle?.backdropFilter ?? "none",
        cardBaseAlpha: colorAlpha(cardStyle?.backgroundColor),
        cardGradientTailAlpha: colorAlpha(cardStyle?.backgroundImage),
        experienceGuardAlpha: colorAlpha(experienceStyle?.backgroundColor),
        mastheadGuardFloor: alphaFloor(mastheadStyle?.backgroundImage),
        mastheadRadius: mastheadStyle?.borderRadius ?? "",
        mutedAlpha: alpha ? Number(alpha) : 1,
        sectionHeadingGuardAlpha: colorAlpha(
          sectionHeadingStyle?.backgroundColor,
        ),
        statsGuardAlpha: Math.max(
          colorAlpha(statsStyle?.backgroundColor),
          colorAlpha(statsStyle?.backgroundImage),
          colorAlpha(statsCardStyle?.backgroundColor),
          colorAlpha(statsCardStyle?.backgroundImage),
        ),
        stageAlphaCeiling: colorAlpha(stageStyle?.backgroundImage),
        stageAlphaFloor: alphaFloor(stageStyle?.backgroundImage),
        stageBackdrop: stageStyle?.backdropFilter ?? "none",
        stageBackground: stageStyle?.backgroundImage ?? "none",
        stageRadius: stageStyle?.borderRadius ?? "",
        summaryGuardAlpha: colorAlpha(summaryStyle?.backgroundColor),
        summaryRadius: summaryStyle?.borderRadius ?? "",
      };
    });

    expect(guard.stageBackground, `${theme.id} reading stage`).not.toBe("none");
    expect(guard.stageAlphaFloor, `${theme.id} stage alpha floor`).toBeGreaterThanOrEqual(0.28);
    expect(guard.stageAlphaCeiling, `${theme.id} stage alpha ceiling`).toBeLessThanOrEqual(0.48);
    expect(guard.stageBackdrop, `${theme.id} unblurred world`).toBe("none");
    expect(guard.mastheadGuardFloor, `${theme.id} masthead guard`).toBeGreaterThanOrEqual(0.66);
    expect(guard.summaryGuardAlpha, `${theme.id} summary guard`).toBeGreaterThanOrEqual(0.66);
    expect(guard.sectionHeadingGuardAlpha, `${theme.id} section-heading guard`).toBeGreaterThanOrEqual(0.78);
    expect(guard.experienceGuardAlpha, `${theme.id} experience guard`).toBeGreaterThanOrEqual(0.66);
    expect(
      Math.max(guard.cardBaseAlpha, guard.cardGradientTailAlpha),
      `${theme.id} card guard`,
    ).toBeGreaterThanOrEqual(0.78);
    expect(
      guard.mutedAlpha,
      `${theme.id} muted text alpha`,
    ).toBeGreaterThanOrEqual(0.82);
    expect(
      guard.statsGuardAlpha,
      `${theme.id} stats guard`,
    ).toBeGreaterThanOrEqual(0.78);
    expect(guard.stageRadius, `${theme.id} stage geometry`).toBe("0px");
    expect(guard.mastheadRadius, `${theme.id} masthead geometry`).toBe("0px");
    expect(guard.summaryRadius, `${theme.id} summary geometry`).toBe("0px");
    expect(guard.cardBackdrop, `${theme.id} solid separation`).toBe("none");
  }
});

test("local plates preserve text contrast on the lightest and darkest worlds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");
  const select = page.getByLabel("Catalog theme");

  for (const themeId of ["atlas", "atelier"] as const) {
    await select.selectOption(themeId);
    const livingPage = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${themeId}"]`,
    );
    await expect(livingPage).toHaveAttribute("data-theme-renderer-status", "ready");

    const tokens = await livingPage.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        muted: style.getPropertyValue("--theme-text-muted").trim(),
        strong: style.getPropertyValue("--theme-surface-strong").trim(),
        subtle: style.getPropertyValue("--theme-text-subtle").trim(),
        surface: style.getPropertyValue("--theme-surface").trim(),
        text: style.getPropertyValue("--theme-text").trim(),
      };
    });
    const world = parseCssColor(THEME_MAP[themeId].background);
    const strongPlate = compositeColor(parseCssColor(tokens.strong), world);
    const surfacePlate = compositeColor(parseCssColor(tokens.surface), world);

    expect(
      contrastRatio(compositeColor(parseCssColor(tokens.text), strongPlate), strongPlate),
      `${themeId} primary text contrast`,
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrastRatio(compositeColor(parseCssColor(tokens.muted), surfacePlate), surfacePlate),
      `${themeId} muted text contrast`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(compositeColor(parseCssColor(tokens.subtle), surfacePlate), surfacePlate),
      `${themeId} subtle text contrast`,
    ).toBeGreaterThanOrEqual(3);
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
  await expect(
    page.getByRole("button", { name: "Close share card" }),
  ).toBeFocused();

  const stage = dialog.locator("[data-share-card-preview-stage]");
  const previewOuter = stage.locator("[data-share-card-outer]");
  const previewPanel = stage.locator("[data-share-card-panel]");
  const previewBounds = await stage.boundingBox();
  expect(previewBounds).not.toBeNull();
  if (previewBounds) {
    await page.mouse.move(
      previewBounds.x + previewBounds.width * 0.78,
      previewBounds.y + previewBounds.height * 0.28,
    );
  }
  await expect
    .poll(() =>
      previewPanel.evaluate(
        (element) => window.getComputedStyle(element).transform,
      ),
    )
    .not.toBe("none");
  expect(
    await stage.evaluate(
      (element) => window.getComputedStyle(element).transform,
    ),
  ).toBe("none");
  expect(
    await previewOuter.evaluate(
      (element) => window.getComputedStyle(element).transform,
    ),
  ).toBe("none");

  const exportOuter = dialog.locator(
    "[data-share-card-export] [data-share-card-outer]",
  );
  const exportPanel = dialog.locator(
    "[data-share-card-export] [data-share-card-panel]",
  );
  expect(
    await exportOuter.evaluate(
      (element) => window.getComputedStyle(element).transform,
    ),
  ).toBe("none");
  expect(
    await exportPanel.evaluate(
      (element) => window.getComputedStyle(element).transform,
    ),
  ).toBe("none");

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

test("share-card panel motion is isolated and disabled for reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");

  // Prove the client boundary has hydrated before sending pointer input. Under
  // the full catalog run, canvas initialization can otherwise outlast the
  // initial locator readiness while the server-rendered card is already visible.
  const motionToggle = page.getByRole("button", { name: "Enable motion" });
  await motionToggle.click();
  const pauseMotion = page.getByRole("button", { name: "Pause motion" });
  await expect(pauseMotion).toBeVisible();
  await pauseMotion.click();
  await expect(motionToggle).toBeVisible();

  const story = page.getByTestId("story-share-card");
  await story.scrollIntoViewIfNeeded();
  const storyOuter = story.locator("[data-share-card-outer]");
  const storyPanel = story.locator("[data-share-card-panel]");
  const readTiltMagnitude = () =>
    storyPanel.evaluate((element) => {
      const transform = window.getComputedStyle(element).transform;
      if (transform === "none") return 0;
      const matrix = new DOMMatrixReadOnly(transform);
      return Math.max(
        Math.abs(matrix.m12),
        Math.abs(matrix.m13),
        Math.abs(matrix.m14),
        Math.abs(matrix.m21),
        Math.abs(matrix.m23),
        Math.abs(matrix.m24),
        Math.abs(matrix.m31),
        Math.abs(matrix.m32),
        Math.abs(matrix.m41),
        Math.abs(matrix.m42),
        Math.abs(matrix.m43),
      );
    });
  const storyBounds = await story.boundingBox();
  expect(storyBounds).not.toBeNull();
  if (storyBounds) {
    await page.mouse.move(
      storyBounds.x + storyBounds.width * 0.8,
      storyBounds.y + storyBounds.height * 0.22,
    );
  }
  await expect.poll(readTiltMagnitude).toBeGreaterThan(0.001);
  await expect
    .poll(() =>
      storyPanel.evaluate((element) =>
        element.style.getPropertyValue("--share-card-specular-x"),
      ),
    )
    .not.toBe("");
  await expect(story.locator(".share-card-glass-specular")).toBeVisible();
  expect(
    await storyOuter.evaluate(
      (element) => window.getComputedStyle(element).backgroundColor,
    ),
  ).toBe("rgb(5, 5, 7)");
  expect(
    await storyOuter.evaluate(
      (element) => window.getComputedStyle(element).transform,
    ),
  ).toBe("none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedMotionToggle = page.getByRole("button", {
    name: "Enable motion",
  });
  await reducedMotionToggle.click();
  const reducedPauseMotion = page.getByRole("button", {
    name: "Pause motion",
  });
  await expect(reducedPauseMotion).toBeVisible();
  await reducedPauseMotion.click();
  await expect(reducedMotionToggle).toBeVisible();

  const reducedStory = page.getByTestId("story-share-card");
  await reducedStory.scrollIntoViewIfNeeded();
  const reducedBounds = await reducedStory.boundingBox();
  if (reducedBounds) {
    await page.mouse.move(
      reducedBounds.x + reducedBounds.width * 0.8,
      reducedBounds.y + reducedBounds.height * 0.22,
    );
  }
  expect(
    await reducedStory
      .locator("[data-share-card-outer]")
      .evaluate((element) => window.getComputedStyle(element).transform),
  ).toBe("none");
  const reducedTiltMagnitude = await reducedStory
    .locator("[data-share-card-panel]")
    .evaluate((element) => {
      const transform = window.getComputedStyle(element).transform;
      if (transform === "none") return 0;
      const matrix = new DOMMatrixReadOnly(transform);
      return Math.max(
        Math.abs(matrix.m12),
        Math.abs(matrix.m13),
        Math.abs(matrix.m14),
        Math.abs(matrix.m21),
        Math.abs(matrix.m23),
        Math.abs(matrix.m24),
        Math.abs(matrix.m31),
        Math.abs(matrix.m32),
        Math.abs(matrix.m41),
        Math.abs(matrix.m42),
        Math.abs(matrix.m43),
      );
    });
  expect(reducedTiltMagnitude).toBeLessThan(0.001);
  const reducedGlassLight = await reducedStory
    .locator(".share-card-glass-ambient")
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        animationName: style.animationName,
        opacity: Number.parseFloat(style.opacity),
      };
    });
  expect(reducedGlassLight.animationName).toBe("none");
  expect(reducedGlassLight.opacity).toBeGreaterThan(0.25);
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

test("every catalog theme renders a detailed deterministic frame", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/theme-lab");

  const select = page.getByLabel("Catalog theme");
  await expect(select.locator("option")).toHaveCount(THEME_REGISTRY.length);

  const weakFrames: Array<{ themeId: string; colors: number; range: number }> =
    [];
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
      "data-theme-format",
      "uniform",
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

      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
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

  expect(weakFrames, "catalog themes with insufficient visible detail").toEqual(
    [],
  );

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

test("every theme stays renderer-ready through an animated pointer sweep", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/dev/theme-lab?motion=1");

  const select = page.getByLabel("Catalog theme");
  for (const [index, theme] of THEME_REGISTRY.entries()) {
    await select.selectOption(theme.id);
    const world = page.locator(
      `[data-theme-lab-canvas] [data-theme-id="${theme.id}"]`,
    );
    await expect(world).toHaveAttribute("data-theme-renderer-status", "ready");
    expect(
      await world.getAttribute("data-theme-quality"),
      `${theme.id} adaptive quality state`,
    ).toMatch(/^(full|no-bloom|scaled)$/);

    const bounds = await world.boundingBox();
    expect(bounds, `${theme.id} interactive bounds`).not.toBeNull();
    if (!bounds) continue;

    const direction = index % 2 === 0 ? 1 : -1;
    await page.mouse.move(
      bounds.x + bounds.width * (direction > 0 ? 0.2 : 0.8),
      bounds.y + Math.min(bounds.height * 0.35, 260),
    );
    await page.mouse.move(
      bounds.x + bounds.width * (direction > 0 ? 0.8 : 0.2),
      bounds.y + Math.min(bounds.height * 0.6, 420),
      { steps: 4 },
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );

    await expect(world).toHaveAttribute("data-theme-renderer-status", "ready");
  }

  expect(pageErrors, "renderer errors during catalog pointer sweep").toEqual(
    [],
  );
});

test("signature background worlds keep uniform content and deterministic detail", async ({
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
      "data-theme-format",
      "uniform",
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
    expect(detail.range, `${themeId} visible luminance detail`).toBeGreaterThan(
      6,
    );
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

    expect(geometry.overflow, `${themeId} mobile overflow`).toBeLessThanOrEqual(
      0,
    );
    expect(geometry.surfaceCount, `${themeId} themed surfaces`).toBeGreaterThan(
      0,
    );
    expect(geometry.sharp, `${themeId} sharp corners`).toBe(true);
  }
});

test("theme lab remains static with reduced motion and fits mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/theme-lab");

  await page.getByLabel("Catalog theme").selectOption("topo");
  const theme = page.locator('[data-theme-lab-canvas] [data-theme-id="topo"]');
  await expect(theme).toHaveAttribute("data-theme-renderer-status", "ready");
  await page.getByRole("button", { name: "Enable motion" }).click();

  const firstFrame = await theme
    .locator("canvas")
    .evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(250);
  const secondFrame = await theme
    .locator("canvas")
    .evaluate((element) => (element as HTMLCanvasElement).toDataURL());
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
  await expect(theme).toHaveAttribute(
    "data-motion-focus-kind",
    "quality-signal",
  );
});
