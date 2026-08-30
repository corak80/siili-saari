import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { readDict } from './build/dict.js';
import { applyHead } from './build/head.js';
import { rewriteLinks } from './build/links.js';
import { renderIndex } from './build/render-index.js';
import { renderGuide } from './build/render-guide.js';
import { stripRuntime } from './build/strip.js';

const OUT_LANGS = ['sv', 'en'];
const GUIDES = ['siilinhoito.html', 'siilin-pesa.html'];

// node-html-parser treats <noscript> content as opaque raw text, not a
// child element tree, so build/strip.js's DOM-based stripDeadLangCss (which
// walks root.querySelectorAll('style')) never reaches the <style> the guides
// nest inside <noscript>. That block's FI-only fallback rules
// ([data-lang]... and .lang-switcher{...}) reference machinery the generated
// page no longer has, and literally contain the string data-lang="fi" —
// which must not survive into single-language output. Strip just those two
// dead rule families here, in text form, and keep the .reveal{...} rule,
// which is still the real no-JS safety net (forces .reveal visible).
function stripNoscriptDeadLangCss(root) {
  const ns = root.querySelector('noscript');
  if (!ns) return;
  const original = ns.rawText;
  if (!original.includes('data-lang')) return;
  const stripped = original
    .replace(/\[data-lang[^\]]*\][^{]*\{[^}]*\}/g, '')
    .replace(/\.lang-switcher\{[^}]*\}/g, '');
  if (stripped !== original) ns.set_content(stripped);
}

export function buildAll() {
  const dict = readDict(readFileSync('i18n.js', 'utf8'));
  const seo = JSON.parse(readFileSync('seo.json', 'utf8'));
  const written = [];

  for (const lang of OUT_LANGS) {
    mkdirSync(lang, { recursive: true });

    // Homepage: substitute from the dictionary.
    const home = parse(readFileSync('index.html', 'utf8'));
    renderIndex(home, dict[lang]);
    applyHead(home, {
      lang, page: 'index.html',
      title: dict[lang]['meta.title'],
      description: dict[lang]['meta.description']
    });
    const ld = home.querySelector('script[type="application/ld+json"]');
    if (ld) {
      const data = JSON.parse(ld.text);
      data.inLanguage = lang;
      data.description = dict[lang]['meta.description'];
      ld.set_content(JSON.stringify(data, null, 2));
    }
    stripRuntime(home, 'index.html', lang);
    stripNoscriptDeadLangCss(home);
    rewriteLinks(home, lang);
    writeFileSync(`${lang}/index.html`, home.toString());
    written.push(`${lang}/index.html`);

    // Guides: prune to one language.
    for (const page of GUIDES) {
      const root = parse(readFileSync(page, 'utf8'));
      renderGuide(root, lang);
      const meta = seo[page][lang];
      applyHead(root, {
        lang, page,
        title: meta.title,
        description: meta.description,
        og: { 'og:title': meta['og:title'], 'og:description': meta['og:description'] }
      });
      stripRuntime(root, page, lang);
      stripNoscriptDeadLangCss(root);
      rewriteLinks(root, lang);
      writeFileSync(`${lang}/${page}`, root.toString());
      written.push(`${lang}/${page}`);
    }
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(buildAll().join('\n'));
}
