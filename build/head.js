export const ORIGIN = 'https://siilisaari.fi';
export const LANGS = ['fi', 'sv', 'en'];

const OG_LOCALE = { fi: 'fi_FI', sv: 'sv_FI', en: 'en_GB' };

export function urlFor(page, lang) {
  const prefix = lang === 'fi' ? '' : `/${lang}`;
  if (page === 'index.html') return `${ORIGIN}${prefix}/`;
  return `${ORIGIN}${prefix}/${page}`;
}

export function hreflangBlock(page) {
  const rows = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${urlFor(page, l)}">`
  );
  rows.push(`<link rel="alternate" hreflang="x-default" href="${urlFor(page, 'fi')}">`);
  return rows.join('\n');
}

export function applyHead(root, { lang, page, title, description, og }) {
  root.querySelector('html').setAttribute('lang', lang);

  const titleEl = root.querySelector('title');
  if (titleEl) titleEl.set_content(title);

  const desc = root.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', description);

  const canonical = root.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', urlFor(page, lang));

  const locale = root.querySelector('meta[property="og:locale"]');
  if (locale) locale.setAttribute('content', OG_LOCALE[lang]);

  const ogUrl = root.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('href', urlFor(page, lang));

  for (const [prop, value] of Object.entries(og || {})) {
    const el = root.querySelector(`meta[property="${prop}"]`);
    if (el) el.setAttribute('content', value);
  }

  root.querySelectorAll('link[rel="alternate"]').forEach((el) => el.remove());
  root.querySelector('head').insertAdjacentHTML('beforeend', '\n' + hreflangBlock(page) + '\n');
}
