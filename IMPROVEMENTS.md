# Improvements backlog

Proposals from the end of each working session (see CLAUDE.md). Pick one with "do #N"; when it ships, move it to Done with the commit.

## Pending

1. **Walk-through for reading questions.** 48 math tiers (compare, quadrants, median, GCF and others) have no `= result` step, so their walk-through only lets the kid read and tap Next. Give those generators a small "you do it" step, like "Which is bigger: 0.5 or 0.45?" in the middle of the steps, as a choice inside the walk.
   - Proposed: 2026-11-27, after the walk-through release.
2. **Grade-aware lessons.** The grade now moves math suggestions and quest sizes but not English, Science or Coding. Give lesson sections a grade like math skills and use it for the suggested next unit on each subject page.
   - Proposed: 2026-11-27.
3. **One command for the release checks.** Each release runs unit tests, `content-review`, the browser suite, commit, push and a live check by hand. A `tools/release-check.sh` that runs the first three and prints one summary would make the `deploy-pages` skill shorter and harder to skip steps in.
   - Proposed: 2026-11-27.

## Done

- **Speed Challenge test in seconds**: Playwright fake clock for the speed flow (fast-forwards the paused-clock check and the end of the round, keeps one real-time tick check). 78 s to 21 s. Proposed 2026-11-27. Shipped in the "Walk-through retries, grade at sign-up" commit.
- **Explain-it-back for repeat misses**: a 2nd miss on the same skill turns the retry into a walk-through (`js/math/walk.js`); column skills get Coach mode. Same commit.
- **Grade on the profile picker**: optional grade chips when creating a player. Same commit.
- **Speed up the slowest browser flows**: the oracle was not the cost; waiting was. Shortened the after-right-answer pause in tests (`advanceDelay`, `--real-delays` to keep it) and stopped waiting on the buddy's animations. Full suite 17 to about 9.5 min. Proposed 2026-11-27. Shipped in the "Faster tests, better explanations, lesson examples" commit.
- **Content-review fixes**: wider pools (Pythagorean triples and their multiples, circles, number cube events, powers, roots, LCM), no ±1 or 0 operands in integer × ÷ and y = mx + b, and all 129 short lesson explanations rewritten to say why. `content-review`: 0 errors, 0 warnings. Same commit.
- **Worked examples for lessons**: a miss shows 2 solved questions from the same unit, never one still to come in the quiz (`js/lessons/examples.js`). Same commit.
- **Faster test loop**: `bq_regression.py --changed [REF]` runs only the flows covering changed files (`AFFECTS` map). Proposed 2026-11-27. Shipped in the "Stacked sums, K/M symbols, worked examples, grade paths" commit.
- **`content-review` skill**: `tools/content-review.mjs` samples every math tier, checks lessons, runs Python snippets, checks spelling lists and flags text copied from a source. Same commit.
- **Grade-level paths**: "My grade" (1st to 8th) on the math map and in Grown-ups settings; moves ✨ Next, Daily Mix and quest sizes. Same commit.
