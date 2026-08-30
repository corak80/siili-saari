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
