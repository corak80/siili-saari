# Real /sv/ and /en/ URLs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish separately indexable Swedish and English versions of the three pages with search demand, generated from the Finnish originals, each carrying its own head signals and a reciprocal hreflang set.

**Architecture:** The Finnish files at the repo root stay hand-edited and authoritative. A zero-runtime-dependency Node build (`build.js` plus four focused modules under `build/`) derives `sv/` and `en/` from them and writes the output into the repo, which GitHub Pages serves directly. Generated pages carry no client-side language machinery at all — they are plain static HTML in one language.

**Tech Stack:** Node 24 (`node --test`, built in — no test framework to install), `node-html-parser` as the single devDependency, GitHub Actions for a build-freshness check.

**Spec:** `docs/superpowers/specs/2026-08-30-siilisaari-language-urls-design.md`

## Global Constraints

- Languages and their order everywhere: `fi`, `sv`, `en`. Finnish is `x-default`.
- Site origin is exactly `https://siilisaari.fi` — no trailing slash in the constant, no `www`.
- The three pages in scope, by their Finnish filename: `index.html`, `siilinhoito.html`, `siilin-pesa.html`. Filenames are identical in every language directory.
- Generated output directories are `sv/` and `en/` at the repo root. They are committed.
- `node_modules` is gitignored. The published site must load no JavaScript dependency.
- Generated pages must contain **no** `data-i18n` attributes, **no** `data-lang` attributes, **no** `i18n.js` script tag and **no** inline language-switcher script.
- Never edit anything inside `sv/` or `en/` by hand.
- Existing Finnish URLs must keep working unchanged.

---

### Task 1: Scaffolding and the i18n dictionary reader

`i18n.js` declares `const I18N = {…}` and then runs browser code that would throw under Node. The reader slices out only the object literal and evaluates that.

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `build/dict.js`
- Test: `test/dict.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `readDict(i18nSource: string) => { fi: object, sv: object, en: object }`

- [ ] **Step 1: Write the failing test**

```js
// test/dict.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readDict } from '../build/dict.js';

test('readDict returns the three language tables', () => {
  const dict = readDict(readFileSync('i18n.js', 'utf8'));
  assert.deepEqual(Object.keys(dict).sort(), ['en', 'fi', 'sv']);
});

test('readDict picks up per-language metadata', () => {
  const dict = readDict(readFileSync('i18n.js', 'utf8'));
  assert.match(dict.sv['meta.title'], /Igelkottsrehabilitering/);
  assert.match(dict.en['meta.title'], /Hedgehog Rehabilitation/);
  assert.equal(typeof dict.fi['about.p1'], 'string');
});

test('readDict ignores the browser code after the object literal', () => {
  const dict = readDict(readFileSync('i18n.js', 'utf8'));
  assert.equal(dict.fi.document, undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/dict.test.js`
Expected: FAIL — cannot find module `../build/dict.js`

- [ ] **Step 3: Write minimal implementation**

```json
// package.json
{
  "name": "siili-saari-site",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.js",
    "test": "node --test test/"
  },
  "devDependencies": {
    "node-html-parser": "^6.1.13"
  }
}
```

```
# .gitignore
node_modules/
```

```js
// build/dict.js
// i18n.js is a browser script: `const I18N = {…}` followed by DOM code.
// Slice out just the object literal and evaluate it in isolation.
export function readDict(i18nSource) {
  const start = i18nSource.indexOf('const I18N = {');
  if (start === -1) throw new Error('I18N declaration not found in i18n.js');
  const open = i18nSource.indexOf('{', start);
  const close = i18nSource.indexOf('\n};', open);
  if (close === -1) throw new Error('end of I18N object literal not found');
  const literal = i18nSource.slice(open, close + 2);
  return Function(`"use strict"; return (${literal});`)();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm install && node --test test/dict.test.js`
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore build/dict.js test/dict.test.js package-lock.json
git commit -m "build: add i18n dictionary reader with tests"
```

---

### Task 2: Head signals and hreflang

**Files:**
- Create: `build/head.js`
- Test: `test/head.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `ORIGIN = 'https://siilisaari.fi'`
  - `urlFor(page: string, lang: 'fi'|'sv'|'en') => string`
  - `hreflangBlock(page: string) => string`
  - `applyHead(root: HTMLElement, opts: { lang, page, title, description, og?: object }) => void`

`urlFor('index.html', 'fi')` is `https://siilisaari.fi/` — the homepage is the bare origin plus a slash, never `/index.html`, in every language.

- [ ] **Step 1: Write the failing test**

```js
// test/head.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import { urlFor, hreflangBlock, applyHead } from '../build/head.js';

test('urlFor maps pages to language URLs', () => {
  assert.equal(urlFor('index.html', 'fi'), 'https://siilisaari.fi/');
  assert.equal(urlFor('index.html', 'sv'), 'https://siilisaari.fi/sv/');
  assert.equal(urlFor('siilinhoito.html', 'fi'), 'https://siilisaari.fi/siilinhoito.html');
  assert.equal(urlFor('siilinhoito.html', 'en'), 'https://siilisaari.fi/en/siilinhoito.html');
});

test('hreflangBlock is reciprocal and has x-default on Finnish', () => {
  const block = hreflangBlock('siilin-pesa.html');
  assert.match(block, /hreflang="fi" href="https:\/\/siilisaari\.fi\/siilin-pesa\.html"/);
  assert.match(block, /hreflang="sv" href="https:\/\/siilisaari\.fi\/sv\/siilin-pesa\.html"/);
  assert.match(block, /hreflang="en" href="https:\/\/siilisaari\.fi\/en\/siilin-pesa\.html"/);
  assert.match(block, /hreflang="x-default" href="https:\/\/siilisaari\.fi\/siilin-pesa\.html"/);
});

test('applyHead sets lang, title, description, canonical and hreflang', () => {
  const root = parse(`<html lang="fi"><head>
    <title>Vanha</title>
    <meta name="description" content="vanha">
    <link rel="canonical" href="https://siilisaari.fi/siilinhoito.html">
  </head><body></body></html>`);
  applyHead(root, {
    lang: 'sv', page: 'siilinhoito.html',
    title: 'Skötselguide', description: 'Guide på svenska'
  });
  assert.equal(root.querySelector('html').getAttribute('lang'), 'sv');
  assert.equal(root.querySelector('title').text, 'Skötselguide');
  assert.equal(root.querySelector('meta[name="description"]').getAttribute('content'), 'Guide på svenska');
  assert.equal(
    root.querySelector('link[rel="canonical"]').getAttribute('href'),
    'https://siilisaari.fi/sv/siilinhoito.html'
  );
  assert.equal(root.querySelectorAll('link[rel="alternate"]').length, 4);
});

test('applyHead translates og tags when given them', () => {
  const root = parse(`<html lang="fi"><head>
    <title>t</title><meta name="description" content="d">
    <link rel="canonical" href="x">
    <meta property="og:title" content="vanha">
    <meta property="og:locale" content="fi_FI">
  </head><body></body></html>`);
  applyHead(root, {
    lang: 'en', page: 'siilinhoito.html', title: 't2', description: 'd2',
    og: { 'og:title': 'Hoglet care guide' }
  });
  assert.equal(root.querySelector('meta[property="og:title"]').getAttribute('content'), 'Hoglet care guide');
  assert.equal(root.querySelector('meta[property="og:locale"]').getAttribute('content'), 'en_GB');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/head.test.js`
Expected: FAIL — cannot find module `../build/head.js`

- [ ] **Step 3: Write minimal implementation**

```js
// build/head.js
export const ORIGIN = 'https://siilisaari.fi';
export const LANGS = ['fi', 'sv', 'en'];

const OG_LOCALE = { fi: 'fi_FI', sv: 'sv_FI', en: 'en_GB' };

export function urlFor(page, lang) {
  const prefix = lang === 'fi' ? '' : `/${lang}`;
  if (page === 'index.html') return `${ORIGIN}${prefix}/`;
  return `${ORIGIN}${prefix}/${page}`;
}

export function hreflangBlock(page) {
  const rows = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${urlFor(page, l)}">`
  );
  rows.push(`<link rel="alternate" hreflang="x-default" href="${urlFor(page, 'fi')}">`);
  return rows.join('\n');
}

export function applyHead(root, { lang, page, title, description, og }) {
  root.querySelector('html').setAttribute('lang', lang);

  const titleEl = root.querySelector('title');
  if (titleEl) titleEl.set_content(title);

  const desc = root.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', description);

  const canonical = root.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', urlFor(page, lang));

  const locale = root.querySelector('meta[property="og:locale"]');
  if (locale) locale.setAttribute('content', OG_LOCALE[lang]);

  const ogUrl = root.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('href', urlFor(page, lang));

  for (const [prop, value] of Object.entries(og || {})) {
    const el = root.querySelector(`meta[property="${prop}"]`);
    if (el) el.setAttribute('content', value);
  }

  root.querySelectorAll('link[rel="alternate"]').forEach((el) => el.remove());
  root.querySelector('head').insertAdjacentHTML('beforeend', '\n' + hreflangBlock(page) + '\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/head.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add build/head.js test/head.test.js
git commit -m "build: add head-signal and hreflang generation"
```

---

### Task 3: Internal link and asset path rewriting

A generated page lives one directory down, so every relative reference has to be reconsidered. Links to pages *in scope* move into the language directory; everything else becomes root-absolute so it still resolves.

**Files:**
- Create: `build/links.js`
- Test: `test/links.test.js`

**Interfaces:**
- Consumes: `IN_SCOPE` page list
- Produces: `rewriteLinks(root: HTMLElement, lang: 'sv'|'en') => void`

- [ ] **Step 1: Write the failing test**

```js
// test/links.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import { rewriteLinks } from '../build/links.js';

test('in-scope page links move into the language directory', () => {
  const root = parse(`<body>
    <a id="a" href="siilinhoito.html">x</a>
    <a id="b" href="siilin-pesa.html">x</a>
    <a id="c" href="index.html">x</a>
  </body>`);
  rewriteLinks(root, 'sv');
  assert.equal(root.querySelector('#a').getAttribute('href'), '/sv/siilinhoito.html');
  assert.equal(root.querySelector('#b').getAttribute('href'), '/sv/siilin-pesa.html');
  assert.equal(root.querySelector('#c').getAttribute('href'), '/sv/');
});

test('out-of-scope internal links become root-absolute Finnish', () => {
  const root = parse('<body><a id="a" href="tietosuoja.html">x</a></body>');
  rewriteLinks(root, 'sv');
  assert.equal(root.querySelector('#a').getAttribute('href'), '/tietosuoja.html');
});

test('assets become root-absolute', () => {
  const root = parse(`<body>
    <img id="i" src="hoglet.jpg">
    <link id="l" rel="icon" href="favicon.png">
  </body>`);
  rewriteLinks(root, 'en');
  assert.equal(root.querySelector('#i').getAttribute('src'), '/hoglet.jpg');
  assert.equal(root.querySelector('#l').getAttribute('href'), '/favicon.png');
});

test('absolute, anchor, mailto and tel links are left alone', () => {
  const root = parse(`<body>
    <a id="a" href="https://saarivet.fi">x</a>
    <a id="b" href="#help">x</a>
    <a id="c" href="mailto:info@siilisaari.fi">x</a>
    <a id="d" href="tel:+35863217300">x</a>
    <a id="e" href="/sv/">x</a>
  </body>`);
  rewriteLinks(root, 'sv');
  assert.equal(root.querySelector('#a').getAttribute('href'), 'https://saarivet.fi');
  assert.equal(root.querySelector('#b').getAttribute('href'), '#help');
  assert.equal(root.querySelector('#c').getAttribute('href'), 'mailto:info@siilisaari.fi');
  assert.equal(root.querySelector('#d').getAttribute('href'), 'tel:+35863217300');
  assert.equal(root.querySelector('#e').getAttribute('href'), '/sv/');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/links.test.js`
Expected: FAIL — cannot find module `../build/links.js`

- [ ] **Step 3: Write minimal implementation**

```js
// build/links.js
export const IN_SCOPE = ['index.html', 'siilinhoito.html', 'siilin-pesa.html'];

const SKIP = /^(https?:|mailto:|tel:|#|\/|data:)/i;

function rewriteValue(value, lang) {
  if (!value || SKIP.test(value)) return value;
  const [path, hash = ''] = value.split('#');
  const suffix = hash ? `#${hash}` : '';
  if (IN_SCOPE.includes(path)) {
    if (path === 'index.html') return `/${lang}/${suffix}`;
    return `/${lang}/${path}${suffix}`;
  }
  return `/${path}${suffix}`;
}

export function rewriteLinks(root, lang) {
  for (const el of root.querySelectorAll('[href]')) {
    el.setAttribute('href', rewriteValue(el.getAttribute('href'), lang));
  }
  for (const el of root.querySelectorAll('[src]')) {
    el.setAttribute('src', rewriteValue(el.getAttribute('src'), lang));
  }
}
```

Note: `rewriteLinks` runs **after** `applyHead`, so the canonical and hreflang links it produced are already absolute and correctly skipped.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/links.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add build/links.js test/links.test.js
git commit -m "build: add internal link and asset path rewriting"
```

---

### Task 4: Render the homepage from the dictionary

`index.html` marks translatable content with `data-i18n`, optionally `data-i18n-html="true"` for HTML values and `data-i18n-attr` to target an attribute. This mirrors `applyLang()` in `i18n.js`, at build time.

**Files:**
- Create: `build/render-index.js`
- Test: `test/render-index.test.js`

**Interfaces:**
- Consumes: `readDict` (Task 1)
- Produces: `renderIndex(root: HTMLElement, dict: object) => void`

- [ ] **Step 1: Write the failing test**

```js
// test/render-index.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import { renderIndex } from '../build/render-index.js';

const dict = {
  'about.title': 'Där natur möter omsorg',
  'about.p1': 'Vi <em>räddar</em> igelkottar.',
  'meta.description': 'Beskrivning'
};

test('plain keys are substituted as text', () => {
  const root = parse('<body><h2 data-i18n="about.title">Vanha</h2></body>');
  renderIndex(root, dict);
  assert.equal(root.querySelector('h2').text, 'Där natur möter omsorg');
});

test('data-i18n-html keys keep their markup', () => {
  const root = parse('<body><p data-i18n="about.p1" data-i18n-html="true">vanha</p></body>');
  renderIndex(root, dict);
  assert.equal(root.querySelector('p em').text, 'räddar');
});

test('data-i18n-attr writes the named attribute', () => {
  const root = parse('<head><meta name="description" data-i18n-attr="content" data-i18n="meta.description" content="vanha"></head>');
  renderIndex(root, dict);
  assert.equal(root.querySelector('meta[name="description"]').getAttribute('content'), 'Beskrivning');
});

test('build metadata attributes are stripped from the output', () => {
  const root = parse('<body><h2 data-i18n="about.title" data-i18n-html="true">x</h2></body>');
  renderIndex(root, dict);
  const h2 = root.querySelector('h2');
  assert.equal(h2.getAttribute('data-i18n'), undefined);
  assert.equal(h2.getAttribute('data-i18n-html'), undefined);
});

test('a key missing from the dictionary leaves the Finnish text and throws', () => {
  const root = parse('<body><p data-i18n="nope.missing">Suomeksi</p></body>');
  assert.throws(() => renderIndex(root, dict), /nope\.missing/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/render-index.test.js`
Expected: FAIL — cannot find module `../build/render-index.js`

- [ ] **Step 3: Write minimal implementation**

```js
// build/render-index.js
// Build-time equivalent of applyLang() in i18n.js. A missing key is a build
// failure rather than a silently Finnish paragraph on a Swedish page.
export function renderIndex(root, dict) {
  const missing = [];
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    const value = dict[key];
    if (value == null) { missing.push(key); continue; }
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) {
      el.setAttribute(attr, value);
    } else if (el.getAttribute('data-i18n-html') === 'true') {
      el.set_content(value);
    } else {
      el.set_content(value);
    }
    el.removeAttribute('data-i18n');
    el.removeAttribute('data-i18n-attr');
    el.removeAttribute('data-i18n-html');
  }
  if (missing.length) {
    throw new Error(`missing translations: ${[...new Set(missing)].join(', ')}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/render-index.test.js`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add build/render-index.js test/render-index.test.js
git commit -m "build: render homepage content from the i18n dictionary"
```

---

### Task 5: Render a guide page by pruning language variants

The two guides carry all three languages inline on `p`, `h2`, `h4`, `ul`, `div`, `table` and `span` elements — 153 such elements on `siilinhoito.html`, 123 on `siilin-pesa.html`. Keep the target language, delete the rest, then strip the attribute so no runtime script can hide the surviving content.

**Files:**
- Create: `build/render-guide.js`
- Test: `test/render-guide.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `renderGuide(root: HTMLElement, lang: 'fi'|'sv'|'en') => void`

- [ ] **Step 1: Write the failing test**

```js
// test/render-guide.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import { renderGuide } from '../build/render-guide.js';

test('keeps only the target language and strips the attribute', () => {
  const root = parse(`<body>
    <h1 data-lang="fi" class="show">Hoito-opas</h1>
    <h1 data-lang="sv">Skötselguide</h1>
    <h1 data-lang="en">Care guide</h1>
  </body>`);
  renderGuide(root, 'sv');
  const heads = root.querySelectorAll('h1');
  assert.equal(heads.length, 1);
  assert.equal(heads[0].text, 'Skötselguide');
  assert.equal(heads[0].getAttribute('data-lang'), undefined);
});

test('removes the show class left over from the Finnish default', () => {
  const root = parse('<body><p data-lang="fi" class="show lead">a</p><p data-lang="sv" class="lead">b</p></body>');
  renderGuide(root, 'fi');
  assert.equal(root.querySelector('p').classNames, 'lead');
});

test('prunes block elements with nested markup intact', () => {
  const root = parse(`<body>
    <ul data-lang="sv"><li>ett</li><li>två</li></ul>
    <ul data-lang="en"><li>one</li></ul>
  </body>`);
  renderGuide(root, 'sv');
  assert.equal(root.querySelectorAll('ul').length, 1);
  assert.equal(root.querySelectorAll('li').length, 2);
});

test('leaves the language buttons for the switcher task to replace', () => {
  const root = parse('<body><button data-lang="sv" class="lang-btn">SV</button></body>');
  renderGuide(root, 'en');
  assert.equal(root.querySelectorAll('button.lang-btn').length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/render-guide.test.js`
Expected: FAIL — cannot find module `../build/render-guide.js`

- [ ] **Step 3: Write minimal implementation**

```js
// build/render-guide.js
// The guides hold all three languages inline. Keep one, drop the others, and
// remove the attribute and the .show class so nothing can hide what remains.
export function renderGuide(root, lang) {
  for (const el of root.querySelectorAll('[data-lang]')) {
    if (el.classList.contains('lang-btn')) continue;
    if (el.getAttribute('data-lang') === lang) {
      el.removeAttribute('data-lang');
      el.classList.remove('show');
      if (el.classNames === '') el.removeAttribute('class');
    } else {
      el.remove();
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/render-guide.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add build/render-guide.js test/render-guide.test.js
git commit -m "build: prune guide pages to a single language"
```

---

### Task 6: Switcher anchors and stripping runtime language machinery

Generated pages must be inert: no `i18n.js`, no inline `setLang`, no `[data-lang]` CSS, no `noscript` fallback — and a switcher that navigates instead of toggling.

**Files:**
- Create: `build/strip.js`
- Test: `test/strip.test.js`

**Interfaces:**
- Consumes: `urlFor` (Task 2)
- Produces:
  - `switcherHtml(page: string, lang: 'fi'|'sv'|'en') => string`
  - `stripRuntime(root: HTMLElement, page: string, lang: 'fi'|'sv'|'en') => void`

- [ ] **Step 1: Write the failing test**

```js
// test/strip.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import { switcherHtml, stripRuntime } from '../build/strip.js';

test('switcher links to the same page in each language and marks the active one', () => {
  const html = switcherHtml('siilinhoito.html', 'sv');
  assert.match(html, /href="\/siilinhoito\.html"[^>]*>FI</);
  assert.match(html, /href="\/sv\/siilinhoito\.html"[^>]*class="lang-btn active"[^>]*>SV</);
  assert.match(html, /href="\/en\/siilinhoito\.html"[^>]*>EN</);
});

test('switcher on the homepage uses directory URLs', () => {
  const html = switcherHtml('index.html', 'en');
  assert.match(html, /href="\/"[^>]*>FI</);
  assert.match(html, /href="\/en\/"[^>]*class="lang-btn active"/);
});

test('stripRuntime removes the i18n script tag', () => {
  const root = parse('<body><script src="i18n.js?v=20260830c"></script></body>');
  stripRuntime(root, 'index.html', 'sv');
  assert.equal(root.querySelectorAll('script[src*="i18n.js"]').length, 0);
});

test('stripRuntime removes the inline setLang script but keeps other scripts', () => {
  const root = parse(`<body>
    <script>function setLang(l){ document.documentElement.lang = l; }</script>
    <script>console.log('reveal observer');</script>
  </body>`);
  stripRuntime(root, 'siilinhoito.html', 'sv');
  const scripts = root.querySelectorAll('script');
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].text, /reveal observer/);
});

test('stripRuntime removes the noscript language fallback', () => {
  const root = parse('<head><noscript><style>[data-lang]{display:none}</style></noscript></head>');
  stripRuntime(root, 'siilinhoito.html', 'en');
  assert.equal(root.querySelectorAll('noscript').length, 0);
});

test('stripRuntime replaces the switcher buttons with anchors', () => {
  const root = parse(`<body><div class="lang-switcher">
    <button type="button" data-lang="fi" class="lang-btn active">FI</button>
    <button type="button" data-lang="sv" class="lang-btn">SV</button>
    <button type="button" data-lang="en" class="lang-btn">EN</button>
  </div></body>`);
  stripRuntime(root, 'siilin-pesa.html', 'sv');
  assert.equal(root.querySelectorAll('button.lang-btn').length, 0);
  const links = root.querySelectorAll('.lang-switcher a');
  assert.equal(links.length, 3);
  assert.equal(links[1].getAttribute('href'), '/sv/siilin-pesa.html');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/strip.test.js`
Expected: FAIL — cannot find module `../build/strip.js`

- [ ] **Step 3: Write minimal implementation**

```js
// build/strip.js
import { urlFor, LANGS } from './head.js';

const LABEL = { fi: 'FI', sv: 'SV', en: 'EN' };

export function switcherHtml(page, lang) {
  return LANGS.map((l) => {
    const href = new URL(urlFor(page, l)).pathname;
    const cls = l === lang ? 'lang-btn active' : 'lang-btn';
    return `<a href="${href}" hreflang="${l}" class="${cls}">${LABEL[l]}</a>`;
  }).join('\n    ');
}

export function stripRuntime(root, page, lang) {
  for (const s of root.querySelectorAll('script')) {
    const src = s.getAttribute('src') || '';
    if (src.includes('i18n.js') || /function\s+setLang|applyLang\(/.test(s.text)) s.remove();
  }
  for (const n of root.querySelectorAll('noscript')) n.remove();

  const switcher = root.querySelector('.lang-switcher');
  if (switcher) switcher.set_content('\n    ' + switcherHtml(page, lang) + '\n  ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/strip.test.js`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add build/strip.js test/strip.test.js
git commit -m "build: replace switcher with anchors and strip runtime i18n"
```

---

### Task 7: Guide metadata (`seo.json`) — copywriting gate

The four titles and four descriptions do not exist anywhere yet. They decide whether these pages rank, so they are written deliberately and shown for approval, not generated in passing.

**Files:**
- Create: `seo.json`
- Test: `test/seo.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `seo.json` keyed `page → lang → { title, description, og:title, og:description }`

- [ ] **Step 1: Write the failing test**

```js
// test/seo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seo = JSON.parse(readFileSync('seo.json', 'utf8'));
const PAGES = ['siilinhoito.html', 'siilin-pesa.html'];
const FIELDS = ['title', 'description', 'og:title', 'og:description'];

test('every guide has complete sv and en metadata', () => {
  for (const page of PAGES) {
    for (const lang of ['sv', 'en']) {
      for (const field of FIELDS) {
        const value = seo[page]?.[lang]?.[field];
        assert.equal(typeof value, 'string', `${page}/${lang}/${field} missing`);
        assert.ok(value.trim().length > 0, `${page}/${lang}/${field} empty`);
      }
    }
  }
});

test('titles and descriptions stay within sensible SERP lengths', () => {
  for (const page of PAGES) {
    for (const lang of ['sv', 'en']) {
      assert.ok(seo[page][lang].title.length <= 60, `${page}/${lang} title too long`);
      assert.ok(seo[page][lang].description.length <= 160, `${page}/${lang} description too long`);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/seo.test.js`
Expected: FAIL — `seo.json` does not exist

- [ ] **Step 3: Draft the copy and get it approved**

Draft all eight strings in Swedish and English, plus an English back-translation of the Swedish so Assaf can check it without reading Swedish. Present them in chat and **wait for approval** before writing the file. Anchor them on what people actually search — Swedish Vaasa residents look for `igelkottsunge`, `hittat igelkott`, `igelkott hjälp`; the nest-box page for `igelkottsbo` and `igelkotthus`. Do not translate the Finnish titles literally.

- [ ] **Step 4: Write `seo.json` with the approved strings and run the test**

Run: `node --test test/seo.test.js`
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
git add seo.json test/seo.test.js
git commit -m "content: add Swedish and English metadata for the guide pages"
```

---

### Task 8: The orchestrator

**Files:**
- Create: `build.js`
- Test: `test/build.test.js`

**Interfaces:**
- Consumes: everything above
- Produces: `sv/` and `en/`, three pages each; `buildAll() => string[]` (paths written)

- [ ] **Step 1: Write the failing test**

```js
// test/build.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildAll } from '../build.js';

test('buildAll writes six pages', () => {
  const written = buildAll();
  assert.equal(written.length, 6);
  for (const p of ['sv/index.html', 'sv/siilinhoito.html', 'sv/siilin-pesa.html',
                   'en/index.html', 'en/siilinhoito.html', 'en/siilin-pesa.html']) {
    assert.ok(existsSync(p), `${p} missing`);
  }
});

test('generated pages are inert single-language HTML', () => {
  buildAll();
  const sv = readFileSync('sv/siilinhoito.html', 'utf8');
  assert.doesNotMatch(sv, /data-lang="/);
  assert.doesNotMatch(sv, /data-i18n/);
  assert.doesNotMatch(sv, /i18n\.js/);
  assert.match(sv, /<html lang="sv"/);
});

test('generated homepage carries the organisation id unchanged', () => {
  buildAll();
  const en = readFileSync('en/index.html', 'utf8');
  assert.match(en, /"@id": "https:\/\/siilisaari\.fi\/#organization"/);
  assert.match(en, /"inLanguage": "en"/);
});

test('hreflang is reciprocal on a generated page', () => {
  buildAll();
  const sv = readFileSync('sv/siilin-pesa.html', 'utf8');
  for (const href of ['https://siilisaari.fi/siilin-pesa.html',
                      'https://siilisaari.fi/sv/siilin-pesa.html',
                      'https://siilisaari.fi/en/siilin-pesa.html']) {
    assert.ok(sv.includes(href), `${href} missing from hreflang set`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/build.test.js`
Expected: FAIL — cannot find module `../build.js`

- [ ] **Step 3: Write minimal implementation**

```js
// build.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { readDict } from './build/dict.js';
import { applyHead } from './build/head.js';
import { rewriteLinks } from './build/links.js';
import { renderIndex } from './build/render-index.js';
import { renderGuide } from './build/render-guide.js';
import { stripRuntime } from './build/strip.js';

const OUT_LANGS = ['sv', 'en'];
const GUIDES = ['siilinhoito.html', 'siilin-pesa.html'];

export function buildAll() {
  const dict = readDict(readFileSync('i18n.js', 'utf8'));
  const seo = JSON.parse(readFileSync('seo.json', 'utf8'));
  const written = [];

  for (const lang of OUT_LANGS) {
    mkdirSync(lang, { recursive: true });

    // Homepage: substitute from the dictionary.
    const home = parse(readFileSync('index.html', 'utf8'));
    renderIndex(home, dict[lang]);
    applyHead(home, {
      lang, page: 'index.html',
      title: dict[lang]['meta.title'],
      description: dict[lang]['meta.description']
    });
    const ld = home.querySelector('script[type="application/ld+json"]');
    if (ld) {
      const data = JSON.parse(ld.text);
      data.inLanguage = lang;
      data.description = dict[lang]['meta.description'];
      ld.set_content(JSON.stringify(data, null, 2));
    }
    stripRuntime(home, 'index.html', lang);
    rewriteLinks(home, lang);
    writeFileSync(`${lang}/index.html`, home.toString());
    written.push(`${lang}/index.html`);

    // Guides: prune to one language.
    for (const page of GUIDES) {
      const root = parse(readFileSync(page, 'utf8'));
      renderGuide(root, lang);
      const meta = seo[page][lang];
      applyHead(root, {
        lang, page,
        title: meta.title,
        description: meta.description,
        og: { 'og:title': meta['og:title'], 'og:description': meta['og:description'] }
      });
      stripRuntime(root, page, lang);
      rewriteLinks(root, lang);
      writeFileSync(`${lang}/${page}`, root.toString());
      written.push(`${lang}/${page}`);
    }
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(buildAll().join('\n'));
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS, all suites

- [ ] **Step 5: Commit source and generated output together**

```bash
git add build.js test/build.test.js sv/ en/
git commit -m "build: generate Swedish and English page trees"
```

---

### Task 9: Point the Finnish originals at the new URLs

The Finnish pages stay hand-edited, but their switcher must navigate rather than toggle — otherwise a visitor can reach Swedish content at a Finnish URL and the cluster is undermined.

**Files:**
- Modify: `index.html` (switcher markup; remove the `i18n.js` script tag)
- Modify: `siilinhoito.html`, `siilin-pesa.html` (switcher markup; remove inline `setLang` wiring)
- Test: `test/finnish-sources.test.js`

- [ ] **Step 1: Write the failing test**

```js
// test/finnish-sources.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PAGES = {
  'index.html': '/',
  'siilinhoito.html': '/siilinhoito.html',
  'siilin-pesa.html': '/siilin-pesa.html'
};

test('Finnish pages link to their language siblings instead of toggling', () => {
  for (const [file, fiPath] of Object.entries(PAGES)) {
    const html = readFileSync(file, 'utf8');
    const slug = file === 'index.html' ? '' : file;
    assert.ok(html.includes(`href="${fiPath}"`), `${file} missing FI link`);
    assert.ok(html.includes(`href="/sv/${slug}"`), `${file} missing SV link`);
    assert.ok(html.includes(`href="/en/${slug}"`), `${file} missing EN link`);
    assert.doesNotMatch(html, /<button[^>]*class="lang-btn/, `${file} still has toggle buttons`);
  }
});

test('the homepage no longer loads i18n.js', () => {
  assert.doesNotMatch(readFileSync('index.html', 'utf8'), /src="i18n\.js/);
});

test('tietosuoja.html still uses the runtime switcher', () => {
  assert.match(readFileSync('tietosuoja.html', 'utf8'), /src="i18n\.js/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/finnish-sources.test.js`
Expected: FAIL — toggle buttons still present

- [ ] **Step 3: Edit the three Finnish pages**

In each, replace the three `<button …class="lang-btn">` elements inside `.lang-switcher` with the anchors that `switcherHtml(page, 'fi')` produces for that page, and delete the `<script src="i18n.js?v=…">` tag from `index.html`. On the guides, delete the `.lang-btn` click wiring at the bottom of the inline script but keep the rest of that script — the reveal-on-scroll observer and the mobile menu live there too.

Leave the guides' `[data-lang]` CSS, `noscript` block and hidden SV/EN spans in place: they are the build's input, and the CSS is what keeps the Finnish page Finnish.

- [ ] **Step 4: Run the full suite and rebuild**

Run: `npm test && node build.js && npm test`
Expected: PASS both times — the second run proves the generated pages still match after the source edits

- [ ] **Step 5: Commit**

```bash
git add index.html siilinhoito.html siilin-pesa.html test/finnish-sources.test.js sv/ en/
git commit -m "feat: switch Finnish pages to URL-based language navigation"
```

---

### Task 10: Sitemap, robots, and the build-freshness check

**Files:**
- Modify: `sitemap.xml`
- Modify: `robots.txt`
- Create: `.github/workflows/build-check.yml`
- Test: `test/sitemap.test.js`

- [ ] **Step 1: Write the failing test**

```js
// test/sitemap.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('sitemap lists all nine language URLs', () => {
  const xml = readFileSync('sitemap.xml', 'utf8');
  const expected = [
    'https://siilisaari.fi/', 'https://siilisaari.fi/sv/', 'https://siilisaari.fi/en/',
    'https://siilisaari.fi/siilinhoito.html', 'https://siilisaari.fi/sv/siilinhoito.html',
    'https://siilisaari.fi/en/siilinhoito.html',
    'https://siilisaari.fi/siilin-pesa.html', 'https://siilisaari.fi/sv/siilin-pesa.html',
    'https://siilisaari.fi/en/siilin-pesa.html'
  ];
  for (const url of expected) assert.ok(xml.includes(`<loc>${url}</loc>`), `${url} missing`);
});

test('robots keeps the spec directory out of the index', () => {
  assert.match(readFileSync('robots.txt', 'utf8'), /^Disallow: \/docs\//m);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sitemap.test.js`
Expected: FAIL — the six new URLs are absent

- [ ] **Step 3: Update sitemap and robots, add the workflow**

Add the six new `<url>` entries to `sitemap.xml` (keep the existing `vapaaehtoiseksi.html` and `tietosuoja.html` entries), set `lastmod` to the implementation date, and give the Swedish and English homepages priority `0.9`, the guides `0.8`.

Add to `robots.txt`, above the `Sitemap:` line:

```
# Design and planning documents — not site content.
Disallow: /docs/
```

```yaml
# .github/workflows/build-check.yml
name: build-check
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm ci
      - run: npm test
      - name: Generated pages must be up to date
        run: |
          node build.js
          if ! git diff --quiet -- sv en; then
            echo "sv/ or en/ is stale — run 'node build.js' and commit the result."
            git diff --stat -- sv en
            exit 1
          fi
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS, all suites

- [ ] **Step 5: Commit and push**

```bash
git add sitemap.xml robots.txt .github/workflows/build-check.yml test/sitemap.test.js docs/
git commit -m "chore: publish language URLs in the sitemap and guard build freshness"
git push origin main
```

---

### Task 11: Verify against the live site

Deployment is a push; Cloudflare caches HTML for 600s and assets for 14400s.

- [ ] **Step 1: Wait for GitHub Pages, then check all nine URLs return 200**

```bash
for u in "" "sv/" "en/" "siilinhoito.html" "sv/siilinhoito.html" "en/siilinhoito.html" \
         "siilin-pesa.html" "sv/siilin-pesa.html" "en/siilin-pesa.html"; do
  printf '%-28s %s\n' "/$u" "$(curl -s -o /dev/null -w '%{http_code}' "https://siilisaari.fi/$u?cb=$RANDOM")"
done
```

Expected: nine `200`s.

- [ ] **Step 2: Check per-language head signals**

```bash
for u in "sv/" "en/" "sv/siilinhoito.html" "en/siilin-pesa.html"; do
  echo "--- /$u"
  curl -s "https://siilisaari.fi/$u?cb=$RANDOM" \
    | grep -oE '<html lang="[a-z]{2}"|<title>[^<]*|rel="canonical" href="[^"]*"' | head -3
done
```

Expected: the `lang` matches the directory, the title is in that language, the canonical is self-referencing.

- [ ] **Step 3: Check hreflang reciprocity**

```bash
for u in "siilinhoito.html" "sv/siilinhoito.html" "en/siilinhoito.html"; do
  echo -n "/$u alternates: "
  curl -s "https://siilisaari.fi/$u?cb=$RANDOM" | grep -c 'rel="alternate"'
done
```

Expected: `4` for each.

- [ ] **Step 4: Check assets and internal links resolve one level down**

```bash
curl -s "https://siilisaari.fi/sv/?cb=$RANDOM" | grep -oE '(src|href)="[^"#]*"' \
  | grep -vE 'https?:|mailto:|tel:' | sort -u | head -20
```

Expected: every path starts with `/`. Spot-check two with `curl -o /dev/null -w '%{http_code}'`.

- [ ] **Step 5: Purge Cloudflare and request indexing**

Custom Purge by URL for the nine URLs plus `/sitemap.xml` (Caching → Configuration → Custom Purge → URL). Then in Search Console, submit the sitemap again and request indexing for the six new URLs — there is no API for that, so it is manual clicks.

- [ ] **Step 6: Record the outcome in memory**

Update `project_siilisaari.md` with the new URL structure, the fact that `sv/` and `en/` are generated and must never be hand-edited, and the `node build.js` step before any push that touches the three source pages.

---

## Self-Review

**Spec coverage:** URL structure → Tasks 2, 8. Head signals and hreflang → Task 2. JSON-LD `@id` and `inLanguage` → Task 8. Generator and parser choice → Tasks 1, 4, 5, 8. `seo.json` → Task 7. Internal links and asset paths → Task 3. Committed output and CI → Tasks 8, 10. Switcher and no auto-redirect → Tasks 6, 9. Verification → Task 11. `robots.txt` `Disallow: /docs/` → Task 10. All spec sections have a task.

**Placeholder scan:** No TBDs. Task 7 Step 3 is a deliberate approval gate with concrete instructions and named search terms, not a deferred decision.

**Type consistency:** `urlFor`, `hreflangBlock`, `applyHead`, `rewriteLinks`, `renderIndex`, `renderGuide`, `switcherHtml`, `stripRuntime`, `readDict`, `buildAll` — each defined once and used with the same signature in `build.js`.

## Known trade-off, carried from the spec

The Finnish guide pages keep their hidden Swedish and English spans, because those spans are the build's input and the `[data-lang]` CSS is what keeps the Finnish page Finnish. So `/siilinhoito.html` still ships roughly three times its visible text. That is the status quo rather than a regression, and Google already sees it. If it ever looks like a problem, the fix is to move the sources to `src/` and generate all three languages including Finnish — a larger change that would supersede this design's "Finnish stays hand-edited at the root" decision.
