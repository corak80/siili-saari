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
