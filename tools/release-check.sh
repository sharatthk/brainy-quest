#!/usr/bin/env bash
# Release checks in one go: unit tests, content review, browser suite. Prints one summary; exit 1 on any failure.
#   tools/release-check.sh            # full browser suite (before every deploy)
#   tools/release-check.sh --changed  # browser flows for changed files only (while working)
#   tools/release-check.sh --base https://sharatthk.github.io/brainy-quest/ --smoke   # after a deploy: every screen of the live site loads (seconds)
set -uo pipefail
cd "$(dirname "$0")/.."
LOG=$(mktemp -d "${TMPDIR:-/tmp}/bq-release.XXXXXX")
started_server=""

if [[ " $* " != *" --base "* ]] && ! curl -s -o /dev/null http://localhost:8777/; then
  python3 -m http.server 8777 >/dev/null 2>&1 &
  started_server=$!
  sleep 1
fi
trap '[[ -n "$started_server" ]] && kill "$started_server" 2>/dev/null' EXIT

node --test tests/*.test.mjs >"$LOG/unit.txt" 2>&1; unit=$?
node tools/content-review.mjs >"$LOG/content.txt" 2>&1; content=$?
(cd tests/e2e && /usr/bin/python3 bq_regression.py --parallel "$@") >"$LOG/e2e.txt" 2>&1; e2e=$?

line() { printf '%-15s %-5s %s\n' "$1" "$([[ $2 == 0 ]] && echo PASS || echo FAIL)" "$3"; }
echo
line "Unit tests" $unit "$(grep -E '^ℹ (pass|fail)' "$LOG/unit.txt" | tr '\n' ' ')"
line "Content review" $content "$(tail -1 "$LOG/content.txt")"
line "Browser suite" $e2e "$(grep -E 'passed, ' "$LOG/e2e.txt")"
for f in unit content e2e; do grep -E '^(not ok|✖|ERROR|\[.*\] FAIL)' "$LOG/$f.txt" | sed 's/^/  /'; done
echo "Logs: $LOG"
[[ $unit == 0 && $content == 0 && $e2e == 0 ]]
