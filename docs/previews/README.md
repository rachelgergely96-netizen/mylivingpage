# Design previews

Visual review artifacts for the Signal Frame homepage implementation. These images are reference captures, not production assets.

- `signal-frame-homepage-desktop.png` — desktop hero and interactive product story
- `signal-frame-homepage-mobile.png` — 390 × 844 mobile viewport
- `signal-frame-homepage-full.png` — full desktop homepage concept
- `signal-frame-homepage-artifact-browser.png` — 1440 × 1000 standalone concept capture used during the Signal Frame review

The production homepage uses the Signal Frame design. `/homepage-preview` is now a
`noindex` action-first homepage experiment: one primary action, a three-step default
workflow, an only-what-you-need quick start, a plain-language ATS/search/AI explanation,
a concrete always-free promise, a three-context live product story, an optional
five-card style chooser, and clearly separated later-use tools. The live story
shows how one reviewed résumé becomes an ATS-ready PDF, a Living Resume, or a sharp
Share Card. The five equal style controls sit directly under that story. Choosing one
opens and updates the Living Resume above, so there is one obvious preview and no
separate design showcase. It can be reviewed without replacing `/`.

For local renderer review, run `ENABLE_EDITOR_PREVIEW=1 npm run dev` and open
`/dev/theme-lab`. The credential-free fixed-frame checks run with
`npm run test:e2e:visual`; set `UPDATE_THEME_BASELINES=1` while running the theme
quality spec only when an intentional renderer change requires new reference values.
