# Brainy Quest

Gamified math, English and spelling PWA for kids (about 6 to 11). Vanilla JS ES modules, no build step, no runtime dependencies. README.md has the feature overview and code map.

- Run: `python3 -m http.server 8777` from the repo root, open http://localhost:8777
- Unit tests: `node --test tests/*.test.mjs`
- Browser regression suite (tests/e2e, Python Playwright, phone + desktop): the `regression-test` skill. `--changed` runs only the flows your changes touch; run the full suite before every deploy.
- Adding skills, units, word lists: the `add-content` skill; review content with the `content-review` skill (`node tools/content-review.mjs`)
- Deploying to GitHub Pages: the `deploy-pages` skill

## Conventions

- Pure logic (generators, tiers, scoring, merge, spelling logic) lives in DOM-free modules and is unit tested with a seeded rng (`seeded` in js/shared/util.js). UI code uses the `h()` helper from js/ui.js.
- Every stage has three star tiers; pass rules are in js/shared/mastery.js. Everything is playable at any time; `requires` only drives suggestions.
- Profiles sync between devices as whole objects (js/sync/merge.js): new profile fields must tolerate being missing (default with `||=` or in `migrate`).
- Kid-facing text: short, kind, encouraging. Wrong answers wait for a button; never auto-advance past a mistake.
- Must work at phone width (390px) and desktop, in light and dark ("space") themes. Check both in the browser for any UI change.
- No em dash characters anywhere.
- `js/spelling/woc2024.js` is generated (tools/build-woc.py); never edit by hand.
- Source books or study guides are a topic checklist only: write all content yourself, never commit them, delete them when done.
- Self-improving process: end every task report with 2-3 concrete next improvements (new or better skills, app features, workflow), grounded in what happened that session. Add them to Pending in IMPROVEMENTS.md (skip duplicates), and move items to Done with the commit when they ship.
