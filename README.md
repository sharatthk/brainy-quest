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

Browser regression suite (every flow at phone and desktop size, Python Playwright): see `tests/e2e/README.md`.

## What's inside

| Area | Highlights |
| --- | --- |
| Math | 83 skills.  from counting and facts to 20 (**Math Basics**) up to 4-digit addition/subtraction, percents (including `20% of 500`), **Big Numbers** (millions and billions with K / M / B symbols: `3M + 2M`, `40 × 300K`, `3M × 5K`, `25% of 8M`; answers can be typed as `6M` or `6 million`) and **Algebra** (missing numbers, solve for x, two-step equations, expressions, In → Out rules). Middle school units: **Ratios & Rates** (ratios, unit rates and prices, proportions, unit conversions), **Percents & Money** (tax, tips, discounts, markups, simple interest, percent change), **Integers** (negative numbers, absolute value, + − × ÷), **Factors & Multiples** (GCF, LCM), **Exponents & Roots** (powers, order of operations, scientific notation, square and cube roots), **Geometry** (angles, area, circles, volume and surface area, the Pythagorean theorem, scale), **Statistics & Probability** and **Graphs & Functions** (quadrants, reflections, slope, y = mx + b), plus fraction and decimal × and ÷, like terms and inequalities. Negative answers can be typed with a minus sign. **Start anywhere:** every skill and star tier is open; a ✨ Next badge suggests the path. **My grade** (1st to 8th, picked when the player is created, on the map or in Grown-ups settings) starts the suggestions at the player's grade, keeps the Daily Mix on grade, sizes the daily quests and picks "Next up" in English, Science and Coding. **Star tiers:** every skill has ★ Easy, ★★ Medium and ★★★ Hard problems of an exact shape (e.g. 3-digit, one carry: from the ones, from the tens, into the thousands). Get 8 of 10 right on the first try to earn that star; ★★ moves the suggestion on to the next skill. The Daily Mix and Gym serve each skill at the tier you are working on. Every + and − is written one number below the other (places and decimal points lined up); column problems have one answer box whose digits line up under the columns. **After a wrong answer:** what you answered, the right answer, a hint for the mistake when it is a known one (forgot to carry, wrong sign, wrong number of zeros, off by one), the step-by-step solution, and **2 more worked examples** of the same tier. Miss the same skill twice and the retry becomes a **walk-through**: the steps appear one at a time, the kid works out each step's result, then answers the whole problem (column skills get Coach mode instead). Carry/borrow boxes are optional (a toggle, remembered per player) and get filled in automatically after a wrong answer. Detects classic mistakes (forgot to carry, flipped subtraction, forgot to decrement, missing placeholder 0) and replays them in **Coach mode**, one column at a time. Also has a Daily Mix (weighted toward weak skills), a Carry & Borrow Gym, and **Speed Challenges**: 1, 2 or 3-minute rounds per topic at ★, ★★ or ★★★ difficulty, with points for difficulty and quick answers, a streak multiplier up to ×4, a paused clock while you read a missed answer, personal records and a family leaderboard. |
| English | 54 units in 11 sections (grammar, phrases and clauses, sentence types, vocabulary and roots, reading literature and informational text, and argument, narrative and informative writing), starting with **English Basics** (ABC order, rhymes, naming and doing words, plurals, first sentences, opposites), then parts of speech, sentences, punctuation, word power, figurative language, reading and writing. Each unit has lesson cards (read aloud) and then three star tiers: ★ Warm-up (6 questions, two choices, hints), ★★ Quiz (8 questions) and ★★★ Expert (every question, at most 1 miss). A miss shows the answer, why, and 2 solved examples from the same unit (never a question still to come). Missed questions come back through spaced repetition in "Fix my mistakes". |
| Science | **Science Lab**: 23 units in 7 sections (thinking like a scientist, matter and chemistry, forces, motion and energy, life science, the human body, Earth science, space). Same lesson cards and ★ Warm-up / ★★ Quiz / ★★★ Expert quizzes as English. |
| Coding | **Code Club**: 23 units in 7 sections (computing systems, binary and data, building software, algorithms, programming basics with block-style code, Python, and the web with HTML and CSS). Questions can show real code blocks, e.g. "What does this program print?". |
| Spelling | Starter lists from beginner short words (Level 0) up, plus the official 2024 Words of the Champions (4,001 words, 3 levels). Hear the word, ask for its meaning, a sentence, a slow repeat or a paid hint, then type it. A letter-by-letter diff shows where you went wrong, and you type the word correctly once to lock it in. Leitner spaced repetition: a word is mastered after 3 spaced correct recalls. Each list splits into ★ easy, ★★ medium and ★★★ hard words (by length and tricky patterns); spell 10 right in a tier's **Bee Challenge** (3 lives) to earn its star. You can import any word list (paste or upload). Missing definitions are fetched from dictionaryapi.dev. |
| Game layer | **Daily quests** (3 a day, picked per player, paid as soon as they are done, with a bonus and a sticker for all three), a **sticker book** (6 themed pages, 72 stickers, one new sticker per star earned, +100 coins per full page), coins, XP and levels, daily goal, day streaks, combos, 35 achievements, and a shop with buddies, themes and hats & gear. **Buddy pet:** your avatar hatches from an egg and grows (Egg, Baby at 3, Kid at 12, Hero at 30, Legend at 60 food; every star and finished session is food), has a name you can change, gets hungry if you skip a day, cheers you on during sessions and wears the gear you equip. **Mystery chest:** every finished session with 5+ answers ends with a chest: coins (60%), bonus XP (28%) or a rare gear item (12%). Confetti and sounds are generated in code, so there are no asset files. |
| Grown-ups | Behind a times-table gate: progress overview, **This week** (days played, questions and accuracy, XP, stars, what reached ★★, gaps with a **Practice the math gaps** button that starts a session on them, and English, Science and Coding units to review with links to their Quiz), **Grade path** (on grade / ahead / catching up per subject), trouble spots, per-skill and per-unit tables, settings (including the grade), backup and cloud sync. |

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
- `js/math/middle.js`: middle school skills, units and their star tiers (pure, unit tested)
- `js/math/tiers.js`: the three star tiers of every math skill (pure, unit tested). Tier pass rules live in `js/shared/mastery.js`; lesson-subject tiers (English, Science, Coding) in `js/lessons/tiers.js`, spelling tiers in `js/spelling/logic.js`. `js/lessons/lessonApp.js` is the shared lesson engine and `js/lessons/subjects.js` the subject registry
- `js/math/examples.js`, `js/lessons/examples.js`: worked examples after a miss (math: 2 more problems of the tier; lessons: 2 solved questions from the unit that are not coming up in the quiz); `js/math/grades.js`: the grade of every skill and the grade path rules (both pure, unit tested)
- `js/math/walk.js`: the walk-through retry after a 2nd miss (`stepBlank` splits a step at its `= result`)
- `js/math/question.js`: renders any problem's input (shared by practice and speed); `js/math/speed.js` + `scoring.js`: Speed Challenge
- `js/english/content.js`: all lessons and questions (add units here)
- `js/spelling/words.js`: starter lists. `js/spelling/logic.js`: matching, diff and import parsing
- `js/sync/`: optional Firebase cloud sync (`merge.js` is the pure, tested merge logic; when two devices both changed a player, the one with more progress wins and the This week logs are added together)
- `js/shared/`: mastery and spaced repetition, rewards, achievements, speech, sound, confetti
- `js/shared/quests.js`, `js/shared/stickers.js`: daily quests and the sticker book (pure, unit tested); `js/views/progressCards.js` renders the home quests card, the results card and the sticker book
- `tools/content-review.mjs`: content checks (the `content-review` skill); `tools/release-check.sh`: unit tests, content review and the browser suite with one summary
- `js/shared/activity.js`: the per-day activity log (answers, XP, stars) and the grown-ups' This week summary
- `js/lessons/grades.js`: the grade of every lesson unit and the "Next up" rule; `js/shared/gradeReport.js`: on grade / ahead / catching up per subject for the Grown-ups corner
- `js/shared/buddy.js`, `js/shared/chest.js`: buddy stages, mood, reactions, gear and the chest roll (pure, unit tested); `js/views/buddy.js`, `js/views/chest.js` render them
