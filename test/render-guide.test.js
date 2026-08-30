import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import { renderGuide } from '../build/render-guide.js';

test('keeps only the target language and strips the attribute', () => {
  const root = parse(`<body>
    <h1 data-lang="fi" class="show">Hoito-opas</h1>
    <h1 data-lang="sv">Skötselguide</h1>
    <h1 data-lang="en">Care guide</h1>
  </body>`);
  renderGuide(root, 'sv');
  const heads = root.querySelectorAll('h1');
  assert.equal(heads.length, 1);
  assert.equal(heads[0].text, 'Skötselguide');
  assert.equal(heads[0].getAttribute('data-lang'), undefined);
});

test('removes the show class left over from the Finnish default', () => {
  const root = parse('<body><p data-lang="fi" class="show lead">a</p><p data-lang="sv" class="lead">b</p></body>');
  renderGuide(root, 'fi');
  assert.equal(root.querySelector('p').classNames, 'lead');
});

test('prunes block elements with nested markup intact', () => {
  const root = parse(`<body>
    <ul data-lang="sv"><li>ett</li><li>två</li></ul>
    <ul data-lang="en"><li>one</li></ul>
  </body>`);
  renderGuide(root, 'sv');
  assert.equal(root.querySelectorAll('ul').length, 1);
  assert.equal(root.querySelectorAll('li').length, 2);
});

test('leaves the language buttons for the switcher task to replace', () => {
  const root = parse('<body><button data-lang="sv" class="lang-btn">SV</button></body>');
  renderGuide(root, 'en');
  assert.equal(root.querySelectorAll('button.lang-btn').length, 1);
});

// independently derived: the guides use data-lang on p, h2, h4, ul, div,
// table AND span elements per the task brief. The brief's own tests never
// exercise a table or a plain div, and never exercise more than two
// languages competing on siblings of the same key — an off-by-one in a
// selector or a "keep the first non-fi match" bug would slip through.
test('prunes table and div elements across all three language siblings', () => {
  const root = parse(`<body>
    <table data-lang="fi" class="show"><tr><td>fi</td></tr></table>
    <table data-lang="sv"><tr><td>sv</td></tr></table>
    <table data-lang="en"><tr><td>en</td></tr></table>
    <div data-lang="fi" class="show">fi</div>
    <div data-lang="sv">sv</div>
    <div data-lang="en">en</div>
  </body>`);
  renderGuide(root, 'en');
  const tables = root.querySelectorAll('table');
  const divs = root.querySelectorAll('div');
  assert.equal(tables.length, 1);
  assert.equal(tables[0].text, 'en');
  assert.equal(divs.length, 1);
  assert.equal(divs[0].text, 'en');
  assert.equal(divs[0].getAttribute('data-lang'), undefined);
});

// independently derived: an element whose class is *only* "show" (no other
// classes) must end up with no class attribute at all after pruning, not a
// dangling empty class="" — the brief's "removes the show class" test only
// covers the case with another class ("lead") still present.
test('an element whose only class is "show" ends up with no class attribute', () => {
  const root = parse('<body><p data-lang="fi" class="show">a</p></body>');
  renderGuide(root, 'fi');
  const p = root.querySelector('p');
  assert.equal(p.classNames, '');
  assert.equal(p.getAttribute('class'), undefined);
});
