# Brainy Quest regression suite

End-to-end flows with Python Playwright (Chromium). Read-only against the app. A dev tool only: the app itself has no dependencies.

Needs Python 3 with `pip install playwright && playwright install chromium` (on this Mac, `/usr/bin/python3` already has it). Serve the app first: `python3 -m http.server 8777` from the repo root.

## Run

```sh
cd tests/e2e
/usr/bin/python3 bq_regression.py --parallel                 # http://localhost:8777/, phone + desktop at once (~10 min)
/usr/bin/python3 bq_regression.py --base http://host:port/   # another server
/usr/bin/python3 bq_regression.py --dir /path/to/brainy-quest --parallel   # serve a folder on http://bq.test/ via routing
/usr/bin/python3 bq_regression.py --viewport phone --only english,spelling
```

Options: `--viewport phone|desktop|all`, `--only name,name`, `--changed [REF]` (only the flows covering files changed since REF, default HEAD), `--parallel` (one process per viewport), `--shots DIR`, `--headed`, `--json out.json`, `--real-delays`.
By default the pause after a right answer is shortened to 300 ms (`window.__bqFastAdvance`, read by `advanceDelay` in `js/ui.js`); `--real-delays` keeps the real 1 to 1.5 s. Layout checks wait for CSS animations to finish, except the buddy's (overlays, sampled separately).
Exit code 1 if any test fails. Old code for comparison: `git -C <repo> archive <ref> | tar -x -C /tmp/bq-old` and run with `--dir /tmp/bq-old`.

## How it works

- Every test runs at **phone** (390x844, `is_mobile`, `has_touch`) and **desktop** (1280x800), each in a fresh browser context with service workers blocked.
- `oracle.js` holds code evaluated in the page:
  - `init` (init script): records every `Math.random()` value, stubs `speechSynthesis.speak` into `window.__said`, and samples the session buddy's speech bubble every 120 ms (`window.__pal`: controls it overlaps, overflow it causes).
  - `math`: finds the problem on screen by replaying the recorded random values through the app's own generators (`js/math/tiers.js genAt`) until one reproduces the rendered prompt, choices and picture. Works for every skill, tier and kind, in practice, Mix, Gym, Coach (gives the `guidedPlan`) and Speed.
  - `english`: matches the on-screen question in `js/english/content.js`.
  - Spelling reads the word from the speech stub after pressing the bee button.
- A flow FAILS on any console error, page error, horizontal overflow (`scrollWidth > viewport` at each screenshot), buddy bubble overlapping a control, failed assertion, or recorded app bug (`f.bug`, which lets the flow continue).
- `api.dictionaryapi.dev` is stubbed, so imported words get a fixed definition and no network is needed.
- Screenshots: `shots/<viewport>/<test>-<nn>-<step>.png` (a `FAILED` / `bug-...` shot is saved at the point of failure).
- Setup shortcut: the shop tests set `coins` (and theme / owned items) by editing the current player in `localStorage['brainyquest.v1']` and reloading (`set_profile_fields`).
- Features missing from older builds (buddy, chest) are detected by whether the app loaded `js/shared/buddy.js`; the buddy test then reports SKIP and chest checks are skipped.

## Tests

| name | covers |
| --- | --- |
| profiles | first visit, empty-name guard, create player, home, add a 2nd player, switch, reload |
| math_map | units, no locked tiles, ✨ Next badge, every skill's sheet has 3 enabled tiers, each opens its practice tier |
| math_practice_tiers | ★ 10/10 earns star, persists on map after reload, ★★ passes at 9/10, ★★★ with 3 first-try misses fails ("Get 8 of 10"), wrong-answer feedback (answer, steps, Got it waits, not covered) |
| math_non_column | 19 typed/choice/division/fraction skills x 3 tiers, answered by the oracle; wrong-answer text; Enter-on-wrong probe |
| math_coach_mix_gym | Coach mode (incl. a wrong column answer), Daily Mix (12), Gym (8, starts coached); chest present only with 5+ answers |
| speed | picker (topic / difficulty / timer), countdown, auto-advance, paused clock on a miss (4 s), resume, full 60 s round, record + leaderboard, chest, Enter-on-wrong probe |
| english | lesson cards, Skip to quiz, tier picker, Warm-up helpers (2 choices, tap count hint, fill first-letter hint), Quiz, Expert, missed Quiz message, Fix my mistakes |
| spelling | list cards + tier picker links, Practice (right, wrong, type it once, second try), Bee Challenge (earn ★, then lose 3 lives; lose at once on ★★), word hive search + modal, import / delete list |
| shop_trophies_parent | buy buddy + theme, not-enough-coins toast, persistence, Space theme, trophies, grown-ups gate, settings, backup download |
| persistence_routes | no-player redirect, coins / attempts survive reload, unknown and invalid routes fall back |
| buddy_gear_chest | buddy on home (stage, bar, name, mood), rename, session buddy bubbles, grow to Baby modal, gear shop (buy / wear / No gear), Space theme bubbles + chest |
| new_math | Big Numbers, Algebra and percents of big numbers: every skill at ★/★★/★★★, a miss per skill waits for Got it, `5M`-style answers |
| quests_stickers | 3 daily quests on home, finishing all of them in one session, quest and sticker rows on results, sticker book (72 slots), Stickers card |
| lesson_subjects | Science Lab and Code Club: home cards, subject home, lesson cards, a Warm-up quiz to a star, indented code blocks in Python quizzes |
| middle_math | Middle school math units on the map, every skill in js/math/middle.js at ★/★★/★★★ with a miss each, typed negative answers |
