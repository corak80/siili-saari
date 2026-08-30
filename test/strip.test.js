import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { switcherHtml, stripRuntime } from '../build/strip.js';

// The exact observer-only body a mixed script (language switcher +
// IntersectionObserver in one <script> tag, as found in siilinhoito.html and
// siilin-pesa.html) must be reduced to. Byte-identical per Ruling B.
const OBSERVER_ONLY =
  `  const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.08});\n` +
  `  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));`;

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

// Ruling B: a language-only inline script (no IntersectionObserver) is
// removed entirely, while an unrelated script survives untouched.
test('stripRuntime removes a language-only inline script but keeps other scripts', () => {
  const root = parse(`<body>
    <script>function setLang(l){ document.documentElement.lang = l; }</script>
    <script>console.log('reveal observer');</script>
  </body>`);
  stripRuntime(root, 'siilinhoito.html', 'sv');
  const scripts = root.querySelectorAll('script');
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].text, /reveal observer/);
});

// Ruling B (CRITICAL): the guides' single <script> tag carries BOTH the
// language switcher AND the reveal IntersectionObserver. Removing it
// wholesale would leave every .reveal element at opacity:0 forever, i.e. a
// blank page. stripRuntime must keep the script but reduce its content to
// the observer-only body, byte-identical to what ships in the real guides.
test('stripRuntime keeps a mixed setLang+observer script but strips setLang, byte-identical', () => {
  const root = parse(`<body>
    <script>
  const buttons = document.querySelectorAll('.lang-btn');
  function setLang(lang){
    document.documentElement.lang = lang;
    try{localStorage.setItem('ss-lang',lang)}catch(e){}
    document.querySelectorAll('[data-lang]:not(.lang-btn)').forEach(el=>{
      el.classList.toggle('show', el.getAttribute('data-lang')===lang);
    });
    buttons.forEach(b=>b.classList.toggle('active', b.dataset.lang===lang));
  }
  buttons.forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
  var _s=(function(){try{return localStorage.getItem('ss-lang')}catch(e){return null}})();
  setLang((_s==='sv'||_s==='en'||_s==='fi')?_s:'fi');

  const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
</script>
  </body>`);
  stripRuntime(root, 'siilinhoito.html', 'sv');
  const scripts = root.querySelectorAll('script');
  assert.equal(scripts.length, 1, 'the mixed script must survive, not be removed');
  assert.doesNotMatch(scripts[0].text, /setLang/);
  assert.equal(scripts[0].text, OBSERVER_ONLY);
});

// Ruling B: do NOT remove noscript blocks — they are the safety net that
// forces .reveal visible when JS is off. Replaces the brief's
// noscript-removal test.
test('stripRuntime leaves noscript blocks in place', () => {
  const root = parse('<head><noscript><style>[data-lang]{display:none}</style></noscript></head>');
  stripRuntime(root, 'siilinhoito.html', 'en');
  assert.equal(root.querySelectorAll('noscript').length, 1);
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

// independently derived: switcherHtml's own stated purpose is "one link per
// language, in a stable order, with exactly one marked active." The brief's
// tests only ever probe individual hrefs with regex; none of them assert the
// output order follows LANGS (fi, sv, en) or that the two non-active
// languages get the plain "lang-btn" class rather than "lang-btn active".
test('switcher lists all three languages in fi, sv, en order with only the active one marked', () => {
  const html = switcherHtml('siilin-pesa.html', 'en');
  const fiIndex = html.indexOf('>FI<');
  const svIndex = html.indexOf('>SV<');
  const enIndex = html.indexOf('>EN<');
  assert.ok(fiIndex < svIndex && svIndex < enIndex, 'expected fi, sv, en order');
  const activeCount = (html.match(/lang-btn active/g) || []).length;
  assert.equal(activeCount, 1);
  assert.match(html, /href="\/siilin-pesa\.html" hreflang="fi" class="lang-btn">FI</);
  assert.match(html, /href="\/sv\/siilin-pesa\.html" hreflang="sv" class="lang-btn">SV</);
});

// independently derived: stripRuntime's stated purpose is to make generated
// pages inert — no i18n.js, no inline language machinery. A script that
// contains neither i18n.js src nor the setLang/applyLang pattern (e.g. the
// homepage's navbar/mobile-menu/reveal script, which does use
// IntersectionObserver but never touches setLang) must be left completely
// untouched, content and all.
test('a script with an IntersectionObserver but no language machinery is left untouched', () => {
  const root = parse(`<body><script>
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
</script></body>`);
  const before = root.querySelector('script').text;
  stripRuntime(root, 'index.html', 'sv');
  const scripts = root.querySelectorAll('script');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].text, before);
});

// Fix round 1, Finding 1: the task-6 brief required generated pages to have
// "no [data-lang] CSS". Ruling B only overrode the noscript part of that
// sentence; these two rules still sit in the guides' main <style> block and
// must be stripped by stripRuntime, matched by content (not line number),
// leaving every other rule in the same <style> block byte-identical.
test('stripRuntime removes the dead [data-lang] CSS rules but leaves unrelated CSS untouched', () => {
  const root = parse(`<head><style>
body{margin:0}
.reveal{opacity:0;transform:translateY(18px)}
.reveal.in{opacity:1;transform:none}

[data-lang]:not(.lang-btn){display:none}
[data-lang]:not(.lang-btn).show{display:revert}
</style></head>`);
  stripRuntime(root, 'siilinhoito.html', 'sv');
  const styleText = root.querySelector('style').text;
  assert.doesNotMatch(styleText, /\[data-lang\]/);
  assert.match(styleText, /body\{margin:0\}/);
  assert.match(styleText, /\.reveal\{opacity:0;transform:translateY\(18px\)\}/);
  assert.match(styleText, /\.reveal\.in\{opacity:1;transform:none\}/);
});

test('stripRuntime is a no-op on a <style> block with no [data-lang] rules', () => {
  const root = parse('<head><style>body{margin:0}.reveal{opacity:0}</style></head>');
  const before = root.querySelector('style').text;
  stripRuntime(root, 'index.html', 'en');
  assert.equal(root.querySelector('style').text, before);
});

// Fix round 1, Finding 2 — drift guard: OBSERVER_ONLY in build/strip.js is a
// hardcoded literal, verified byte-identical against the real guides at the
// time this was written. If someone later edits the observer in the source
// guides without updating build/strip.js, the build would silently keep
// emitting stale JavaScript. Reading the real files here makes that drift
// fail loudly instead.
// drift guard
test('the real siilinhoito.html and siilin-pesa.html still contain the observer body verbatim', () => {
  const siilinhoito = readFileSync(new URL('../siilinhoito.html', import.meta.url), 'utf8');
  const siilinPesa = readFileSync(new URL('../siilin-pesa.html', import.meta.url), 'utf8');
  assert.ok(siilinhoito.includes(OBSERVER_ONLY), 'siilinhoito.html no longer contains OBSERVER_ONLY verbatim');
  assert.ok(siilinPesa.includes(OBSERVER_ONLY), 'siilin-pesa.html no longer contains OBSERVER_ONLY verbatim');
});
