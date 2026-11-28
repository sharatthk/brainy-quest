# Improvements backlog

Proposals from the end of each working session (see CLAUDE.md). Pick one with "do #N"; when it ships, move it to Done with the commit.

## Pending

1. **Math book gaps.** Compared with the Math study guide's 63 chapters, missing or thin: types of numbers (rational, irrational), proper and improper fractions and mixed numbers, commission, properties (commutative, associative, distributive), multistep equations with x on both sides, word problems with equations, intro geometry (points, lines, rays), classifying triangles and quadrilaterals, 3D figures, volume of cones, pyramids and spheres, transversals, statistical questions and samples, mode, MAD and IQR, data displays, relations and functions, systems of equations, nonlinear functions, polygons on the coordinate plane, translations, rotations and dilations.
   - Proposed: 2026-11-28, from the coverage check.
2. **English book gaps.** Compared with the English study guide's 32 chapters, missing or thin: intensive pronouns, verbals (gerunds, participles, infinitives), verb moods, reference materials, types of fiction (genres), objective summary, poetry, types of nonfiction, research for writing (sources, citing, plagiarism), and the writing process (draft, revise, edit).
   - Proposed: 2026-11-28.
3. **Science book check.** The Science study guide was not in the last batch of books, so Science Lab was only checked against a keyword list (only the electromagnetic spectrum looked missing). Check it against the book's chapter list.
   - Proposed: 2026-11-28.

## Done

- **Weekly view across devices**: when two devices both changed a player, sync keeps the one with more progress but adds the This week logs together (`mergeDays`, `combineProfile` in `js/sync/merge.js`). Proposed 2026-11-28. Shipped in the "Sync keeps both devices' activity, lesson gaps, live smoke action" commit.
- **Lesson gaps too**: This week lists English, Science and Coding units to review (earlier-grade units not at ★★, or low quiz scores), each linking to its Quiz. Same commit.
- **Smoke check in CI**: `.github/workflows/live-smoke.yml` runs `--smoke` against the live site after every Pages build. Same commit.
- **Weekly note for grown-ups**: a per-day activity log (`js/shared/activity.js`, last 35 days) feeds a This week card: days played, questions and accuracy, XP, stars, what reached ★★. Proposed 2026-11-28. Shipped in the "This week for grown-ups, practice the gaps, smoke check" commit.
- **Close the gaps from the grade card**: Practice the gaps (`#/math/gaps`) runs a session on earlier-grade skills tried but not at ★★ (or weak skills when no grade is set). Same commit.
- **Live check in the release script**: `--smoke` loads every main screen and checks for errors in about 6 seconds; the `deploy-pages` skill uses it after each deploy. Same commit.
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
