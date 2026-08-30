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
