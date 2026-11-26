---
name: deploy-pages
description: Release Brainy Quest to GitHub Pages - test, commit to main, push, wait for the Pages build, and verify the live site. Use when the user asks to commit, deploy, publish, release, or for the live URL.
---

# Deploy Brainy Quest

Live site: https://sharatthk.github.io/brainy-quest/ (GitHub Pages, legacy build from `main`, root folder). There is no build step: what is on `main` is what is served.

1. **Test**: `node --test tests/*.test.mjs` must pass. For UI changes also run the browser suite (the `regression-test` skill).
2. **Commit on `main`** (this repo commits straight to main; Pages publishes from it). Stage only app files (`README.md css js tests tools index.html sw.js manifest.webmanifest .claude/skills CLAUDE.md` as relevant), never `private/` or `.claude/worktrees/`. Message: a short title plus bullets of what changed for players. Do not add a co-author line.
3. **Push**: `git push origin main`.
4. **Wait for the build** of that commit:
   ```sh
   sha=$(git rev-parse --short HEAD)
   for i in $(seq 1 30); do s=$(gh api repos/sharatthk/brainy-quest/pages/builds/latest -q '.status+" "+.commit'); case "$s" in built\ $sha*|errored*) echo "$s"; break;; esac; sleep 10; done
   ```
5. **Verify live**: run the regression suite against the live URL (or at least load the changed screens) and check there are no page errors. The service worker is network-first, so a normal refresh shows the new version.
6. Report the commit, the live URL, and what was verified.
