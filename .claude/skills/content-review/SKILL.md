---
name: content-review
description: Review Brainy Quest learning content before it reaches a kid - sample every math star tier, flag broken or trivial or repetitive questions and thin explanations, check lesson units and spelling lists, run Python snippets, and scan for text copied from a source book. Use after adding or changing math skills, lesson units or word lists, or when asked to review, audit or quality-check content.
---

# Content review

`tools/content-review.mjs` runs every check that used to be done by hand. ERROR lines are broken content (exit 1); WARN lines need a human look.

## Run

```sh
node tools/content-review.mjs                                  # everything (about 2 s)
node tools/content-review.mjs --skill big-muldiv --show 3      # one math skill: print 3 solved samples per tier
node tools/content-review.mjs --unit py-loops,py-func          # some lesson units (English, Science, Coding)
node tools/content-review.mjs --unit grammar-x --source ~/book.txt   # flag 8-word runs copied from a source
node tools/content-review.mjs --spelling                       # spelling lists only
```

Other options: `--samples N` (default 300 per tier), `--no-python`, `--strict` (list every lesson explanation under 25 characters).

## What it checks

- **Math, per skill and tier**: generator errors, answer missing from choices, duplicate choices, NaN answers, missing steps, em dashes; WARN for single short explanations, problems with 0 or 1 operands, inline `a + b = ?` (use `stacked()`), Big Numbers × and ÷ with long digit strings (use `shortBig()` K / M / B), and low variety.
- **Lessons**: fewer than 7 questions, duplicate questions, mc answer not in choices, tap answers that do not appear exactly once, fill without `___`, missing explanations, code lines over 32 characters, em dashes. Python units: runs each snippet with `python3 -I` and compares "What does this program print?" answers with the real output.
- **Spelling**: duplicate words, definitions containing the word, em dashes.
- **Source overlap** (`--source`): any 8 words in a row shared with the source book.

## Then

1. Fix every ERROR. For each WARN, read the samples (`--show 3`) and fix it or decide it is fine (small fact domains like "sums to 5" are repetitive by nature).
2. Read at least 3 samples per new tier yourself: the tool cannot judge whether an explanation is kind and clear.
3. Run the unit tests and the `regression-test` skill (`--changed` for a quick pass).
