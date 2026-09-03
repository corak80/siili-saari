import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildAll } from '../build.js';

// Every page the build emits, in both output languages: the homepage, the two
// guides, and the four text subpages.
const GENERATED_PAGES = [
  'sv/index.html', 'sv/meista.html', 'sv/toiminta.html', 'sv/ajankohtaista.html', 'sv/yhteystiedot.html',
  'sv/siilinhoito.html', 'sv/siilin-pesa.html',
  'en/index.html', 'en/meista.html', 'en/toiminta.html', 'en/ajankohtaista.html', 'en/yhteystiedot.html',
  'en/siilinhoito.html', 'en/siilin-pesa.html'
];

test('buildAll writes every page in both output languages', () => {
  const written = buildAll();
  assert.equal(written.length, GENERATED_PAGES.length);
  for (const p of GENERATED_PAGES) assert.ok(existsSync(p), `${p} missing`);
});

test('generated pages are inert single-language HTML', () => {
  buildAll();
  // Fix round 1, Finding 5: was checked on sv/siilinhoito.html only; the
  // other five generated pages were unguarded.
  for (const p of GENERATED_PAGES) {
    const html = readFileSync(p, 'utf8');
    assert.doesNotMatch(html, /data-lang="/, `${p} still has data-lang`);
    assert.doesNotMatch(html, /data-i18n/, `${p} still has data-i18n`);
    assert.doesNotMatch(html, /i18n\.js/, `${p} still loads i18n.js`);
  }
  const sv = readFileSync('sv/siilinhoito.html', 'utf8');
  assert.match(sv, /<html lang="sv"/);
});

// Fix round 1, Finding 2: build/links.js only rewrites [href]/[src]
// attributes, never url() inside CSS, so a page-relative 'fonts/...' path in
// @font-face resolves one directory too deep from /sv/ and /en/ and 404s.
// The fix makes the font paths root-absolute in the Finnish sources; this
// confirms the generated pages inherit that and never emit a relative url().
test('no generated page has a relative url() in its CSS', () => {
  buildAll();
  for (const p of GENERATED_PAGES) {
    const html = readFileSync(p, 'utf8');
    // Quoted match only: a quoted url('...') / url("...") is a real CSS url()
    // invocation. This also correctly treats an SVG data: URI as ONE match
    // even when its inlined XML contains its own unquoted "url(%23n)" text
    // (an SVG fragment reference, not a CSS url() call) — a naive
    // quote-agnostic regex would misparse that nested text as a second,
    // relative url().
    const matches = html.match(/url\(('|")[\s\S]*?\1\)/g) || [];
    for (const m of matches) {
      const inner = m.replace(/^url\(['"]/, '').replace(/['"]\)$/, '');
      assert.ok(
        inner.startsWith('/') || inner.startsWith('data:') || inner.startsWith('http'),
        `${p} has a relative url(): ${m}`
      );
    }
  }
});

// Fix round 1, Finding 3: the .lang-btn anchors must still write ss-lang to
// localStorage so pages not converted to the new switcher keep honouring it.
test('generated pages persist the chosen language to localStorage', () => {
  buildAll();
  const LINE = "document.querySelectorAll('.lang-btn').forEach(b=>b.addEventListener('click',()=>{try{localStorage.setItem('ss-lang',b.getAttribute('hreflang'))}catch(e){}}));";
  for (const p of GENERATED_PAGES) {
    const html = readFileSync(p, 'utf8');
    assert.ok(html.includes(LINE), `${p} missing ss-lang persistence`);
  }
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
