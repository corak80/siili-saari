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
