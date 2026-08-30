import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readDict } from '../build/dict.js';

test('readDict returns the three language tables', () => {
  const dict = readDict(readFileSync('i18n.js', 'utf8'));
  assert.deepEqual(Object.keys(dict).sort(), ['en', 'fi', 'sv']);
});

test('readDict picks up per-language metadata', () => {
  const dict = readDict(readFileSync('i18n.js', 'utf8'));
  assert.match(dict.sv['meta.title'], /Igelkottsrehabilitering/);
  assert.match(dict.en['meta.title'], /Hedgehog Rehabilitation/);
  assert.equal(typeof dict.fi['about.p1'], 'string');
});

test('readDict ignores the browser code after the object literal', () => {
  const dict = readDict(readFileSync('i18n.js', 'utf8'));
  assert.equal(dict.fi.document, undefined);
});
