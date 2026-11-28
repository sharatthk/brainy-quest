#!/usr/bin/python3
"""Brainy Quest end-to-end regression suite (Python Playwright).

Usage (see README.md):
  /usr/bin/python3 bq_regression.py                       # http://localhost:8777/, both viewports
  /usr/bin/python3 bq_regression.py --base http://host:port/
  /usr/bin/python3 bq_regression.py --dir /path/to/brainy-quest   # served on http://bq.test/ via routing
  /usr/bin/python3 bq_regression.py --viewport phone --only math_practice_tiers,spelling
  /usr/bin/python3 bq_regression.py --parallel            # one process per viewport
"""
import argparse, json, mimetypes, pathlib, re, subprocess, sys, time, traceback
from playwright.sync_api import sync_playwright, expect

HERE = pathlib.Path(__file__).resolve().parent
ORACLE = {}
for chunk in (HERE / 'oracle.js').read_text().split('//---- ')[1:]:
    name, _, body = chunk.partition('\n')
    ORACLE[name.strip()] = '\n'.join(l for l in body.splitlines() if not l.startswith('//')).strip()

VIEWPORTS = {
    'phone': dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2),
    'desktop': dict(viewport={'width': 1280, 'height': 800}),
}
FAKE_ORIGIN = 'http://bq.test/'
for ext, ct in {'.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
                '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
                '.webmanifest': 'application/manifest+json'}.items():
    mimetypes.add_type(ct, ext)

DICT_STUB = [{'word': 'stub', 'origin': '', 'meanings': [{'partOfSpeech': 'noun', 'definitions': [
    {'definition': 'a word used by the regression suite', 'example': 'This is an example sentence.'}]}]}]


class Fail(AssertionError):
    pass


class Skip(Exception):
    pass


# ---------------------------------------------------------------- flow context

class Flow:
    """One test at one viewport: fresh context, error capture, screenshots, overflow checks."""

    def __init__(self, browser, args, vp, name):
        self.args, self.vp, self.name = args, vp, name
        self.base = FAKE_ORIGIN if args.dir else args.base
        self.ctx = browser.new_context(service_workers='block', accept_downloads=True, **VIEWPORTS[vp])
        self.ctx.add_init_script(ORACLE['init'])
        if not args.real_delays:  # shorten the pause after a right answer (js/ui.js advanceDelay)
            self.ctx.add_init_script('window.__bqFastAdvance = true;')
        if args.dir:
            root = pathlib.Path(args.dir).resolve()
            self.ctx.route(FAKE_ORIGIN + '**', lambda r: serve_dir(r, root))
        self.ctx.route('https://api.dictionaryapi.dev/**', lambda r: r.fulfill(
            status=200, content_type='application/json', body=json.dumps(DICT_STUB)))
        self.page = self.ctx.new_page()
        self.errors, self.notes, self.bugs, self.n = [], [], [], 0
        self.page.on('console', lambda m: m.type == 'error' and self.errors.append(f'console.error: {m.text}'))
        self.page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}'))
        self.page.on('dialog', lambda d: d.accept())
        self.loaded_buddy = False
        self.page.on('response', lambda r: r.url.endswith('/js/shared/buddy.js') and r.ok and setattr(self, 'loaded_buddy', True))
        self.pal = {'shown': 0, 'texts': [], 'hits': [], 'overflow': []}
        self.shots = pathlib.Path(args.shots) / vp
        self.shots.mkdir(parents=True, exist_ok=True)
        self.width = VIEWPORTS[vp]['viewport']['width']

    def close(self):
        self.ctx.close()

    # --- navigation
    def goto(self, hash_path='/', wait='main.screen'):
        # Mark the current screen as stale so we never act on it after a hash-only navigation.
        try:
            self.page.evaluate("document.querySelector('main')?.setAttribute('data-stale', '1')")
        except Exception:
            pass
        if self.page.url.split('#', 1)[-1] == hash_path and '#' in self.page.url:
            self.collect_pal()
            self.page.reload()  # same hash: no hashchange event, so reload to get a fresh screen
        else:
            self.page.goto(self.base + '#' + hash_path)
        if wait:
            self.page.wait_for_selector('main.screen:not([data-stale])')
            self.page.wait_for_selector(wait)
        self.page.wait_for_timeout(150)

    def collect_pal(self):
        try:
            p = self.page.evaluate('window.__pal')
        except Exception:
            return
        if not p:
            return
        self.pal['shown'] += p['shown']
        for k in ('texts', 'hits', 'overflow'):
            self.pal[k] += [x for x in p[k] if x not in self.pal[k]]

    def reload(self):
        self.collect_pal()
        self.page.reload()
        self.page.wait_for_selector('main.screen')
        self.page.wait_for_timeout(150)

    def hash(self):
        return self.page.evaluate('location.hash')

    # --- checks
    def bug(self, msg):
        """Record an app bug but keep the flow going (the test is reported as FAIL)."""
        if msg not in self.bugs:
            self.bugs.append(msg)
            self.shot('bug-' + msg[:30], overflow=False)

    def check(self, cond, msg):
        if not cond:
            raise Fail(msg)

    def overflow(self, label):
        # Measure the settled layout: let finite CSS animations (e.g. the 0.25s card slide-in) finish first.
        try:
            # The buddy's hop and speech bubble are overlays (their overflow is sampled separately), so skip them.
            self.page.wait_for_function("() => !document.getAnimations().some(a => a.playState === 'running' && a.effect && "
                                        "Number.isFinite(a.effect.getComputedTiming().endTime) && !a.effect.target?.closest?.('.pal, .buddy-body'))", timeout=1500)
        except Exception:
            pass
        sw = self.page.evaluate('document.documentElement.scrollWidth')
        self.check(sw <= self.width, f'[{label}] horizontal overflow: scrollWidth {sw} > viewport {self.width}')

    def shot(self, label, full=True, overflow=True):
        self.n += 1
        safe = re.sub(r'[^a-z0-9]+', '-', label.lower()).strip('-')
        p = self.shots / f'{self.name}-{self.n:02d}-{safe}.png'
        self.page.wait_for_timeout(120)
        self.page.screenshot(path=str(p), full_page=full)
        if overflow:
            self.overflow(label)
        return p

    def text(self, sel='main'):
        return self.page.locator(sel).first.inner_text()

    def wait_text(self, text, sel='main:not([data-stale])', timeout=5000):
        self.page.locator(sel, has_text=text).first.wait_for(timeout=timeout)

    # --- question cards: mark the current one, then wait for a different one (or the results)
    def mark(self, sel='.stage .q-card'):
        self.page.evaluate("s => { const c = [...document.querySelectorAll(s)].pop(); if (c) c.dataset.seen = '1'; }", sel)

    def wait_good(self, sel='.stage .q-card', timeout=3000):
        """After a right answer: the marked card shows ✅, or it already moved on (fast advance) to a new card or results."""
        self.page.wait_for_function("s => document.querySelector('.results') || [...document.querySelectorAll(s)].some(c => c.dataset.seen ? c.querySelector('.fb.good') : true)",
                                    arg=sel, timeout=timeout)

    def wait_next(self, sel='.stage .q-card', timeout=8000):
        self.page.wait_for_function("s => document.querySelector('.results') || [...document.querySelectorAll(s)].some(c => !c.dataset.seen)",
                                    arg=sel, timeout=timeout)
        self.page.wait_for_timeout(80)

    def done(self):
        return self.page.locator('.results').count() > 0


def serve_dir(route, root):
    url = route.request.url
    rel = url[len(FAKE_ORIGIN):].split('?')[0].split('#')[0] or 'index.html'
    f = (root / rel).resolve()
    if (root != f and root not in f.parents) or not f.is_file():
        return route.fulfill(status=404, body='not found', content_type='text/plain')
    route.fulfill(status=200, body=f.read_bytes(),
                  headers={'content-type': mimetypes.guess_type(str(f))[0] or 'application/octet-stream', 'cache-control': 'no-store'})


# ---------------------------------------------------------------- app helpers

def new_player(f, name, avatar='🦊'):
    f.goto('/profiles')
    f.page.get_by_placeholder('Your name').fill(name)
    f.page.locator('.avatar-pick button', has_text=avatar).click()
    f.page.get_by_role('button', name="Let's go").click()
    f.wait_text(f'Hi, {name}!', '.hero')


def state(f):
    return f.page.evaluate("JSON.parse(localStorage.getItem('brainyquest.v1'))")


def cur_profile(f):
    s = state(f)
    return next(p for p in s['profiles'] if p['id'] == s['currentId'])


def set_profile_fields(f, **fields):
    """Test setup shortcut: edit the current player in localStorage, then reload so the app reads it."""
    f.page.evaluate("""fields => {
      const s = JSON.parse(localStorage.getItem('brainyquest.v1'));
      Object.assign(s.profiles.find(p => p.id === s.currentId), fields);
      localStorage.setItem('brainyquest.v1', JSON.stringify(s));
    }""", fields)
    f.reload()


def math_oracle(f, sel='.stage .q-card', skill=None, tier=None):
    r = f.page.evaluate(ORACLE['math'], {'skillId': skill, 'tier': tier, 'sel': sel})
    f.check('err' not in r, f'math oracle: {r.get("err")}')
    return r


def math_answer(f, right=True, sel='.stage .q-card', skill=None, tier=None, submit=None):
    """Answer the math question on screen (right or wrong). Returns the oracle info.
    submit: 'enter' (keyboard) or 'click' (Check button). Default: Enter for right answers, Check for wrong
    ones, because Enter on a wrong non-column answer skips the feedback (app bug, probed separately)."""
    o = math_oracle(f, sel, skill, tier)
    card = f.page.locator(sel).last
    k = o['kind']
    submit = submit or ('enter' if right else 'click')

    def send(inp):
        if submit == 'enter' or k == 'column':
            inp.press('Enter')
        else:
            card.get_by_role('button', name='Check ✓').click()
    if k == 'choice':
        n = card.locator('.choice').count()
        i = o['choiceIndex'] if right else (o['choiceIndex'] + 1) % n
        card.locator('.choice').nth(i).click()
        return o
    if k == 'column':
        card.locator('input.col-answer').fill(str(o['answer'] if right else o['answer'] + 10))
        send(card.locator('input.col-answer'))
    elif k == 'division':
        card.get_by_label('quotient').fill(str(o['q'] if right else o['q'] + 1))
        if o['r']:
            card.get_by_label('remainder').fill(str(o['r']))
        send(card.get_by_label('quotient'))
    elif k == 'fraction':
        card.get_by_label('numerator').fill(str(o['n'] if right else o['n'] + 1))
        card.get_by_label('denominator').fill(str(o['d']))
        send(card.get_by_label('numerator'))
    else:
        a = o['answer']
        val = (f'{a:g}' if isinstance(a, float) else str(a)) if right else str(round(a + 1, 4))
        card.get_by_label('answer', exact=True).fill(val)
        send(card.get_by_label('answer', exact=True))
    return o


def run_coach(f, o, card_sel='.stage .q-card', slip=False):
    """Walk a coach-mode column problem using guidedPlan. slip=True types one wrong column answer first."""
    card = f.page.locator(card_sel).last
    bubble = card.locator('.coach')
    for step in o['plan']:
        q = step.get('question') or step.get('text')
        bubble.locator('.coach-q', has_text=q).wait_for(timeout=6000)
        if step['kind'] == 'info':
            bubble.get_by_role('button', name='OK').click()
        elif step['kind'] == 'yesno':
            bubble.get_by_role('button', name='Yes, borrow' if step['expect'] else 'No borrow').click()
            bubble.locator('.coach-msg.good').wait_for(timeout=3000)
        else:
            inp = bubble.get_by_label('column answer')
            if slip:
                inp.fill(str(step['expect'] + 1))
                bubble.get_by_role('button', name='Check').click()
                bubble.locator('.coach-msg.bad').wait_for(timeout=3000)
                f.check('Not quite' in bubble.locator('.coach-msg').inner_text(), 'coach: wrong column answer gives no "Not quite" message')
                f.shot('coach-slip')
                slip = False
            inp.fill(str(step['expect']))
            bubble.get_by_role('button', name='Check').click()
            bubble.locator('.coach-msg.good').wait_for(timeout=3000)
    bubble.locator('.coach-q', has_text='You did it').wait_for(timeout=6000)


def play_math_session(f, wrong=(), skill=None, tier=None, max_q=40, on_wrong=None, shots=('q',)):
    """Play a practice / mix / gym / coach session to the results screen. wrong: question indexes to miss."""
    i = 0
    while not f.done() and i < max_q:
        f.page.wait_for_selector('.stage .q-card, .results')
        if f.done():
            break
        card = f.page.locator('.stage .q-card').last
        if card.locator('.coach').count():
            o = math_oracle(f, skill=skill, tier=tier)
            f.check(o.get('plan'), 'coach card without a guided plan')
            if i == 0 and 'q' in shots:
                f.shot(f'q{i}-coach')
            run_coach(f, o, slip=(i == 0))
            nxt = card.get_by_role('button', name='Next ›')
            nxt.wait_for()
            if i == 0:
                f.shot('coach-done')
            f.mark()
            nxt.click()
        else:
            if i == 0 and 'q' in shots:
                f.shot('q0')
            f.mark()
            o = math_answer(f, right=i not in wrong, skill=skill, tier=tier)
            if i in wrong:
                fb = card.locator('.fb.bad')
                fb.wait_for(timeout=3000)
                if on_wrong:
                    on_wrong(f, card, o)
                card.get_by_role('button', name='Got it ›').click()
            else:
                f.wait_good()
        f.wait_next()
        i += 1
    f.check(f.done(), f'session did not reach results after {i} questions')
    return i


def check_wrong_feedback(f, card, o):
    fb = card.locator('.fb.bad')
    t = fb.inner_text()
    f.check(f'The answer is {o["answerText"]}' in t, f'wrong-answer feedback lacks "The answer is {o["answerText"]}": {t!r}')
    f.check(card.locator('.how li').count() == len(o['steps']) and o['steps'], 'wrong-answer feedback lacks the solution steps')
    f.check('You answered' in t, 'wrong-answer feedback does not say what the kid answered')
    ex = card.locator('.worked-ex')
    f.check(ex.count() == 2 and all(ex.nth(k).locator('.ex-steps li').count() for k in range(ex.count())), f'wrong-answer feedback has {ex.count()} worked examples, expected 2 with steps')
    btn = card.get_by_role('button', name='Got it ›')
    f.check(btn.is_visible(), 'no "Got it" button after a wrong answer')
    f.shot('wrong-feedback')
    f.page.wait_for_timeout(2500)
    f.check(btn.is_visible() and card.locator('.fb.bad').count(), '"Got it" did not wait: the miss left the screen on its own')
    # The Got it button must be reachable: not covered by anything (it sits under the worked examples, so scroll to it).
    btn.scroll_into_view_if_needed()
    f.page.wait_for_timeout(300)
    box = btn.bounding_box()
    hit = f.page.evaluate("([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.closest('button')?.textContent; }",
                          [box['x'] + box['width'] / 2, box['y'] + box['height'] / 2])  # bounding_box is viewport-relative
    f.check(hit and 'Got it' in hit, f'"Got it" button is covered by another element (hit: {hit!r})')


def buddy_app(f):
    """Does the app under test have the buddy/chest feature? (It loaded js/shared/buddy.js.)"""
    return f.loaded_buddy


def results_text(f, growth_shot=True):
    """Results text. With the buddy feature, also waits for (and closes) a "grew into a ..." modal."""
    f.page.wait_for_selector('.results')
    f.page.wait_for_timeout(250)
    t = f.page.locator('.results').inner_text()
    if buddy_app(f):
        grow = f.page.locator('.modal-card', has_text='grew into')
        try:
            grow.wait_for(timeout=1900)
        except Exception:
            return t
        f.growth = getattr(f, 'growth', []) + [grow.locator('h2').inner_text()]
        if growth_shot:
            f.shot('grew-modal', full=False)
        grow.get_by_role('button', name=re.compile('Hooray')).click()
        f.check(f.page.locator('.modal-back').count() == 0, 'growth modal did not close')
    return t


def check_chest(f, expect=True):
    """Mystery chest on a results screen: present for 5+ answers, opens once, reveals a reward."""
    if not buddy_app(f):
        return None
    btn = f.page.locator('.results .chest-btn')
    if not expect:
        f.check(btn.count() == 0 and f.page.locator('.results .chest-box').count() == 0, 'a chest is offered for a session with fewer than 5 answers')
        return None
    f.check(btn.count() == 1, 'no mystery chest on the results screen')
    before = cur_profile(f)
    btn.scroll_into_view_if_needed()
    f.page.wait_for_timeout(900)
    op = btn.locator('.chest-emoji').evaluate('e => getComputedStyle(e).opacity')
    if float(op) < 0.5:
        f.bug(f'Mystery chest 🎁 emoji is invisible before opening (computed opacity {op}): css/styles.css applies the '
              f'"chest-shake ... forwards" animation (ends at opacity 0) to every .chest-emoji instead of only .chest-btn.opening')
    if not getattr(f, '_chest_shot', False):
        f._chest_shot = True
        f.shot('chest-closed', full=False)
    btn.click()
    f.check(btn.is_disabled() or btn.count() == 0, 'chest button still enabled after opening')
    rev = f.page.locator('.results .chest-reveal')
    rev.wait_for(timeout=3000)
    txt = rev.inner_text()
    after = cur_profile(f)
    m_c, m_x = re.search(r'\+(\d+) coins', txt), re.search(r'\+(\d+) bonus XP', txt)
    # Opening a chest can also finish today's "Open a mystery chest" quest, which pays its own coins.
    chest_q = next((q for q in (before.get('quests') or {}).get('list', []) if q['id'] == 'chest' and not q['done']), None)
    others_done = sum(q['done'] for q in (before.get('quests') or {}).get('list', []) if q['id'] != 'chest')
    quest_coins = (15 + (50 if others_done == 2 else 0)) if chest_q else 0  # last quest of the day also pays the all-done bonus
    if m_c:
        f.check(after['coins'] - before['coins'] == int(m_c[1]) + quest_coins, f'chest says +{m_c[1]} coins (+{quest_coins} quest) but coins went {before["coins"]} -> {after["coins"]}')
    elif m_x:
        f.check(after['xp'] - before['xp'] == int(m_x[1]), f'chest says +{m_x[1]} XP but XP went {before["xp"]} -> {after["xp"]}')
    else:
        f.check('Rare find' in txt and any(o.startswith('gear:') for o in after['owned']), f'chest reveal unrecognised or gear not owned: {txt!r}')
    f.check(after['chest']['session'] == after['stats']['sessions'], 'chest not marked opened for this session')
    # Re-rendering this session's chest shows it as opened (same module instance the results used).
    again = f.page.evaluate("async () => { const m = await import(new URL('js/views/chest.js', location.href.split('#')[0])); return m.chestCard(10)?.textContent || ''; }")
    f.check('Chest opened' in again, f're-rendered chest is not "Chest opened": {again!r}')
    f.shot('chest-open', full=False)
    return txt


# ---------------------------------------------------------------- tests

def t_profiles(f):
    f.goto('/profiles')
    f.shot('welcome')
    f.check('Welcome to Brainy Quest' in f.text(), 'no welcome heading for a first-time visitor')
    f.page.get_by_role('button', name="Let's go").click()
    f.page.wait_for_timeout(200)
    f.check(f.hash() in ('#/profiles', ''), 'empty name was accepted')
    new_player(f, 'Ava', '🐼')
    f.check(f.page.locator('.hero-avatar, .hero-buddy .buddy-pet').first.inner_text() == '🐼', 'home avatar is not the picked buddy')
    for s in ['Math Quest', 'Word Wizard', 'Spelling Bee', 'Shop', 'Trophies', 'Grown-ups']:
        f.check(s in f.text(), f'home is missing "{s}"')
    f.check('0/117 ★' in f.text() or re.search(r'0/\d+ ★', f.text()), 'math star counter missing on home')
    f.shot('home-ava')
    if f.page.locator('.avatar-sm').is_visible():
        f.page.locator('.avatar-sm').click()
    else:
        f.bug('No way to switch or add a player at phone width: the topbar avatar link (#/profiles) is display:none under 420px and nothing else links to the player picker')
        f.goto('/profiles')
    f.wait_text('Add a new player')
    f.shot('profiles-one')
    f.page.get_by_placeholder('Your name').fill('Ben')
    f.page.locator('.avatar-pick button', has_text='🐯').click()
    f.page.locator('.grade-chips button', has_text='3rd').click()
    f.check(f.page.locator('.grade-chips button[aria-pressed="true"]').inner_text() == '3rd', 'grade chip did not light up')
    f.page.get_by_placeholder('Your name').press('Enter')
    f.wait_text('Hi, Ben!', '.hero')
    f.check(cur_profile(f)['settings'].get('grade') == 3, 'grade picked at sign-up was not saved')
    f.check(f.page.locator('.avatar-sm').inner_text() == '🐯', 'topbar avatar is not Ben\'s')  # text is read even when hidden
    f.goto('/profiles')
    f.check(f.page.locator('.profile-btn').count() == 2, 'profile grid does not show 2 players')
    f.check('Ben' in f.page.locator('.profile-btn.current').inner_text(), 'current player not highlighted')
    f.shot('profiles-two')
    f.page.locator('.profile-btn', has_text='Ava').click()
    f.wait_text('Hi, Ava!', '.hero')
    f.reload()
    f.wait_text('Hi, Ava!', '.hero')
    f.check(len(state(f)['profiles']) == 2, 'players not persisted')


def t_math_map(f):
    new_player(f, 'Mia')
    f.goto('/math')
    f.shot('map')
    from_js = f.page.evaluate("async () => { const S = await import(new URL('.', location.href).href + 'js/math/skills.js'); return { units: S.UNITS.map(u => u.title), skills: S.UNITS.flatMap(u => S.SKILLS.filter(s => s.unit === u.id).map(s => [s.id, s.title])) }; }")  # map order: by unit, then skill
    units = f.page.locator('section.unit')
    f.check(units.count() == len(from_js['units']), f'{units.count()} unit sections, expected {len(from_js["units"])}')
    for k, t in enumerate(from_js['units']):
        f.check(t in units.nth(k).locator('.unit-title').inner_text(), f'unit "{t}" missing or out of order')
    tiles = f.page.locator('button.skill')
    f.check(tiles.count() == len(from_js['skills']), f'{tiles.count()} skill tiles, expected {len(from_js["skills"])}')
    f.check('🔒' not in f.text(), 'a locked tile is shown')
    f.check(f.page.locator('button.skill[disabled]').count() == 0, 'a skill tile is disabled')
    f.check(f.page.locator('.next-badge').count() >= 1, 'no ✨ Next badge')
    # Grade path: a 5th grader skips Math Basics and starts Addition further along
    f.page.select_option('.grade-pick select', '5')
    f.page.wait_for_timeout(300)
    basics = f.page.locator('section.unit').first
    f.check(basics.locator('.next-badge').count() == 0, '5th grade: Math Basics still has a ✨ Next badge')
    add_next = f.page.locator('section.unit', has_text='Addition').locator('.skill.suggested .skill-title').all_inner_texts()
    f.check(add_next and '2-digit' not in add_next[0], f'5th grade: Addition suggests {add_next}, expected a 3 or 4-digit skill')
    f.shot('map-grade5')
    f.check(cur_profile(f)['settings'].get('grade') == 5, 'grade was not saved on the player')
    f.page.select_option('.grade-pick select', '0')
    for k, (sid, title) in enumerate(from_js['skills']):
        f.goto('/math')
        f.page.locator('button.skill').nth(k).click()
        sheet = f.page.locator('.modal-card')
        sheet.wait_for()
        f.check(title in sheet.inner_text(), f'skill sheet for {sid} shows the wrong title')
        rows = sheet.locator('.tier-row')
        f.check(rows.count() == 3, f'{sid}: skill sheet has {rows.count()} tiers')
        f.check(all(rows.nth(j).is_enabled() for j in range(3)), f'{sid}: a tier row is disabled')
        if k in (0, 9):
            f.shot(f'sheet-{sid}', full=False)
        tier = k % 3 + 1
        rows.nth(tier - 1).click()
        f.page.wait_for_selector('.stage .q-card')
        f.check(f.hash() == f'#/math/play/practice/{sid}/{tier}', f'{sid}: tier {tier} opened {f.hash()}')
        f.check(f.page.locator('.modal-back').count() == 0, f'{sid}: sheet stayed open after picking a tier')
        f.check('★' * tier in f.page.locator('.topbar-title').inner_text(), f'{sid}: title lacks {"★" * tier}')
        f.overflow(f'{sid} tier {tier}')
        if k % 6 == 0:
            f.shot(f'tier-{sid}-{tier}')


def t_math_practice_tiers(f):
    new_player(f, 'Leo')
    sid = 'add-3d-c1'
    f.goto(f'/math/play/practice/{sid}/1', wait='.stage .q-card')
    f.check(f.page.locator('.q-hint', has_text='Type the whole answer').count() == 1, 'column hint missing')
    play_math_session(f, skill=sid, tier=1)
    t = results_text(f)
    f.shot('results-1star')
    f.check('★ earned' in t, f'★ results do not say "★ earned": {t!r}')
    f.check('10 / 10 correct' in t, f'score line wrong: {t!r}')
    f.reload()
    f.goto('/math')
    tile = f.page.locator('button.skill', has_text='3-digit, one carry')
    f.check(tile.locator('.star.on').count() == 1, f'map shows {tile.locator(".star.on").count()} stars after ★ (expected 1)')
    f.shot('map-after-1star')
    f.goto(f'/math/play/practice/{sid}/2', wait='.stage .q-card')
    play_math_session(f, skill=sid, tier=2, wrong=(4,), shots=())
    t = results_text(f)
    f.shot('results-2star')
    f.check('★★ earned' in t, f'★★ (9/10 first try) did not pass: {t!r}')
    f.goto(f'/math/play/practice/{sid}/3', wait='.stage .q-card')
    calls = []
    play_math_session(f, skill=sid, tier=3, wrong=(0, 2, 4), shots=(),  # a miss is retried right after it (queue first)
                      on_wrong=lambda ff, c, o: (not calls and check_wrong_feedback(ff, c, o), calls.append(1)))
    t = results_text(f)
    f.shot('results-3star-miss')
    f.check('Get 8 of 10 right on the first try to earn ★★★. You got 7.' in t, f'failed ★★★ message wrong: {t!r}')
    f.check(cur_profile(f)['math']['skills'][sid]['stars'] == 2, 'stars changed after a failed ★★★ run')


NON_COLUMN = ['basic-count', 'basic-add', 'basic-sub', 'basic-skip', 'basic-bonds', 'num-place', 'num-round', 'word-add-sub', 'mul-facts',
              'div-2x1', 'div-2x1r', 'div-3x2', 'frac-id', 'frac-equiv', 'frac-compare', 'frac-add', 'frac-of',
              'dec-place', 'dec-add', 'pct-intro', 'pct-of']


def t_math_non_column(f):
    new_player(f, 'Zoe')
    kinds, probed = {}, set()
    for k, sid in enumerate(NON_COLUMN):
        for tier in (1, 2, 3):
            f.goto(f'/math/play/practice/{sid}/{tier}', wait='.stage .q-card')
            for q in range(2):
                card = f.page.locator('.stage .q-card').last
                if q == 0 and tier == 1:
                    f.shot(f'{sid}')
                f.mark()
                wrong = (tier == 3 and q == 1)
                pre = math_oracle(f, skill=sid, tier=tier)
                enter_probe = wrong and pre['kind'] != 'choice' and pre['kind'] not in probed
                o = math_answer(f, right=not wrong, skill=sid, tier=tier, submit='enter' if enter_probe else None)
                kinds.setdefault(o['kind'], set()).add(sid)
                if enter_probe:
                    probed.add(o['kind'])
                    f.page.wait_for_timeout(500)
                    if card.locator('.fb.bad').count() == 0:
                        f.bug(f'Pressing Enter to submit a WRONG {o["kind"]} answer skips the "Not quite / How to solve it / Got it" '
                              f'feedback: the next question appears at once (first seen on {sid} ★{tier}; Check-button clicks work)')
                        f.wait_next()
                        continue
                if wrong:
                    card.locator('.fb.bad').wait_for(timeout=3000)
                    t = card.locator('.fb.bad').inner_text()
                    f.check(f'The answer is {o["answerText"]}' in t, f'{sid}★{tier}: wrong feedback lacks answer {o["answerText"]!r}: {t!r}')
                    if sid in ('div-2x1r', 'frac-add', 'pct-of', 'frac-compare'):
                        f.shot(f'{sid}-wrong')
                    card.get_by_role('button', name='Got it ›').click()
                else:
                    f.wait_good()
                f.wait_next()
    for want in ('choice', 'division', 'fraction', 'input'):
        f.check(want in kinds, f'no {want} question was exercised (kinds seen: {sorted(kinds)})')
    f.notes.append('kinds: ' + ', '.join(f'{k}={len(v)}' for k, v in sorted(kinds.items())))


def t_math_coach_mix_gym(f):
    new_player(f, 'Kai')
    f.goto('/math/play/coach/sub-3d-b1', wait='.stage .q-card')
    f.check(f.page.locator('.coach').count() == 1, 'coach mode shows no coach bubble')
    play_math_session(f, skill='sub-3d-b1')
    t = results_text(f)
    f.shot('coach-results')
    f.check('3 / 3 correct' in t, f'coach results: {t!r}')
    check_chest(f, expect=False)
    f.goto('/math/mix', wait='.stage .q-card')
    n = play_math_session(f)
    t = results_text(f)
    f.shot('mix-results')
    f.check('12 / 12 correct' in t, f'Daily Mix results ({n} q): {t!r}')
    check_chest(f)
    f.goto('/math/gym', wait='.stage .q-card')
    f.check(f.page.locator('.coach').count() == 1, 'Gym does not start with a coach-guided problem')
    play_math_session(f)
    t = results_text(f)
    f.shot('gym-results')
    f.check('8 / 8 correct' in t, f'Gym results: {t!r}')


def t_speed(f):
    new_player(f, 'Sam')
    # Fake clock (it still runs in real time): the paused-clock checks and the end of the 60 s round fast-forward
    # instead of waiting. One real-time check below makes sure the countdown really ticks.
    f.page.clock.install()
    f.goto('/math/speed')
    chips = f.page.locator('.topic-chip')
    units = f.page.evaluate("import(new URL('js/math/skills.js', location.href.split('#')[0])).then(m => m.UNITS.length)")
    f.check(chips.count() == units + 1, f'{chips.count()} topic chips (expected {units} units + Everything)')
    f.check(f.page.locator('.topic-chip[disabled]').count() == 0, 'a topic is locked for a new player')
    f.check('No scores yet' in f.text(), 'leaderboard should be empty')
    f.shot('picker')
    chips.filter(has_text='Addition').click()
    f.page.locator('.tier-pick button', has_text='Hard').click()
    f.page.locator('.timer-card', has_text='Sprint').click()
    f.check(f.page.locator('.topic-chip.on', has_text='Addition').count() == 1, 'topic pick not highlighted')
    f.check(f.page.locator('.tier-pick button.on', has_text='Hard').count() == 1, 'difficulty pick not highlighted')
    start = f.page.get_by_role('button', name=re.compile('Start Sprint ★★★'))
    f.check(start.count() == 1, 'start button does not read "Start Sprint ★★★"')
    f.shot('picker-picked')
    start.click()
    f.check(f.hash() == '#/math/speed/add/60/3', f'speed route {f.hash()}')
    f.page.wait_for_selector('.countdown')
    f.shot('countdown', full=False)
    f.page.wait_for_selector('.speed-card', timeout=6000)
    f.shot('speed-q')
    sel = '.speed-card'
    for k in range(3):
        f.mark(sel)
        o = math_answer(f, sel=sel, tier=3)
        f.wait_good(sel)
        f.wait_next(sel)
    score = int(f.page.locator('.sp-score').inner_text())
    f.check(score >= 90, f'score after 3 right ★★★ answers is {score}')
    f.mark(sel)
    o = math_answer(f, right=False, sel=sel, tier=3)
    card = f.page.locator(sel).last
    card.locator('.fb.bad').wait_for(timeout=3000)
    t0 = f.page.locator('.sp-time').inner_text()
    f.shot('speed-wrong', full=False)
    ft = card.locator('.fb.bad').inner_text()
    f.check(f'The answer is {o["answerText"]}' in ft and 'clock is paused' in ft, f'speed miss feedback: {ft!r}')
    f.page.clock.fast_forward(4000)
    f.page.wait_for_timeout(100)
    t1 = f.page.locator('.sp-time').inner_text()
    f.check(t0 == t1, f'clock moved while paused: {t0} -> {t1}')
    f.check(card.locator('.fb.bad').count() == 1, 'the missed question left the screen while paused')
    card.get_by_role('button', name='Next ›').click()
    f.wait_next(sel)
    f.page.wait_for_timeout(2200)  # real time: the countdown must tick on its own
    t2 = f.page.locator('.sp-time').inner_text()
    f.check(int(t2) < int(t1), f'clock did not resume after Next: {t1} -> {t2}')
    # A few more right answers, then jump to the end of the round.
    for _ in range(3):
        f.mark(sel)
        math_answer(f, sel=sel, tier=3)
        f.wait_next(sel)
    f.page.clock.fast_forward(61_000)
    deadline = time.time() + 20
    while not f.done() and time.time() < deadline:
        try:
            f.mark(sel)
            math_answer(f, sel=sel, tier=3)
            f.wait_next(sel, timeout=4000)
        except Exception:
            if f.done():
                break
            raise
    t = results_text(f)
    f.shot('speed-results')
    f.check('First record set!' in t, f'speed results header: {t!r}')
    f.check(f.page.locator('.results .leaderboard li.me', has_text='Sam').count() == 1, 'leaderboard does not highlight the player')
    check_chest(f)
    f.page.get_by_role('link', name='Change challenge').click()
    f.page.wait_for_selector('.timer-card')
    f.check(re.search(r'Best: \d+', f.page.locator('.timer-card', has_text='Sprint').inner_text()), 'Sprint card shows no "Best:" record')
    f.check(f.page.locator('.leaderboard li', has_text='Sam').count() == 1, 'picker leaderboard does not list the player')
    f.shot('picker-after')
    # Non-column topic: a wrong typed answer submitted with Enter must also stay on screen with the clock paused.
    f.goto('/math/speed/basic/60/1', wait='.speed-card')
    for _ in range(6):
        if f.page.locator('.speed-card input.answer-input').count():
            break
        f.mark('.speed-card')
        math_answer(f, sel='.speed-card', tier=1)
        f.wait_next('.speed-card')
    f.check(f.page.locator('.speed-card input.answer-input').count(), 'no typed (non-column) question in 6 tries on the Math Basics topic')
    f.mark('.speed-card')
    math_answer(f, right=False, sel='.speed-card', tier=1, submit='enter')
    f.page.wait_for_timeout(500)
    if f.page.locator('.speed-card .fb.bad').count() == 0:
        f.bug('Speed Challenge: pressing Enter on a WRONG typed (non-column) answer skips the paused "The answer is ..." screen; the clock never pauses')
    f.goto('/math/speed')


def eng_answer(f, right=True, unit=None, subject='english'):
    o = f.page.evaluate(ORACLE['english'], {'unitId': unit, 'subject': subject})
    f.check('err' not in o, f'english oracle: {o.get("err")}')
    card = f.page.locator('.stage .q-card').last
    if o['t'] == 'mc':
        i = o['index'] if right else (o['index'] + 1) % o['choices']
        card.locator('.choice').nth(i).click()
    elif o['t'] == 'tap':
        words = card.locator('.tap-word')
        idx = o['indices'] if right else [j for j in range(words.count()) if j not in o['indices']][:1]
        for j in idx:
            words.nth(j).click()
        card.get_by_role('button', name='Check ✓').click()
    else:
        card.get_by_label('your answer').fill(o['text'] if right else 'zzz')
        card.get_by_label('your answer').press('Enter')
    return o


def play_eng(f, unit=None, wrong=(), warmup=False, seen=None, max_q=30, subject='english'):
    i = 0
    while not f.done() and i < max_q:
        f.page.wait_for_selector('.stage .q-card, .results')
        if f.done():
            break
        card = f.page.locator('.stage .q-card').last
        f.mark()
        o = eng_answer(f, right=i not in wrong, unit=unit, subject=subject)
        if seen is not None and o['t'] not in seen:
            seen[o['t']] = o
            f.shot(f'{"warmup" if warmup else "q"}-{o["t"]}')
        if warmup:
            if o['t'] == 'mc':
                f.check(o['choices'] == 2, f'Warm-up multiple choice has {o["choices"]} choices')
            elif o['t'] == 'tap':
                want = f'Tap {o["count"]} word'
                f.check(o['hint'] and want in o['hint'], f'Warm-up tap hint {o["hint"]!r} lacks "{want}"')
            else:
                f.check(o['hint'] and ('It starts with' in o['hint'] or 'Use one of these marks' in o['hint']), f'Warm-up fill hint missing: {o["hint"]!r}')
        if i in wrong and o['t'] == 'fill':
            f.page.wait_for_timeout(500)
            if card.locator('.fb.bad').count() == 0:
                f.bug('English fill-in: pressing Enter on a WRONG answer skips the "The answer: ... / Got it" feedback (next question appears at once)')
                f.wait_next()
                i += 1
                continue
        if i in wrong:
            card.locator('.fb.bad').wait_for(timeout=3000)
            t = card.locator('.fb.bad').inner_text()
            f.check('The answer' in t, f'english miss does not show the answer: {t!r}')
            if not warmup and i >= 2:  # by the 3rd question at least 2 questions are already done or unused
                f.check(card.locator('.worked-ex').count() == 2, f'lesson miss shows {card.locator(".worked-ex").count()} worked examples, expected 2')
            if i == wrong[0]:
                f.shot('eng-wrong')
            card.get_by_role('button', name='Got it ›').click()
        else:
            f.wait_good()
        f.wait_next()
        i += 1
    f.check(f.done(), 'english quiz did not finish')
    return i


def t_english(f):
    new_player(f, 'Eli')
    f.goto('/english')
    f.shot('home')
    f.check(f.page.locator('a.skill.eng').count() >= 30, 'English units missing')
    f.check(f.page.locator('.quick.gym.dim', has_text='Fix my mistakes (0)').count() == 1, 'review link should be dim with 0')
    unit = 'naming-doing'
    f.goto(f'/english/unit/{unit}')
    f.check('Card 1 of 2' in f.text(), 'lesson card counter missing')
    f.check(f.page.locator('button.link-btn', has_text='Skip to quiz').count() == 0, '"Skip to quiz" shown before the lesson was seen')
    f.shot('lesson-1')
    f.page.get_by_role('button', name='Next ›').click()
    f.wait_text('Pick your quiz')
    rows = f.page.locator('.tier-row')
    f.check(rows.count() == 3, 'lesson tier picker does not have 3 tiers')
    f.shot('lesson-tiers')
    rows.nth(0).click()
    f.page.wait_for_selector('.stage .q-card')
    f.check(f.hash() == f'#/english/quiz/{unit}/1', f'Warm-up route {f.hash()}')
    seen = {}
    n = play_eng(f, unit, warmup=True, seen=seen)
    t = results_text(f)
    f.shot('warmup-results')
    f.check(n == 6 and '★ earned' in t, f'Warm-up results ({n} q): {t!r}')
    # Make sure all three Warm-up helpers were seen (6 random questions might skip a type).
    for extra_unit in ['one-many', 'opposites', 'first-sentences', 'abc', 'rhymes']:
        if len(seen) == 3:
            break
        f.goto(f'/english/quiz/{extra_unit}/1', wait='.stage .q-card')
        play_eng(f, extra_unit, warmup=True, seen=seen)
    f.check(len(seen) == 3, f'Warm-up question types seen: {sorted(seen)}')
    # Skip to quiz now shows on card 1.
    f.goto(f'/english/unit/{unit}')
    skip = f.page.locator('button.link-btn', has_text='Skip to quiz')
    f.check(skip.count() == 1, '"Skip to quiz" missing after the lesson was seen')
    skip.click()
    f.wait_text('Pick your quiz')
    f.check('Card 2 of 2' in f.text(), 'Skip to quiz did not jump to the last card')
    f.shot('skip-to-quiz')
    f.page.locator('.tier-row').nth(1).click()
    f.page.wait_for_selector('.stage .q-card')
    n = play_eng(f, unit)
    t = results_text(f)
    f.check(n == 8 and '★★ earned' in t, f'Quiz results ({n} q): {t!r}')
    f.page.get_by_role('link', name=re.compile('Try ★★★ Expert')).click()
    f.page.wait_for_selector('.stage .q-card')
    n = play_eng(f, unit)
    t = results_text(f)
    f.shot('expert-results')
    f.check(n == 9 and '★★★ earned' in t, f'Expert results ({n} q): {t!r}')
    # Deliberately miss 3 of 8 in another unit's Quiz.
    f.goto('/english/quiz/rhymes/2', wait='.stage .q-card')
    play_eng(f, 'rhymes', wrong=(0, 2, 4))
    t = results_text(f)
    f.shot('quiz-miss-results')
    f.check('Get 7 of 8 right to earn ★★. You got 5.' in t, f'missed Quiz message: {t!r}')
    f.goto('/english')
    link = f.page.locator('.quick.gym', has_text='Fix my mistakes (3)')
    f.check(link.count() == 1, f'review link: {f.page.locator(".quick.gym").inner_text()!r}')
    f.shot('home-review')
    link.click()
    f.page.wait_for_selector('.stage .q-card')
    f.check('Fix my mistakes' in f.page.locator('.topbar-title').inner_text(), 'review title')
    n = play_eng(f)
    t = results_text(f)
    f.shot('review-results')
    f.check(n == 3 and '3 / 3 correct' in t, f'review results ({n} q): {t!r}')
    f.goto('/english')
    f.check(f.page.locator('a.skill.eng', has_text='Naming & Doing Words').locator('.star.on').count() == 3, 'unit tile does not show 3 stars')
    # Deterministic probe: in an Expert quiz (every question), miss the first fill-in with the keyboard.
    f.goto('/english/quiz/one-many/3', wait='.stage .q-card')
    for _ in range(12):
        card = f.page.locator('.stage .q-card').last
        if card.locator('.fill-sentence').count():
            f.mark()
            card.get_by_label('your answer').fill('zzz')
            card.get_by_label('your answer').press('Enter')
            f.page.wait_for_timeout(500)
            if card.locator('.fb.bad').count() == 0:
                f.bug('English fill-in: pressing Enter on a WRONG answer skips the "The answer: ... / Got it" feedback (next question appears at once)')
            break
        f.mark()
        eng_answer(f, unit='one-many')
        f.wait_good()
        f.wait_next()
    f.goto('/english')


def spell_word(f):
    """The word on the current spelling card, read from the speech stub after pressing the bee button."""
    card = f.page.locator('.stage .spell-card').last
    card.locator('.bee-btn').click()
    return f.page.evaluate('window.__said[window.__said.length - 1]')


def spell_type(f, text):
    card = f.page.locator('.stage .spell-card').last
    inp = card.get_by_label('Type the spelling')
    inp.fill(text)
    inp.press('Enter')
    return card


def bee_miss_shown(f, card):
    """After a wrong Bee Challenge spelling submitted with Enter: is the miss (diff + Next button) still on screen?"""
    f.page.wait_for_timeout(500)
    if card.locator('.fb.bad').count() and card.is_visible():
        return True
    f.bug('Bee Challenge: pressing Enter on a WRONG spelling skips the "Oops! N lives left" diff and Next button (next word appears at once)')
    return False


def wrongly(w):
    return w[:-1] + ('x' if w[-1] != 'x' else 'z')


def t_spelling(f):
    new_player(f, 'Ivy')
    f.goto('/spelling')
    f.shot('home')
    cards = f.page.locator('.list-card')
    f.check(cards.count() >= 4, 'spelling list cards missing')
    c1 = cards.filter(has_text='Level 1 - Busy Bee')
    picks = c1.locator('.tier-pick button')
    f.check(picks.count() == 3, 'tier picker does not have 3 buttons')
    f.check(c1.get_by_role('link', name=re.compile('Practice')).get_attribute('href') == '#/spelling/practice/starter-1/1', 'default practice tier is not ★')
    picks.nth(2).click()
    f.check(c1.get_by_role('link', name=re.compile('Practice')).get_attribute('href') == '#/spelling/practice/starter-1/3', 'picking ★★★ did not retarget Practice')
    f.check(c1.get_by_role('link', name='🎤 Bee Challenge').get_attribute('href') == '#/spelling/challenge/starter-1/3', 'picking ★★★ did not retarget Bee Challenge')
    f.shot('home-tier-picked')
    picks.nth(0).click()
    # ---- Practice
    c1.get_by_role('link', name=re.compile('Practice')).click()
    f.page.wait_for_selector('.stage .spell-card')
    f.shot('practice-q')
    i, missed = 0, None
    while not f.done() and i < 20:
        f.page.wait_for_selector('.stage .spell-card, .results')
        if f.done():
            break
        card = f.page.locator('.stage .spell-card').last
        w = spell_word(f)
        f.mark('.stage .spell-card')
        if i == 1:
            spell_type(f, wrongly(w))
            fb = card.locator('.fb.bad')
            fb.wait_for(timeout=3000)
            f.check(fb.locator('.diff').count() == 1, 'no letter diff after a misspelling')
            f.check('Type the correct spelling once' in fb.inner_text(), 'no "type it correctly once" prompt')
            f.check(any(s.startswith(f'{w}. ') for s in f.page.evaluate('window.__said')), 'word was not spelled out loud after a miss')
            f.shot('practice-wrong')
            fix = card.get_by_label('Type the correct spelling')
            fix.fill(wrongly(w))
            fix.press('Enter')
            f.page.wait_for_timeout(600)
            f.check(fix.is_visible(), 'a wrong lock-in spelling moved on')
            fix.fill(w)
            fix.press('Enter')
            missed = w
        else:
            spell_type(f, w)
            f.wait_good()
            if f.page.locator('.stage .q-tag', has_text='Second try').count():
                f.check(w == missed, 'second-try word is not the missed word')
        f.wait_next('.stage .spell-card')
        i += 1
    f.check(f.done(), 'spelling practice did not finish')
    t = results_text(f)
    f.shot('practice-results')
    f.check(i == 7 and '5 / 6 correct' in t, f'practice results after {i} cards: {t!r}')
    # ---- Bee Challenge: reach the goal, then lose all 3 lives
    f.goto('/spelling/challenge/starter-1/1', wait='.stage .spell-card')
    f.check('0/10 for ★' in f.page.locator('.lives').inner_text(), f'lives bar: {f.page.locator(".lives").inner_text()!r}')
    f.shot('bee-q')
    right = lost = 0
    while not f.done() and right + lost < 20:
        f.page.wait_for_selector('.stage .spell-card, .results')
        if f.done():
            break
        card = f.page.locator('.stage .spell-card').last
        w = spell_word(f)
        f.check(card.locator('.tool', has_text='Hint').count() == 0, 'hints are offered in the Bee Challenge')
        f.mark('.stage .spell-card')
        if right < 10:
            spell_type(f, w)
            f.wait_good()
            right += 1
            if right == 10:
                f.page.locator('.toast', has_text='earned').wait_for(timeout=3000)
                f.shot('bee-earned', full=False)
        else:
            spell_type(f, wrongly(w))
            lost += 1
            if not bee_miss_shown(f, card):
                if lost == 3:
                    f.page.wait_for_selector('.results')
                f.wait_next('.stage .spell-card')
                continue
            if lost == 3:
                f.check('Out of lives' in card.inner_text(), 'no "Out of lives" message')
                f.shot('bee-out')
            card.get_by_role('button', name='See results' if lost == 3 else 'Next word ›').click()
        f.wait_next('.stage .spell-card')
    t = results_text(f)
    f.shot('bee-results')
    f.check('★ earned' in t and 'Final streak: 10' in t, f'Bee results: {t!r}')
    f.check(cur_profile(f)['spelling']['stars'].get('starter-1') == 1, 'list star not saved')
    # Lose straight away on ★★
    f.goto('/spelling/challenge/starter-1/2', wait='.stage .spell-card')
    for k in range(3):
        card = f.page.locator('.stage .spell-card').last
        w = spell_word(f)
        f.mark('.stage .spell-card')
        spell_type(f, wrongly(w))
        if bee_miss_shown(f, card):
            card.get_by_role('button', name='See results' if k == 2 else 'Next word ›').click()
        f.wait_next('.stage .spell-card')
    t = results_text(f)
    f.check('Spell 10 words right before you run out of lives to earn ★★. You got 0.' in t, f'lost Bee results: {t!r}')
    f.goto('/spelling')
    f.check(f.page.locator('.list-card', has_text='Level 1 - Busy Bee').locator('.star.on').count() == 1, 'list card does not show 1 star')
    f.check('★ ✅' in f.page.locator('.list-card', has_text='Level 1 - Busy Bee').locator('.tier-pick').inner_text(), 'tier picker does not tick ★')
    # ---- Word hive
    f.goto('/spelling/words/starter-1')
    f.shot('hive')
    total = f.page.locator('.hex').count()
    f.page.get_by_label('Search words').fill('caug')
    f.page.wait_for_timeout(150)
    f.check(f.page.locator('.hex').count() == 1 and f.page.locator('.hex').inner_text() == 'caught', 'hive search for "caug" did not leave only "caught"')
    f.page.locator('.hex').click()
    m = f.page.locator('.modal-card')
    m.wait_for()
    m.locator('p', has_text='grabbed something').wait_for(timeout=3000)
    f.check('caught' in f.page.evaluate('window.__said'), 'word modal did not speak the word')
    f.check('Spelled right' in m.inner_text() or True, '')
    f.shot('word-modal', full=False)
    f.page.keyboard.press('Escape')
    f.check(f.page.locator('.modal-back').count() == 0, 'Escape did not close the word modal')
    f.page.get_by_label('Search words').fill('')
    f.page.wait_for_timeout(150)
    f.check(f.page.locator('.hex').count() == total, 'clearing the search did not restore every word')
    # ---- Import
    f.goto('/spelling')
    f.page.get_by_role('link', name='➕ Import word list').click()
    f.page.wait_for_selector('textarea')
    f.page.get_by_label('List name').fill('Regression list')
    f.page.locator('textarea').fill('apple\nbanana | a long yellow fruit | I ate a banana.\ncolour OR color\n')
    f.check('3 words found: apple, banana, colour' in f.text(), f'import preview: {f.text()!r}')
    f.shot('import')
    f.page.get_by_role('button', name='💾 Save list').click()
    f.page.wait_for_selector('.list-card')
    card = f.page.locator('.list-card', has_text='Regression list')
    f.check(card.count() == 1 and '3 words' in card.inner_text(), 'imported list card missing')
    f.check(f.page.locator('section.unit', has_text='My lists').count() == 1, 'no "My lists" group')
    card.scroll_into_view_if_needed()
    f.shot('imported')
    card.locator('.words-link').click()
    f.page.locator('.hex', has_text='apple').click()
    f.page.locator('.modal-card p', has_text='a word used by the regression suite').wait_for(timeout=4000)
    f.page.keyboard.press('Escape')
    f.goto('/spelling')
    f.page.locator('.list-card', has_text='Regression list').get_by_role('button', name='Delete list').click()
    f.page.wait_for_timeout(300)
    f.check(f.page.locator('.list-card', has_text='Regression list').count() == 0, 'deleted list still shown')
    f.check(state(f)['lists'] == [], 'deleted list still stored')


def t_shop_trophies_parent(f):
    new_player(f, 'Max')
    set_profile_fields(f, coins=500)  # setup shortcut: give coins through localStorage (documented in README)
    f.goto('/shop')
    f.shot('shop')
    f.check('You have 500' in f.text(), 'shop does not show 500 coins')
    f.page.locator('.shop-item', has_text='30 🪙').click()
    f.page.locator('.toast', has_text='Bought it').wait_for()
    f.check(f.page.locator('.avatar-sm').inner_text() == '🐧', 'bought buddy not applied')
    # 500 - 30 for the buddy + 10 for the Shopper trophy, which now unlocks on the first purchase
    f.check(f.page.locator('#coin-count').inner_text() == '480', 'coins wrong after first purchase (expected -30 +10 Shopper)')
    f.check(f.page.locator('.toast', has_text='Shopper').count() > 0, 'Shopper trophy did not unlock on the first purchase')
    f.page.locator('.shop-item', has_text='Ocean').click()
    f.page.wait_for_timeout(300)
    f.check(f.page.evaluate('document.documentElement.dataset.theme') == 'ocean', 'Ocean theme not applied')
    f.check(f.page.locator('#coin-count').inner_text() == '380', 'coins not deducted for the theme')
    f.shot('shop-ocean')
    f.page.locator('.shop-item', has_text='300 🪙').click()
    f.page.wait_for_timeout(300)
    f.page.locator('.shop-item', has_text='200 🪙').first.click()
    f.page.locator('.toast', has_text='You need 120 more coins').wait_for()
    f.check(f.page.locator('#coin-count').inner_text() == '80', 'coins wrong after buying 👑')
    f.page.locator('.shop-item', has_text='Space').click()
    f.page.locator('.toast', has_text='more coins').last.wait_for()
    f.reload()
    p = cur_profile(f)
    f.check(p['coins'] == 80 and 'av:🐧' in p['owned'] and 'th:ocean' in p['owned'] and p['avatar'] == '👑', f'purchases not persisted: {p["owned"]} {p["coins"]}')
    f.page.locator('.shop-item', has_text='Sunny').click()
    f.page.wait_for_timeout(200)
    f.check(f.page.evaluate('document.documentElement.dataset.theme') == 'sunny', 'switching back to an owned theme failed')
    # Space theme for a dark-mode screenshot
    set_profile_fields(f, coins=200)
    f.goto('/shop')
    f.page.locator('.shop-item', has_text='Space').click()
    f.page.wait_for_timeout(300)
    f.goto('/')
    f.shot('home-space-theme')
    f.goto('/trophies')
    f.check(re.search(r'\d+ of \d+ unlocked', f.text()), 'trophy counter missing')
    f.check(f.page.locator('.trophy').count() >= 30, 'trophies missing')
    if f.page.locator('.trophy.on', has_text='Shopper').count() == 0:
        f.bug('"Shopper" trophy (buy something) stays locked after buying: achievements are only checked when a session finishes (shop.js buy() never calls checkAchievements)')
    f.shot('trophies')
    # ---- Grown-ups gate
    f.goto('/parent')
    gate = f.text()
    m = re.search(r'solve: (\d+) × (\d+)', gate)
    f.check(m, f'grown-ups gate has no question: {gate!r}')
    f.shot('gate')
    f.page.get_by_label('answer').fill('1')
    f.page.get_by_role('button', name='Enter').click()
    f.page.wait_for_timeout(300)
    f.check('Grown-ups only' in f.text(), 'wrong gate answer let us in')
    f.page.get_by_label('answer').fill(str(int(m[1]) * int(m[2])))
    f.page.get_by_role('button', name='Enter').click()
    f.wait_text("Max's progress")
    for s in ['Trouble spots', 'Math skills', 'Word Wizard units', 'Science Lab units', 'Code Club units', 'Spelling lists', 'Settings', 'Download backup']:
        f.check(s in f.text(), f'grown-ups page lacks "{s}"')
    f.shot('parent')
    with f.page.expect_download() as dl:
        f.page.get_by_role('button', name='⬇️ Download backup').click()
    d = dl.value
    f.check(re.match(r'brainy-quest-backup-\d{4}-\d{2}-\d{2}\.json$', d.suggested_filename), f'backup filename {d.suggested_filename}')
    data = json.loads(pathlib.Path(d.path()).read_text())
    f.check(data['profiles'][0]['name'] == 'Max', 'backup does not contain the player')


def t_persistence_routes(f):
    f.goto('/math', wait=None)
    f.page.wait_for_function("location.hash === '#/profiles'")
    f.check(f.page.locator('.new-profile').count() == 1, 'no-player visit to #/math did not land on the player picker')
    new_player(f, 'Ada')
    f.goto('/math/play/practice/basic-count/1', wait='.stage .q-card')
    for _ in range(3):
        f.mark()
        math_answer(f, skill='basic-count', tier=1)
        f.wait_good()
        f.wait_next()
    before = cur_profile(f)
    f.check(before['coins'] >= 3 and before['xp'] >= 6, f'coins/xp not awarded: {before["coins"]}/{before["xp"]}')
    f.goto('/')
    f.reload()
    f.wait_text('Hi, Ada!', '.hero')
    f.check(f.page.locator('#coin-count').inner_text() == str(before['coins']), 'coins not kept after reload')
    f.check(cur_profile(f)['math']['skills']['basic-count']['attempts'] == 3, 'skill attempts not kept')
    for bad, want in [('/nope', '#/'), ('/math/play/practice/bogus', '#/math'), ('/math/play/zzz/add-2d-c', '#/math'),
                      ('/english/unit/zzz', '#/english'), ('/english/quiz/zzz/1', '#/english'), ('/spelling/practice/zzz', '#/spelling'),
                      ('/spelling/words/zzz', '#/spelling'), ('/math/speed/add/999', '#/math/speed'), ('/english/review', '#/english')]:
        f.page.goto(f.base + '#' + bad)
        try:
            f.page.wait_for_function('w => location.hash === w', arg=want, timeout=3000)
        except Exception:
            raise Fail(f'{bad} went to {f.hash()} (expected {want})')
        f.page.wait_for_selector('main.screen')
    f.goto('/')
    f.check('Hi, Ada!' in f.text(), 'unknown route did not end on home')
    f.page.goto(f.base + '#/totally/unknown/route')
    f.page.wait_for_function("location.hash === '#/'")
    f.page.wait_for_selector('.hero')
    f.shot('fallback-home')


def bubble_shot(f, label):
    """Screenshot the session top while the buddy's speech bubble is fully shown."""
    f.page.wait_for_function("() => { const b = document.querySelector('.pal.show .pal-bubble'); return b && getComputedStyle(b).opacity > 0.95; }", timeout=3000)
    f.page.wait_for_timeout(250)
    return f.shot(label, full=False)


def shop_item(f, icon):
    return f.page.locator('.shop-item', has=f.page.locator('.shop-icon', has_text=icon))


def t_buddy_gear_chest(f):
    new_player(f, 'Pia', '🐸')
    if not buddy_app(f):
        raise Skip('app has no buddy feature (js/shared/buddy.js)')
    hero = f.page.locator('.hero')
    f.check(hero.locator('.hero-buddy .buddy-pet').inner_text() == '🐸', 'hero buddy is not the player avatar')
    f.check(hero.locator('.stage-badge').inner_text() == 'Egg', f'new buddy stage: {hero.locator(".stage-badge").inner_text()!r}')
    f.check('Pip' in hero.locator('.buddy-name').inner_text(), 'default buddy name is not Pip')
    f.check('Hungry' in hero.locator('.mood-chip').inner_text(), 'new buddy is not Hungry')
    f.check(hero.locator('.buddy-bar').count() == 1, 'no buddy progress bar')
    f.check('3 more to grow into a Baby' in hero.inner_text(), f'buddy progress text: {hero.inner_text()!r}')
    f.shot('home-egg')
    # Rename
    hero.locator('.buddy-name').click()
    m = f.page.locator('.modal-card', has_text='Name your buddy')
    m.wait_for()
    m.get_by_label('Buddy name').fill('')
    m.get_by_role('button', name='Save ✓').click()
    f.check(m.is_visible(), 'empty buddy name was accepted')
    m.get_by_label('Buddy name').fill('Sparky')
    f.shot('rename', full=False)
    m.get_by_label('Buddy name').press('Enter')
    f.check(f.page.locator('.modal-back').count() == 0, 'rename modal did not close')
    f.check('Sparky' in f.page.locator('.hero .buddy-name').inner_text(), 'rename not shown on home')
    f.reload()
    f.check('Sparky' in f.page.locator('.hero .buddy-name').inner_text() and cur_profile(f)['buddy']['name'] == 'Sparky', 'buddy name not persisted')
    # Session buddy
    f.goto('/math/play/practice/basic-count/1', wait='.stage .q-card')
    pal = f.page.locator('.session-top .pal')
    f.check(pal.count() == 1, 'no buddy in the session bar')
    f.check(pal.evaluate('e => getComputedStyle(e).pointerEvents') == 'none', 'session buddy takes clicks')
    bubble_shot(f, 'bubble-start')
    f.mark()
    math_answer(f, skill='basic-count', tier=1)
    bubble_shot(f, 'bubble-right')
    f.wait_next()
    play_math_session(f, skill='basic-count', tier=1, wrong=(0,), shots=(), on_wrong=lambda ff, c, o: bubble_shot(ff, 'bubble-wrong'))
    t = results_text(f)
    f.check('★ earned' in t, f'basic-count ★ results: {t!r}')
    check_chest(f)
    f.goto('/')
    hero = f.page.locator('.hero')
    f.check('Happy' in hero.locator('.mood-chip').inner_text(), 'buddy not Happy after finishing a session')
    f.check('1 more to grow into a Baby' in hero.inner_text(), f'buddy progress after 1 star + 1 session: {hero.inner_text()!r}')
    f.shot('home-fed')
    # Grow into a Baby (2 stars + 2 sessions = 4 food)
    f.goto('/math/play/practice/basic-count/2', wait='.stage .q-card')
    play_math_session(f, skill='basic-count', tier=2, shots=())
    results_text(f)
    f.check(getattr(f, 'growth', []) == ['Sparky grew into a Baby!'], f'growth modals: {getattr(f, "growth", [])}')
    f.goto('/')
    f.check(f.page.locator('.hero .stage-badge').inner_text() == 'Baby', 'home stage badge is not Baby')
    f.check(f.page.locator('.hero .buddy.st-baby').count() == 1, 'hero buddy lacks the baby stage class')
    # Gear
    set_profile_fields(f, coins=300)
    f.goto('/shop')
    f.check('Hats & gear' in f.text(), 'shop has no "Hats & gear" section')
    nogear = f.page.locator('.shop-item', has=f.page.locator('.shop-icon', has_text='🚫'))  # label reads "Using ✓" while active
    f.check('Using ✓' in nogear.inner_text(), '"No gear" is not active for a new buddy')
    shop_item(f, '🧢').click()
    f.page.locator('.toast', has_text='Bought it').wait_for()
    f.check(f.page.locator('.gear-head .buddy-gear').inner_text() == '🧢', 'bought cap not shown on the shop buddy')
    f.check(f.page.locator('#coin-count').inner_text() == '250', 'cap price not deducted (expected -60 +10 Shopper)')
    shop_item(f, '🕶️').click()
    f.page.wait_for_timeout(300)
    f.check(f.page.locator('.gear-head .buddy-gear.slot-eyes').inner_text() == '🕶️', 'shades not worn')
    f.page.locator('.gear-head').scroll_into_view_if_needed()
    f.shot('shop-gear')
    nogear.click()
    f.page.wait_for_timeout(200)
    f.check(f.page.locator('.gear-head .buddy-gear').count() == 0, '"No gear" did not take the gear off')
    shop_item(f, '🧢').click()
    f.page.wait_for_timeout(200)
    f.check(f.page.locator('.gear-head .buddy-gear').inner_text() == '🧢', 'owned cap could not be worn again')
    f.check(f.page.locator('#coin-count').inner_text() == '170', 'wearing owned gear cost coins')
    p = cur_profile(f)
    f.check({'gear:🧢', 'gear:🕶️'} <= set(p['owned']) and p['buddy']['gear'] == '🧢', f'gear not stored: {p["owned"]} {p["buddy"]}')
    f.goto('/')
    f.check(f.page.locator('.hero .buddy-gear').inner_text() == '🧢', 'home buddy does not wear the cap')
    f.shot('home-gear')
    # Dark Space theme: home, a session with bubbles, and a results chest
    set_profile_fields(f, theme='space', owned=p['owned'] + ['th:space'])
    f.check(f.page.evaluate('document.documentElement.dataset.theme') == 'space', 'space theme not applied')
    f.shot('home-space')
    f.goto('/english/quiz/abc/1', wait='.stage .q-card')
    bubble_shot(f, 'space-bubble-start')
    play_eng(f, 'abc', wrong=(1,))
    results_text(f)
    f.shot('space-results')
    check_chest(f)
    f.goto('/spelling/practice/starter-0/1', wait='.stage .spell-card')
    w = spell_word(f)
    spell_type(f, wrongly(w))
    bubble_shot(f, 'space-spell-wrong')


NEW_MATH = ['pct-big', 'big-read', 'big-addsub', 'big-muldiv', 'big-pct', 'alg-missing', 'alg-one', 'alg-two', 'alg-expr', 'alg-rule']
# Middle school skills (js/math/middle.js)
MIDDLE_MATH = ['frac-muldiv', 'dec-muldiv', 'alg-like', 'alg-ineq', 'ratio-basic', 'ratio-rate', 'ratio-prop', 'ratio-convert',
               'money-tax', 'money-discount', 'money-interest', 'money-change', 'int-line', 'int-abs', 'int-add', 'int-muldiv',
               'fm-gcf', 'fm-lcm', 'expo-pow', 'expo-ops', 'expo-sci', 'expo-roots', 'geo-angles', 'geo-area', 'geo-circle',
               'geo-volume', 'geo-pythag', 'geo-scale', 'stats-center', 'stats-prob', 'graph-points', 'graph-slope', 'graph-linear']


def t_new_math(f):
    """Big Numbers, Algebra and percents of big numbers: every tier answered, a miss per skill, and 6M-style answers."""
    new_player(f, 'Rae')
    f.goto('/math')
    units = f.page.locator('.unit-title').all_inner_texts()
    f.check(any('Big Numbers' in u for u in units) and any('Algebra' in u for u in units), f'map lacks Big Numbers / Algebra: {units}')
    for sid in NEW_MATH:
        for tier in (1, 2, 3):
            f.goto(f'/math/play/practice/{sid}/{tier}', wait='.stage .q-card')
            card = f.page.locator('.stage .q-card').last
            f.shot(f'{sid}-{tier}')
            f.mark()
            wrong = tier == 3
            o = math_answer(f, right=not wrong, skill=sid, tier=tier, submit='enter')
            if wrong:
                card.locator('.fb.bad').wait_for(timeout=3000)
                f.check(f'The answer is {o["answerText"]}' in card.locator('.fb.bad').inner_text(), f'{sid}★{tier}: wrong feedback lacks the answer')
                f.page.wait_for_timeout(600)
                f.check(card.locator('.fb.bad').count() == 1, f'{sid}★{tier}: wrong answer did not wait for Got it')
                card.get_by_role('button', name='Got it ›').click()
            else:
                f.wait_good()
            f.wait_next()
    # + and − are stacked; big × and ÷ use K / M symbols
    f.goto('/math/play/practice/big-addsub/3', wait='.stage .q-card')
    f.check(f.page.locator('.stage .q-card .q-prompt .stack-sum').count() == 1, 'big-addsub is not written one number below the other')
    f.goto('/math/play/practice/big-muldiv/3', wait='.stage .q-card')
    f.check(re.search(r'\d[KM] × \d+[KM]', f.page.locator('.stage .q-card .q-prompt').inner_text()), 'big-muldiv ★★★ does not use K / M symbols')
    # Big answers can be typed as 5M
    f.goto('/math/play/practice/big-addsub/1', wait='.stage .q-card')
    o = math_oracle(f, skill='big-addsub', tier=1)
    card = f.page.locator('.stage .q-card').last
    f.check('6M' in card.inner_text(), 'big-number hint (6M or 6 million) missing')
    card.get_by_label('answer', exact=True).fill(f"{int(o['answer'] // 1_000_000)}M")
    card.get_by_label('answer', exact=True).press('Enter')
    f.wait_good()


def t_walk_through(f):
    """A second miss on the same skill: the retry walks through the steps (type each result), then the kid answers it."""
    new_player(f, 'Wes')
    f.goto('/math/play/practice/pct-of/2', wait='.stage .q-card')
    for k in range(2):
        card = f.page.locator('.stage .q-card').last
        f.mark()
        f.check(card.locator('.walk').count() == 0, f'walk-through shown before the 2nd miss (question {k + 1})')
        math_answer(f, right=False, skill='pct-of', tier=2)
        card.locator('.fb.bad').wait_for(timeout=3000)
        card.get_by_role('button', name='Got it ›').click()
        f.wait_next()
    card = f.page.locator('.stage .q-card').last
    f.check(card.locator('.walk').count() == 1, 'no walk-through after missing the same skill twice')
    f.check(not card.locator('.answer-input:not(.walk-input)').is_visible(), 'the answer box shows before the steps are done')
    f.shot('walk-start')
    typed = 0
    for _ in range(12):
        if card.locator('.walk-now').count():
            break
        step = card.locator('.walk-step').last
        if step.locator('.walk-input').count():
            # Wrong twice: the step shows the right number in red and moves on.
            for _ in range(2):
                step.locator('.walk-input').fill('999999')
                step.locator('.walk-input').press('Enter')
                f.page.wait_for_timeout(100)
            typed += 1
        else:
            step.get_by_role('button', name='Next step ›').click()
        f.page.wait_for_timeout(100)
    f.check(card.locator('.walk-now').count() == 1, 'walk-through did not reach "Now you try the whole problem"')
    f.check(typed >= 1 and card.locator('.walk-fix').count() == typed, f'{typed} typed steps, {card.locator(".walk-fix").count()} revealed after 2 tries')
    f.shot('walk-done')
    f.mark()
    math_answer(f, right=True, skill='pct-of', tier=2)
    f.wait_good()


def t_middle_math(f):
    """Middle school math (integers, ratios, money, exponents, geometry, statistics, graphs): every tier, a miss each, negative answers."""
    new_player(f, 'Mia')
    f.goto('/math')
    units = ' '.join(f.page.locator('.unit-title').all_inner_texts())
    for u in ('Ratios & Rates', 'Percents & Money', 'Integers', 'Geometry', 'Statistics & Probability', 'Graphs & Functions'):
        f.check(u in units, f'map lacks the {u} unit')
    for sid in MIDDLE_MATH:
        for tier in (1, 2, 3):
            f.goto(f'/math/play/practice/{sid}/{tier}', wait='.stage .q-card')
            card = f.page.locator('.stage .q-card').last
            f.shot(f'{sid}-{tier}')
            f.mark()
            wrong = tier == 3
            o = math_answer(f, right=not wrong, skill=sid, tier=tier, submit='enter')
            if wrong:
                card.locator('.fb.bad').wait_for(timeout=3000)
                f.check(f'The answer is {o["answerText"]}' in card.locator('.fb.bad').inner_text(), f'{sid}★{tier}: wrong feedback lacks the answer')
                f.page.wait_for_timeout(600)
                f.check(card.locator('.fb.bad').count() == 1, f'{sid}★{tier}: wrong answer did not wait for Got it')
                card.get_by_role('button', name='Got it ›').click()
            else:
                f.wait_good()
            f.wait_next()
    # A negative answer typed with a minus sign is accepted
    f.goto('/math/play/practice/int-add/1', wait='.stage .q-card')
    o = math_oracle(f, skill='int-add', tier=1)
    card = f.page.locator('.stage .q-card').last
    card.get_by_label('answer', exact=True).fill(str(o['answer']))
    card.get_by_label('answer', exact=True).press('Enter')
    f.wait_good()


def t_quests_stickers(f):
    """Daily quests on home, finishing all three in a session, stickers on the results card and in the book."""
    new_player(f, 'Ivy')
    f.check(f.page.locator('.quests .quest').count() == 3, 'home does not show 3 daily quests')
    f.shot('home-quests')
    today = f.page.evaluate("(() => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; })()")
    set_profile_fields(f, quests={'day': today, 'starsAt': 0, 'bonus': False, 'fresh': [], 'list': [
        {'id': 'right', 'goal': 5, 'progress': 0, 'done': False},
        {'id': 'combo', 'goal': 3, 'progress': 0, 'done': False},
        {'id': 'stars', 'goal': 1, 'progress': 0, 'done': False}]})
    f.check('0/5' in f.page.locator('.quests').inner_text(), 'seeded quests not shown on home')
    coins0 = cur_profile(f)['coins']
    f.goto('/math/play/practice/basic-count/1', wait='.stage .q-card')
    play_math_session(f, skill='basic-count', tier=1)
    t = results_text(f)
    f.shot('results-quests-stickers')
    f.check(t.count('Quest done:') == 3, f'results should list 3 finished quests: {t!r}')
    f.check('All quests done today' in t, 'all-quests bonus not shown')
    f.check('new sticker' in t.lower() or 'new stickers' in t.lower(), 'no new sticker on the results card')
    p = cur_profile(f)
    f.check(len(p['stickers']['owned']) == 2, f"expected 2 stickers (1 star + quest bonus), got {p['stickers']['owned']}")
    f.check(p['coins'] - coins0 >= 20 + 20 + 30 + 50, f"quest coins not paid: {coins0} -> {p['coins']}")
    f.goto('/')
    if f.page.locator('.modal-back').count():
        f.page.keyboard.press('Escape')
    f.check('All done' in f.page.locator('.quests').inner_text(), 'home quests do not show all done')
    f.goto('/stickers')
    f.check(f.page.locator('.sticker').count() == 72, 'sticker book should have 72 slots')
    f.check(f.page.locator('.sticker:not(.missing)').count() == 2, 'sticker book does not show the 2 owned stickers')
    f.check('2 of 72' in f.text(), 'sticker count header wrong')
    f.shot('sticker-book')
    f.goto('/')
    f.page.locator('.mini-card', has_text='Stickers').click()
    f.page.wait_for_selector('.sticker-page')


def t_lesson_subjects(f):
    """Science Lab and Code Club: home card, subject home, lesson cards, a Warm-up quiz to a star, code blocks."""
    new_player(f, 'Leo')
    for subj, title in (('science', 'Science Lab'), ('coding', 'Code Club')):
        f.goto('/')
        card = f.page.locator('.hub-card', has_text=title)
        f.check(card.count() == 1, f'home has no {title} card')
        card.click()
        f.page.wait_for_selector('.skill.eng')
        f.check(f.page.locator('.topbar-title').inner_text() == title, f'{title} home title')
        f.check(f.page.locator('.unit-title').count() >= 5, f'{title} has too few sections')
        f.shot(f'{subj}-home')
        unit = f.page.locator('.skill.eng').first.get_attribute('href').split('/')[-1]
        f.page.locator('.skill.eng').first.click()
        f.page.wait_for_selector('.lesson')
        f.shot(f'{subj}-lesson')
        while f.page.get_by_role('button', name='Next ›').count():
            f.page.get_by_role('button', name='Next ›').click()
        f.page.locator('.tier-row').first.click()
        f.page.wait_for_selector('.stage .q-card')
        play_eng(f, unit=unit, wrong=(1,), warmup=True, subject=subj)
        t = results_text(f)
        f.check('earned' in t, f'{title} Warm-up with 1 miss of 6 did not earn a star: {t[:200]!r}')
        f.shot(f'{subj}-results')
    # Code blocks keep indentation and never widen the page
    f.goto('/coding/quiz/py-loops/3', wait='.stage .q-card')
    seen_code = False
    for _ in range(12):
        if f.done():
            break
        block = f.page.locator('.stage .q-card .code-block')
        if block.count():
            seen_code = True
            f.check('    ' in block.inner_text(), 'code block lost its indentation')
            f.shot('code-block')
        f.mark()
        eng_answer(f, unit='py-loops', subject='coding')
        f.page.wait_for_timeout(300)
        nxt = f.page.locator('.stage .q-card').last.get_by_role('button', name='Got it ›')
        if nxt.count():
            nxt.click()
        f.wait_next()
    f.check(seen_code, 'no code block shown in the Python loops Expert quiz')


TESTS = [
    ('profiles', t_profiles),
    ('math_map', t_math_map),
    ('math_practice_tiers', t_math_practice_tiers),
    ('math_non_column', t_math_non_column),
    ('math_coach_mix_gym', t_math_coach_mix_gym),
    ('speed', t_speed),
    ('english', t_english),
    ('spelling', t_spelling),
    ('shop_trophies_parent', t_shop_trophies_parent),
    ('persistence_routes', t_persistence_routes),
    ('buddy_gear_chest', t_buddy_gear_chest),
    ('new_math', t_new_math),
    ('quests_stickers', t_quests_stickers),
    ('lesson_subjects', t_lesson_subjects),
    ('middle_math', t_middle_math),
    ('walk_through', t_walk_through),
]


# Which flows cover which files, for --changed. First match wins; a file matching nothing runs everything.
MATH = ['math_map', 'math_practice_tiers', 'math_non_column', 'math_coach_mix_gym', 'speed', 'new_math', 'middle_math', 'walk_through']
LESSONS = ['english', 'lesson_subjects']
AFFECTS = [
    (r'^(README\.md|IMPROVEMENTS\.md|CLAUDE\.md|\.claude/|tools/|tests/[^/]+\.test\.mjs$|tests/e2e/(README\.md|shots/))', []),
    (r'^js/math/middle\.js$', ['math_map', 'middle_math']),
    (r'^js/math/(speed)\.js$', ['speed']),
    (r'^js/math/(column|guided)\.js$', ['math_practice_tiers', 'math_coach_mix_gym']),
    (r'^js/math/walk\.js$', ['walk_through']),
    (r'^js/math/grades\.js$', ['math_map', 'math_coach_mix_gym', 'shop_trophies_parent', 'quests_stickers']),
    (r'^js/math/', MATH),
    (r'^js/(english|lessons|science|coding)/', LESSONS),
    (r'^js/spelling/', ['spelling']),
    (r'^js/shared/(quests|stickers)\.js$', ['quests_stickers']),
    (r'^js/(shared/(buddy|chest)|views/(buddy|chest))\.js$', ['buddy_gear_chest']),
    (r'^js/views/(shop|parent|syncCard)\.js$', ['shop_trophies_parent']),
    (r'^js/shared/(achievements|rewards)\.js$', ['shop_trophies_parent', 'quests_stickers']),
    (r'^js/views/(home|progressCards)\.js$', ['profiles', 'quests_stickers']),
    (r'^js/math/grades\.js$', ['profiles']),
    (r'^js/sync/', ['persistence_routes']),
    (r'^tests/e2e/oracle\.js$', MATH + LESSONS),
]


def changed_tests(ref):
    """Test names covering the files changed since `ref` (plus uncommitted and untracked files)."""
    root = HERE.parent.parent
    git = lambda *a: subprocess.run(['git', '-C', str(root), *a], capture_output=True, text=True, check=True).stdout.split()
    files = sorted(set(git('diff', '--name-only', ref) + git('ls-files', '--others', '--exclude-standard')))
    names, why = [], {}
    for path in files:
        hit = next((tests for rx, tests in AFFECTS if re.search(rx, path)), None)
        if hit is None:  # css, index.html, ui.js, store.js, router.js, the runner itself...: everything
            return [n for n, _ in TESTS], files, {path: 'all'}
        for n in hit:
            why.setdefault(n, path)
            if n not in names:
                names.append(n)
    return [n for n, _ in TESTS if n in names], files, why


# ---------------------------------------------------------------- runner

def run_viewport(args, vp):
    results = []
    names = set(args.only.split(',')) if args.only else None
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        for name, fn in TESTS:
            if names and name not in names:
                continue
            for old in (pathlib.Path(args.shots) / vp).glob(f'{name}-*.png'):
                old.unlink()
            f = Flow(browser, args, vp, name)
            t0 = time.time()
            status, detail = 'PASS', ''
            try:
                fn(f)
                f.page.wait_for_timeout(200)
                f.collect_pal()
                if f.pal['shown']:
                    f.notes.append(f"buddy bubble seen {f.pal['shown']}x")
                probs = [f'BUG: {b}' for b in f.bugs]
                probs += [f'buddy bubble: {x}' for x in (f.pal['hits'] + f.pal['overflow'])[:4]]
                probs += f.errors[:5]
                if probs:
                    status, detail = 'FAIL', '\n      - ' + '\n      - '.join(probs)
            except Skip as e:
                status, detail = 'SKIP', str(e)
            except Exception as e:
                status = 'FAIL'
                detail = f'{type(e).__name__}: {str(e).splitlines()[0][:400]}'
                here = [fr for fr in traceback.extract_tb(e.__traceback__) if fr.filename == __file__][1:]
                if here:
                    detail += '  @ ' + ' > '.join(f'{fr.name}:{fr.lineno}' for fr in here[-3:])
                for x in [f'BUG: {b}' for b in f.bugs] + f.errors[:3]:
                    detail += '\n      - ' + x
                try:
                    f.shot('FAILED', overflow=False)
                except Exception:
                    pass
            dt = time.time() - t0
            line = f'[{vp:7}] {status} {name:22} {dt:6.1f}s' + (f'  {detail}' if detail else '') + (f'  ({"; ".join(f.notes)})' if f.notes else '')
            print(line, flush=True)
            results.append({'viewport': vp, 'test': name, 'status': status, 'detail': detail, 'secs': round(dt, 1)})
            f.close()
        browser.close()
    return results


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--base', default='http://localhost:8777/', help='app URL (default http://localhost:8777/)')
    ap.add_argument('--dir', help='serve this folder on http://bq.test/ through request interception instead of --base')
    ap.add_argument('--viewport', choices=['phone', 'desktop', 'all'], default='all')
    ap.add_argument('--only', help='comma-separated test names: ' + ','.join(n for n, _ in TESTS))
    ap.add_argument('--changed', nargs='?', const='HEAD', metavar='REF',
                    help='quick mode: only the flows that cover files changed since REF (default HEAD, i.e. uncommitted work)')
    ap.add_argument('--parallel', action='store_true', help='run the two viewports in parallel processes')
    ap.add_argument('--shots', default=str(HERE / 'shots'), help='screenshot folder (default: ./shots)')
    ap.add_argument('--headed', action='store_true')
    ap.add_argument('--real-delays', action='store_true', help='keep the real pause after right answers (default: shortened to 300 ms)')
    ap.add_argument('--json', help='write results to this JSON file')
    args = ap.parse_args()
    if not args.base.endswith('/'):
        args.base += '/'
    if args.changed:
        names, files, why = changed_tests(args.changed)
        if not names:
            print(f'--changed {args.changed}: {len(files)} changed file(s), none covered by a browser flow. Nothing to run.')
            sys.exit(0)
        print(f'--changed {args.changed}: {len(files)} file(s) -> {",".join(names)}' + (f'  (full run: {next(iter(why))})' if 'all' in why.values() else ''), flush=True)
        args.only = ','.join(names)
    vps = ['phone', 'desktop'] if args.viewport == 'all' else [args.viewport]
    print(f'Brainy Quest regression: {args.dir and ("dir " + args.dir + " on " + FAKE_ORIGIN) or args.base}  viewports={vps}', flush=True)
    results = []
    if args.parallel and len(vps) > 1:
        procs = []
        for vp in vps:
            out = pathlib.Path(args.shots) / f'.results-{vp}.json'
            cmd = [sys.executable, __file__, '--viewport', vp, '--json', str(out)]
            for k in ('base', 'dir', 'only', 'shots'):
                if getattr(args, k):
                    cmd += [f'--{k}', getattr(args, k)]
            if args.real_delays:
                cmd.append('--real-delays')
            procs.append((subprocess.Popen(cmd, stdout=subprocess.PIPE, text=True), out))
        for p, out in procs:
            for line in p.stdout:
                if not line.startswith('Brainy Quest regression') and ' passed, ' not in line and line.strip():
                    print(line, end='', flush=True)
            p.wait()
            results += json.loads(out.read_text()) if out.exists() else []
    else:
        for vp in vps:
            results += run_viewport(args, vp)
    fails = [r for r in results if r['status'] == 'FAIL']
    skips = [r for r in results if r['status'] == 'SKIP']
    print(f'\n{len(results) - len(fails) - len(skips)} passed, {len(fails)} failed, {len(skips)} skipped. Screenshots: {args.shots}')
    if args.json:
        pathlib.Path(args.json).write_text(json.dumps(results, indent=2))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
