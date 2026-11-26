---
name: regression-test
description: Run the Brainy Quest end-to-end browser regression suite (every game flow at phone and desktop size) and review its screenshots. Use after any change to UI, game flow, scoring or content, before deploying, or when asked to test or check the app.
---

# Brainy Quest regression suite

`tests/e2e/` holds a Python Playwright suite (11 flows x 2 viewports). `tests/e2e/README.md` lists what each flow covers and how the in-page oracle answers questions.

## Run

1. Serve the app from the repo root if nothing is on port 8777: `python3 -m http.server 8777` (in the background).
2. Run the whole suite (about 6 minutes):
   ```sh
   cd tests/e2e && /usr/bin/python3 bq_regression.py --parallel
   ```
   Faster loops while fixing: `--viewport phone --only english,spelling`. Against the live site: `--base https://sharatthk.github.io/brainy-quest/`. Against another checkout or worktree without a server: `--dir /path/to/checkout`.
3. Exit code 1 means a failure. Each line names the test, the failed check and the line in `bq_regression.py`.

## Read the results

- A failure is either an app bug or an outdated expectation. Reproduce it in the browser first (the Playwright CLI, `npx -y @playwright/cli@latest -s=tmp open http://localhost:8777/`, then `run-code`) before changing anything.
- Only change a test when the app's new behavior is intended (e.g. a new reward changes coin totals), and say so in the commit.
- Look at the screenshots in `tests/e2e/shots/<viewport>/` for the screens you changed, at both sizes. The suite catches overflow and controls hidden by the buddy bubble, but not ugly layout: check spacing, wrapping, clipped text and anything covering buttons.
- New feature? Add a flow or checks to `bq_regression.py` (same style: `f.check`, `f.shot`, `f.bug`) and a row to the table in `tests/e2e/README.md`.
