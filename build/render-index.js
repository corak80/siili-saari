// Build-time equivalent of applyLang() in i18n.js. A missing key is a build
// failure rather than a silently Finnish paragraph on a Swedish page.
//
// Ruling A: only the data-i18n-html="true" branch may insert raw markup. The
// plain-text branch HTML-escapes its value first (escaping & before < and >)
// so a translation containing "<", ">" or "&" renders as literal text instead
// of being parsed as markup.
export function renderIndex(root, dict) {
  const missing = [];
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    const value = dict[key];
    if (value == null) { missing.push(key); continue; }
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) {
      el.setAttribute(attr, value);
    } else if (el.getAttribute('data-i18n-html') === 'true') {
      el.set_content(value);
    } else {
      el.set_content(escapeHtml(value));
    }
    el.removeAttribute('data-i18n');
    el.removeAttribute('data-i18n-attr');
    el.removeAttribute('data-i18n-html');
  }
  if (missing.length) {
    throw new Error(`missing translations: ${[...new Set(missing)].join(', ')}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
