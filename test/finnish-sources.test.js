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
