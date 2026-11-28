# Improvements backlog

Proposals from the end of each working session (see CLAUDE.md). Pick one with "do #N"; when it ships, move it to Done with the commit.

## Pending

1. **Speed Challenge test in seconds, not minutes.** `speed` (~78 s per viewport) is now the slowest flow because it plays a real 60-second round. Let the runner install Playwright's fake clock for that flow only (`page.clock`) and fast-forward the round, keeping one real-time check of the countdown.
   - Proposed: 2026-11-27, after the test speedup.
2. **Explain-it-back for repeat misses.** Worked examples show after any miss. When the same skill is missed twice in a session, switch the retry to Coach-style steps for non-column skills too (one step at a time, kid types each step), so the explanation is practiced, not just read.
   - Proposed: 2026-11-27.
3. **Grade on the profile picker.** The grade is set on the math map or in Grown-ups settings, so new players start without one. Ask "What grade are you in?" (optional, skippable) when a player is created.
   - Proposed: 2026-11-27.

## Done

- **Speed up the slowest browser flows**: the oracle was not the cost; waiting was. Shortened the after-right-answer pause in tests (`advanceDelay`, `--real-delays` to keep it) and stopped waiting on the buddy's animations. Full suite 17 to about 9.5 min. Proposed 2026-11-27. Shipped in the "Faster tests, better explanations, lesson examples" commit.
- **Content-review fixes**: wider pools (Pythagorean triples and their multiples, circles, number cube events, powers, roots, LCM), no ±1 or 0 operands in integer × ÷ and y = mx + b, and all 129 short lesson explanations rewritten to say why. `content-review`: 0 errors, 0 warnings. Same commit.
- **Worked examples for lessons**: a miss shows 2 solved questions from the same unit, never one still to come in the quiz (`js/lessons/examples.js`). Same commit.
- **Faster test loop**: `bq_regression.py --changed [REF]` runs only the flows covering changed files (`AFFECTS` map). Proposed 2026-11-27. Shipped in the "Stacked sums, K/M symbols, worked examples, grade paths" commit.
- **`content-review` skill**: `tools/content-review.mjs` samples every math tier, checks lessons, runs Python snippets, checks spelling lists and flags text copied from a source. Same commit.
- **Grade-level paths**: "My grade" (1st to 8th) on the math map and in Grown-ups settings; moves ✨ Next, Daily Mix and quest sizes. Same commit.
