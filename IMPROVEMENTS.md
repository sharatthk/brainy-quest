# Improvements backlog

Proposals from the end of each working session (see CLAUDE.md). Pick one with "do #N"; when it ships, move it to Done with the commit.

## Pending

1. **Weekly note for grown-ups.** The grade path card shows status only when someone opens the Grown-ups corner. A short "this week" summary on that page (stars earned, skills moved to ★★, the biggest gap) would make the check-in take seconds.
   - Proposed: 2026-11-28.
2. **Close the gaps from the grade card.** "Catching up" lists no skills. Add a "Practice the gaps" button that starts a Daily Mix limited to the below-grade skills tried but not at ★★.
   - Proposed: 2026-11-28.
3. **Live check in the release script.** `tools/release-check.sh --base <live url>` runs every flow against the live site (about 10 minutes). Add `--smoke` that loads each screen once and checks for page errors, for a 1-minute post-deploy check.
   - Proposed: 2026-11-28.

## Done

- **Pushes need a human**: `Bash(git push origin main)` is allowed in `.claude/settings.local.json` (local, not committed); the `deploy-pages` skill notes it. Proposed 2026-11-27. Done 2026-11-28 (no commit: local settings).
- **Picture questions in the walk-through**: steps can mark the number to ask as `[[n]]` (stripped from shown steps by `genAt`); fraction pictures, ratios, number cubes, median, reflections, slope and more now ask. Tiers with nothing to ask: 18 to 5 (yes/no, compare and pick-a-quadrant). Shipped in the "Grade report for grown-ups, more walk-through questions" commit.
- **Parent view of the grade path**: a Grade path card in the Grown-ups corner shows on grade / ahead / catching up per subject (`js/shared/gradeReport.js`). Same commit.
- **Walk-through for reading questions**: the walk-through also asks for a worked-out number when a step has no `= result` (the last number in the step that is not in the problem). Tiers with nothing to ask went from 48 to 18. Proposed 2026-11-27. Shipped in the "Grade-aware lessons, smarter walk-through, release check" commit.
- **Grade-aware lessons**: every English, Science and Coding unit has a grade (`js/lessons/grades.js`); "Next up" and the ✨ Next badge follow the player's grade. Same commit.
- **One command for the release checks**: `tools/release-check.sh` runs unit tests, content review and the browser suite with one summary; the `deploy-pages` skill uses it. Same commit.
- **Speed Challenge test in seconds**: Playwright fake clock for the speed flow (fast-forwards the paused-clock check and the end of the round, keeps one real-time tick check). 78 s to 21 s. Proposed 2026-11-27. Shipped in the "Walk-through retries, grade at sign-up" commit.
- **Explain-it-back for repeat misses**: a 2nd miss on the same skill turns the retry into a walk-through (`js/math/walk.js`); column skills get Coach mode. Same commit.
- **Grade on the profile picker**: optional grade chips when creating a player. Same commit.
- **Speed up the slowest browser flows**: the oracle was not the cost; waiting was. Shortened the after-right-answer pause in tests (`advanceDelay`, `--real-delays` to keep it) and stopped waiting on the buddy's animations. Full suite 17 to about 9.5 min. Proposed 2026-11-27. Shipped in the "Faster tests, better explanations, lesson examples" commit.
- **Content-review fixes**: wider pools (Pythagorean triples and their multiples, circles, number cube events, powers, roots, LCM), no ±1 or 0 operands in integer × ÷ and y = mx + b, and all 129 short lesson explanations rewritten to say why. `content-review`: 0 errors, 0 warnings. Same commit.
- **Worked examples for lessons**: a miss shows 2 solved questions from the same unit, never one still to come in the quiz (`js/lessons/examples.js`). Same commit.
- **Faster test loop**: `bq_regression.py --changed [REF]` runs only the flows covering changed files (`AFFECTS` map). Proposed 2026-11-27. Shipped in the "Stacked sums, K/M symbols, worked examples, grade paths" commit.
- **`content-review` skill**: `tools/content-review.mjs` samples every math tier, checks lessons, runs Python snippets, checks spelling lists and flags text copied from a source. Same commit.
- **Grade-level paths**: "My grade" (1st to 8th) on the math map and in Grown-ups settings; moves ✨ Next, Daily Mix and quest sizes. Same commit.
