# Improvements backlog

Proposals from the end of each working session (see CLAUDE.md). Pick one with "do #N"; when it ships, move it to Done with the commit.

## Pending

1. **Speed up the slowest browser flows.** `middle_math` (~200 s) and `math_non_column` (~160 s) dominate the 17-minute suite; the oracle replays up to 60,000 random values per question. Expose the current problem on the card (a `data-` attribute in test builds) or cache the replay offset so each lookup is instant.
   - Proposed: 2026-11-27, after the worked-examples release.
2. **Content-review fixes.** `node tools/content-review.mjs` still warns on 26 tiers: tiny problem pools (Pythagorean triples, circles, number cubes, √ and powers repeat within a session), 0 or 1 operands in fraction and integer × ÷, and 129 lesson explanations under 25 characters. Widen the pools and give lesson explanations a "because".
   - Proposed: 2026-11-27.
3. **Worked examples for lessons.** Math misses now show 2 worked examples; English, Science and Coding misses only show the answer and a short `e`. Add an optional `ex` (two short example sentences) per lesson question, starting with the units the parent report shows as trouble spots.
   - Proposed: 2026-11-27.

## Done

- **Faster test loop**: `bq_regression.py --changed [REF]` runs only the flows covering changed files (`AFFECTS` map). Proposed 2026-11-27. Shipped in the "Stacked sums, K/M symbols, worked examples, grade paths" commit.
- **`content-review` skill**: `tools/content-review.mjs` samples every math tier, checks lessons, runs Python snippets, checks spelling lists and flags text copied from a source. Same commit.
- **Grade-level paths**: "My grade" (1st to 8th) on the math map and in Grown-ups settings; moves ✨ Next, Daily Mix and quest sizes. Same commit.
