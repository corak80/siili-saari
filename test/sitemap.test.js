import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('sitemap lists every page in every language', () => {
  const xml = readFileSync('sitemap.xml', 'utf8');
  const pages = ['siilinhoito.html', 'siilin-pesa.html',
                 'meista.html', 'toiminta.html', 'ajankohtaista.html', 'yhteystiedot.html'];
  const expected = ['https://siilisaari.fi/', 'https://siilisaari.fi/sv/', 'https://siilisaari.fi/en/'];
  for (const page of pages) {
    for (const prefix of ['', 'sv/', 'en/']) {
      expected.push(`https://siilisaari.fi/${prefix}${page}`);
    }
  }
  for (const url of expected) assert.ok(xml.includes(`<loc>${url}</loc>`), `${url} missing`);
});

test('robots keeps the spec directory out of the index', () => {
  assert.match(readFileSync('robots.txt', 'utf8'), /^Disallow: \/docs\//m);
});
