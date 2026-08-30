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

// Fix round 1, Finding 1: the FI pages are the ones that currently rank, so
// hreflang on the generated sv/en pages is worthless to Google unless the FI
// originals reciprocate with the same four annotations.
test('Finnish pages carry reciprocal hreflang annotations', () => {
  const EXPECTED = {
    'index.html': [
      'https://siilisaari.fi/',
      'https://siilisaari.fi/sv/',
      'https://siilisaari.fi/en/'
    ],
    'siilinhoito.html': [
      'https://siilisaari.fi/siilinhoito.html',
      'https://siilisaari.fi/sv/siilinhoito.html',
      'https://siilisaari.fi/en/siilinhoito.html'
    ],
    'siilin-pesa.html': [
      'https://siilisaari.fi/siilin-pesa.html',
      'https://siilisaari.fi/sv/siilin-pesa.html',
      'https://siilisaari.fi/en/siilin-pesa.html'
    ]
  };
  for (const [file, [fi, sv, en]] of Object.entries(EXPECTED)) {
    const html = readFileSync(file, 'utf8');
    assert.ok(html.includes(`<link rel="alternate" hreflang="fi" href="${fi}">`), `${file} missing fi hreflang`);
    assert.ok(html.includes(`<link rel="alternate" hreflang="sv" href="${sv}">`), `${file} missing sv hreflang`);
    assert.ok(html.includes(`<link rel="alternate" hreflang="en" href="${en}">`), `${file} missing en hreflang`);
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${fi}">`), `${file} missing x-default hreflang`);
  }
});

// Fix round 1, Finding 3: the .lang-btn anchors must still write ss-lang to
// localStorage so pages not converted to the new switcher (vapaaehtoiseksi,
// tietosuoja, the volunteer pipeline pages) keep honouring the preference.
test('Finnish pages persist the chosen language to localStorage', () => {
  const LINE = "document.querySelectorAll('.lang-btn').forEach(b=>b.addEventListener('click',()=>{try{localStorage.setItem('ss-lang',b.getAttribute('hreflang'))}catch(e){}}));";
  for (const file of Object.keys(PAGES)) {
    const html = readFileSync(file, 'utf8');
    assert.ok(html.includes(LINE), `${file} missing ss-lang persistence`);
  }
});
