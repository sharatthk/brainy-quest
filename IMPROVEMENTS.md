# Improvements backlog

Proposals from the end of each working session (see CLAUDE.md). Pick one with "do #N"; when it ships, move it to Done with the commit.

## Pending

1. **Faster test loop.** The full browser suite (`tests/e2e`) takes about 17 minutes. Add a quick mode that runs only the flows touched by the changed files, and keep the full suite for pre-deploy runs.
   - Proposed: 2026-11-27, after the middle school math release.
2. **`content-review` skill.** Automate the checks done by hand for new content: sample every new tier, flag trivial or duplicate-choice questions, scan for copied text from source material, and run code snippets, before anything reaches a kid.
   - Proposed: 2026-11-27.
3. **Grade-level paths.** With 83 math skills and 100 lesson units, add a "pick your grade" setting (2nd to 8th) that sets the suggested starting skills, quests and Daily Mix for each player.
   - Proposed: 2026-11-27.

## Done

(none yet)
