import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const IN_SCOPE = [
  "src/app/(admin)",
  "src/app/(app)",
  "src/app/(auth)",
  "src/app/[username]/page.tsx",
  "src/app/error.tsx",
  "src/app/examples/page.tsx",
  "src/app/guides",
  "src/app/loading.tsx",
  "src/app/not-found.tsx",
  "src/app/page.tsx",
  "src/app/pricing/page.tsx",
  "src/components/admin",
  "src/components/analytics",
  "src/components/auth",
  "src/components/create",
  "src/components/edit",
  "src/components/legal",
  "src/components/privacy",
  "src/components/resume/ResumeEditorFields.tsx",
  "src/components/AtsReadinessCard.tsx",
  "src/components/DeletePageButton.tsx",
  "src/components/DraftBanner.tsx",
  "src/components/FeedbackWidget.tsx",
  "src/components/MadeWithBadge.tsx",
  "src/components/PageOwnerBar.tsx",
  "src/components/PublicPageActionDock.tsx",
  "src/components/PublishPageButton.tsx",
  "src/components/ThemePicker.tsx",
  "src/components/marketing/GuideLinkGrid.tsx",
  "src/components/marketing/LivingHomepagePrototype.tsx",
  "src/components/marketing/MobileStickyCta.tsx",
  "src/components/marketing/SamplePageCard.tsx",
  "src/components/marketing/SignalFrameHomepage.tsx",
  "src/components/marketing/SiteHeader.tsx",
  "src/components/admin",
  "src/components/ui",
  "src/components/marketing/ExamplesExperience.tsx",
];

const CSS_IN_SCOPE = [
  "src/app/globals.css",
  "src/components/admin/AdminExperience.module.css",
  "src/components/marketing/ExamplesExperience.module.css",
  "src/components/marketing/LivingHomepagePrototype.module.css",
  "src/components/marketing/SignalFrameHomepage.module.css",
];

const CHECKS = [
  { label: "Playfair website heading", pattern: /\bfont-heading\b/ },
  { label: "legacy glass helper", pattern: /\bglass-card\b/ },
  { label: "legacy gold helper", pattern: /\bgold-pill\b/ },
  { label: "route-local uppercase UI (use site-eyebrow for true eyebrows)", pattern: /\buppercase\b/ },
  {
    label: "rounded website geometry",
    pattern: /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b|\brounded-\[[^\]]+\]/,
  },
  {
    label: "raw Signal Frame foundation color",
    pattern: /#(?:F0F4FF|F4F7FC|3B82F6|78ADFF|93C5FD|060E1C|0A1628)\b|rgba\(240,\s*244,\s*255,/i,
  },
];

async function collectFiles(entry) {
  const relative = entry.split(path.sep).join("/");
  if (/\.(?:test|spec)\.[jt]sx?$/.test(relative)) {
    return [];
  }

  const absolute = path.join(ROOT, entry);
  const entryStat = await stat(absolute);
  if (entryStat.isFile()) {
    return /\.[jt]sx?$/.test(entry) ? [entry] : [];
  }

  const children = await readdir(absolute);
  const nested = await Promise.all(
    children.map((child) => collectFiles(path.join(entry, child))),
  );
  return nested.flat();
}

const files = (await Promise.all(IN_SCOPE.map(collectFiles))).flat();
const failures = [];

for (const file of files) {
  const source = await readFile(path.join(ROOT, file), "utf8");
  const lines = source.split("\n");

  for (const [index, line] of lines.entries()) {
    for (const check of CHECKS) {
      if (check.pattern.test(line)) {
        failures.push(`${file}:${index + 1} ${check.label}: ${line.trim()}`);
      }
    }
  }
}

for (const file of CSS_IN_SCOPE) {
  const source = await readFile(path.join(ROOT, file), "utf8");
  const lines = source.split("\n");

  for (const [index, line] of lines.entries()) {
    const radius = line.match(/border-radius:\s*([^;]+);/i)?.[1]?.trim();
    if (
      radius &&
      !/^0(?:px|rem|em|%)?$/.test(radius) &&
      radius !== "var(--site-radius)"
    ) {
      failures.push(
        `${file}:${index + 1} rounded website geometry: ${line.trim()}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Signal Frame site UI check failed:\n");
  console.error(failures.join("\n"));
  console.error("\nTheme-owned output belongs outside this check; move mixed output behind an explicit boundary rather than weakening the website rules.");
  process.exitCode = 1;
} else {
  console.log(
    `Signal Frame site UI check passed (${files.length} components, ${CSS_IN_SCOPE.length} stylesheets).`,
  );
}
