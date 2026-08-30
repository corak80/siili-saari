// i18n.js is a browser script: `const I18N = {…}` followed by DOM code.
// Slice out just the object literal and evaluate it in isolation.
export function readDict(i18nSource) {
  const start = i18nSource.indexOf('const I18N = {');
  if (start === -1) throw new Error('I18N declaration not found in i18n.js');
  const open = i18nSource.indexOf('{', start);
  const close = i18nSource.indexOf('\n};', open);
  if (close === -1) throw new Error('end of I18N object literal not found');
  const literal = i18nSource.slice(open, close + 2);
  return Function(`"use strict"; return (${literal});`)();
}
