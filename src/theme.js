const KEY = 'hl-theme';
let current = localStorage.getItem(KEY) || 'dark';

export function getTheme() {
  return current;
}

export function applyTheme() {
  document.documentElement.setAttribute('data-theme', current);
}

export function toggleTheme() {
  current = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(KEY, current);
  applyTheme();
}

export function initTheme() {
  applyTheme();
}
