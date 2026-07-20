# Design previews

Visual review artifacts for the Signal Frame homepage implementation. These images are reference captures, not production assets.

- `signal-frame-homepage-desktop.png` — desktop hero and interactive product story
- `signal-frame-homepage-mobile.png` — 390 × 844 mobile viewport
- `signal-frame-homepage-full.png` — full desktop homepage concept
- `signal-frame-homepage-artifact-browser.png` — 1440 × 1000 standalone concept capture used during the Signal Frame review

The production homepage uses the Signal Frame design. `/homepage-preview` is now a
`noindex` action-first homepage experiment: one primary action, a three-step default
workflow, a required-checks-only minimum path, an optional single-preview style chooser, and clearly
separated later-use tools. The style chooser keeps one résumé in a fixed preview and
uses five equal controls so the presentation changes without suggesting five different
pages. It can be reviewed without replacing `/`.

For local renderer review, run `ENABLE_EDITOR_PREVIEW=1 npm run dev` and open
`/dev/theme-lab`. The credential-free fixed-frame checks run with
`npm run test:e2e:visual`; set `UPDATE_THEME_BASELINES=1` while running the theme
quality spec only when an intentional renderer change requires new reference values.
