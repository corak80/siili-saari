// The guides hold all three languages inline. Keep one, drop the others, and
// remove the attribute and the .show class so nothing can hide what remains.
export function renderGuide(root, lang) {
  for (const el of root.querySelectorAll('[data-lang]')) {
    if (el.classList.contains('lang-btn')) continue;
    if (el.getAttribute('data-lang') === lang) {
      el.removeAttribute('data-lang');
      el.classList.remove('show');
      if (el.classNames === '') el.removeAttribute('class');
    } else {
      el.remove();
    }
  }
}
