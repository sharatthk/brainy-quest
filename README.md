# Brainy Quest

Gamified learning for kids: **Math Quest**, **Word Wizard** (English) and **Spelling Bee**.
It's an installable web app (PWA) with no build step and no dependencies. It runs on Windows, Mac, iPad, Android and iPhone, and works offline after the first visit.

## Run

```sh
cd brainy-quest
python3 -m http.server 8777
# open http://localhost:8777
```

To use it on a tablet or phone on the same Wi-Fi, run `python3 -m http.server 8777 --bind 0.0.0.0` and open `http://<this-computer-ip>:8777`.
Install it as an app with the browser's "Install app" or "Add to Home Screen". For a permanent link, deploy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).

Progress is saved in the browser (localStorage) per player. Use **Grown-ups → Download backup** to move it to another device, or turn on cloud sync.

## Cloud sync (optional, Firebase)

Sign in with Google on **Grown-ups → Cloud sync** (or on the player picker of a new device). Every player and imported word list is kept in sync on all devices signed in to the same account. The merge is three-way per player: whichever side changed wins, and if both changed, the copy with more XP wins. See `js/sync/merge.js`.

One-time setup:
1. In the [Firebase console](https://console.firebase.google.com), create a project (Google Analytics is not needed).
2. **Build → Authentication → Get started → Google → Enable.** Then go to **Settings → Authorized domains** and add your site's domain, e.g. `yourname.github.io`.
3. **Build → Firestore Database → Create database** (production mode). On the **Rules** tab, paste `firestore.rules` and publish.
4. **Project settings → Your apps → Web (`</>`)**: register an app, then copy the `firebaseConfig` object into `js/sync/firebase-config.js`.

With `firebaseConfig = null`, sync is off and the Firebase SDK is never loaded.
To test locally without a real project: run `npx firebase-tools emulators:start --only auth,firestore --project demo-bq`, then set the config's `projectId` to `demo-bq`. Any `demo-*` project ID connects to the local emulators.

## Test

```sh
node --test tests/*.test.mjs
```

## What's inside

| Area | Highlights |
| --- | --- |
| Math | 34 skills from 2-digit addition to 4-digit addition/subtraction and percents. **Star tiers:** every skill has ★ Easy, ★★ Medium and ★★★ Hard problems of an exact shape (e.g. 3-digit, one carry: from the ones, from the tens, into the thousands). Get 8 of 10 right on the first try to earn that star and open the next tier. You unlock the next skill by earning ★★, or by passing a "5 in a row" challenge. The Daily Mix and Gym serve each skill at the tier you are working on. Column layout with one answer box whose digits line up under the columns. Carry/borrow boxes are optional (a toggle, remembered per player) and get filled in automatically after a wrong answer. Detects classic mistakes (forgot to carry, flipped subtraction, forgot to decrement, missing placeholder 0) and replays them in **Coach mode**, one column at a time. Also has a Daily Mix (weighted toward weak skills), a Carry & Borrow Gym, and **Speed Challenges**: 1, 2 or 3-minute rounds per topic at ★, ★★ or ★★★ difficulty, with points for difficulty and quick answers, a streak multiplier up to ×4, personal records and a family leaderboard. |
| English | 26 units in 6 sections: parts of speech, sentences, punctuation, word power, figurative language, reading and writing. Each unit has lesson cards (read aloud) and then three star tiers: ★ Warm-up (6 questions, two choices, hints), ★★ Quiz (8 questions) and ★★★ Expert (every question, at most 1 miss). Missed questions come back through spaced repetition in "Fix my mistakes". |
| Spelling | Official 2024 Words of the Champions (4,001 words, 3 levels) plus starter lists. Hear the word, ask for its meaning, a sentence, a slow repeat or a paid hint, then type it. A letter-by-letter diff shows where you went wrong, and you type the word correctly once to lock it in. Leitner spaced repetition: a word is mastered after 3 spaced correct recalls. Each list splits into ★ easy, ★★ medium and ★★★ hard words (by length and tricky patterns); spell 10 right in a tier's **Bee Challenge** (3 lives) to earn its star. You can import any word list (paste or upload). Missing definitions are fetched from dictionaryapi.dev. |
| Game layer | Coins, XP and levels, daily goal, day streaks, combos, 35 achievements, and a shop with buddies and themes. Confetti and sounds are generated in code, so there are no asset files. |

## Official spelling bee list

The Spelling Bee includes the **2024 Words of the Champions** from the Scripps National Spelling Bee: 4,001 words across One Bee, Two Bee and Three Bee. Each level is split into its 150-word School Study List and the rest of the list. Alternate spellings (e.g. `practice OR practise`) are accepted as correct, and meanings and example sentences are looked up on demand.

`js/spelling/woc2024.js` is generated. To rebuild it from a newer PDF:

```sh
python3 -m venv .venv && .venv/bin/pip install pypdf
.venv/bin/python tools/build-woc.py "path/to/Words of the Champions.pdf"
```

You can still add your own lists with **Spelling Bee → Import word list** (one word per line, optional `| definition | sentence`, alternates with `OR`).

## Code map

- `js/math/skills.js`: skill tree, generators, worked solutions, misconception detection (pure, unit tested)
- `js/math/column.js`, `js/math/guided.js`: column workspace and coach mode
- `js/math/tiers.js`: the three star tiers of every math skill (pure, unit tested). Tier pass rules live in `js/shared/mastery.js`; English and spelling tiers in `js/english/tiers.js` and `js/spelling/logic.js`
- `js/math/question.js`: renders any problem's input (shared by practice and speed); `js/math/speed.js` + `scoring.js`: Speed Challenge
- `js/english/content.js`: all lessons and questions (add units here)
- `js/spelling/words.js`: starter lists. `js/spelling/logic.js`: matching, diff and import parsing
- `js/sync/`: optional Firebase cloud sync (`merge.js` is the pure, tested merge logic)
- `js/shared/`: mastery and spaced repetition, rewards, achievements, speech, sound, confetti
