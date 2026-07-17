import en from '../i18n/en.json' with { type: 'json' };
import ar from '../i18n/ar.json' with { type: 'json' };

const dicts = { en, ar };
const listeners = new Set();

let current = localStorage.getItem('hl-lang') || 'en';

export function getLang() {
  return current;
}

export function t(key) {
  return dicts[current][key] ?? dicts.en[key] ?? key;
}

export function setLang(lang) {
  if (!dicts[lang]) return;
  current = lang;
  localStorage.setItem('hl-lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function toggleLang() {
  setLang(current === 'en' ? 'ar' : 'en');
}

export function initLang() {
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
}
