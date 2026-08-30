import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import { renderIndex } from '../build/render-index.js';

const dict = {
  'about.title': 'Där natur möter omsorg',
  'about.p1': 'Vi <em>räddar</em> igelkottar.',
  'meta.description': 'Beskrivning',
  'about.raw': 'Katt & <hund>',
  'about.empty': ''
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

// Ruling A: a plain-text (non data-i18n-html) value containing HTML-sensitive
// characters must be escaped, not parsed as markup. Only data-i18n-html="true"
// may insert raw markup.
test('plain-text values containing < and & are escaped, not parsed as markup', () => {
  const root = parse('<body><p data-i18n="about.raw">vanha</p></body>');
  renderIndex(root, dict);
  const p = root.querySelector('p');
  assert.equal(p.querySelector('hund'), null);
  assert.equal(p.text, 'Katt & <hund>');
  assert.match(p.innerHTML, /Katt &amp; &lt;hund&gt;/);
});

// independently derived: the brief's own tests never assert that a key
// present in the dictionary but genuinely empty ("") is a legitimate value
// rather than a missing translation. The implementation's null-check
// (`value == null`) must treat '' as present, not missing.
test('an empty-string dictionary value is applied, not treated as missing', () => {
  const root = parse('<body><p data-i18n="about.empty">Suomeksi</p></body>');
  renderIndex(root, dict);
  assert.equal(root.querySelector('p').text, '');
});

// independently derived: renderIndex must walk every matching element, not
// just the first one found for a given key — the same translation key can
// legitimately appear on more than one element on the homepage.
test('every element sharing the same key is substituted, not just the first', () => {
  const root = parse(`<body>
    <h2 data-i18n="about.title">a</h2>
    <span data-i18n="about.title">b</span>
  </body>`);
  renderIndex(root, dict);
  const els = root.querySelectorAll('[data-i18n], h2, span');
  assert.equal(root.querySelector('h2').text, 'Där natur möter omsorg');
  assert.equal(root.querySelector('span').text, 'Där natur möter omsorg');
});
