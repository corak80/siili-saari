export const IN_SCOPE = ['index.html', 'siilinhoito.html', 'siilin-pesa.html'];

const SKIP = /^(https?:|mailto:|tel:|#|\/|data:)/i;

function rewriteValue(value, lang) {
  if (!value || SKIP.test(value)) return value;
  const [path, hash = ''] = value.split('#');
  const suffix = hash ? `#${hash}` : '';
  if (IN_SCOPE.includes(path)) {
    if (path === 'index.html') return `/${lang}/${suffix}`;
    return `/${lang}/${path}${suffix}`;
  }
  return `/${path}${suffix}`;
}

export function rewriteLinks(root, lang) {
  for (const el of root.querySelectorAll('[href]')) {
    el.setAttribute('href', rewriteValue(el.getAttribute('href'), lang));
  }
  for (const el of root.querySelectorAll('[src]')) {
    el.setAttribute('src', rewriteValue(el.getAttribute('src'), lang));
  }
}
