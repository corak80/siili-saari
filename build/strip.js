import { urlFor, LANGS } from './head.js';

const LABEL = { fi: 'FI', sv: 'SV', en: 'EN' };

export function switcherHtml(page, lang) {
  return LANGS.map((l) => {
    const href = new URL(urlFor(page, l)).pathname;
    const cls = l === lang ? 'lang-btn active' : 'lang-btn';
    return `<a href="${href}" hreflang="${l}" class="${cls}">${LABEL[l]}</a>`;
  }).join('\n    ');
}

const LANG_MACHINERY = /function\s+setLang|applyLang\(/;
const HAS_OBSERVER = /IntersectionObserver/;

// Ruling B: siilinhoito.html and siilin-pesa.html each have exactly one
// inline <script>, and it holds BOTH the language switcher (setLang) AND the
// reveal IntersectionObserver. Because .reveal starts at opacity:0, deleting
// that script wholesale would ship a blank page. When a script mixes both,
// keep the script but reduce it to this observer-only body — verified
// byte-identical to what both guides already ship.
const OBSERVER_ONLY =
  `  const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.08});\n` +
  `  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));`;

export function stripRuntime(root, page, lang) {
  for (const s of root.querySelectorAll('script')) {
    const src = s.getAttribute('src') || '';
    if (src.includes('i18n.js')) {
      s.remove();
      continue;
    }
    const text = s.text;
    if (!LANG_MACHINERY.test(text)) continue;
    if (HAS_OBSERVER.test(text)) {
      s.set_content(OBSERVER_ONLY);
    } else {
      s.remove();
    }
  }

  // Ruling B: noscript blocks are NOT removed — the guides' noscript block
  // forces .reveal visible when JS is off, which is the safety net that
  // keeps generated pages readable without a script.

  const switcher = root.querySelector('.lang-switcher');
  if (switcher) switcher.set_content('\n    ' + switcherHtml(page, lang) + '\n  ');
}
