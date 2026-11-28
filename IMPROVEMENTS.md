# Improvements backlog

Proposals from the end of each working session (see CLAUDE.md). Pick one with "do #N"; when it ships, move it to Done with the commit.

## Pending

1. **Pushes need a human.** The auto-mode permission check blocks `git push origin main`, so every release stops until someone runs it by hand. Add a permission rule for that one command (the `update-config` skill), or deploy from a release branch through a PR that the owner merges.
   - Proposed: 2026-11-27, after two releases sat unpushed.
2. **Picture questions in the walk-through.** 18 tiers (fraction pictures, number lines, quadrants, median, dice) still give the walk-through nothing to type. Add a small "count the parts" or "which side of 0" choice step to those generators.
   - Proposed: 2026-11-27.
3. **Parent view of the grade path.** The Grown-ups corner shows stars and trouble spots, but not how the player is doing against their grade. Add "on grade / ahead / catching up" per subject, using the skill and unit grades.
   - Proposed: 2026-11-27.

## Done

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
