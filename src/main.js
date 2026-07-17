import { initLang, toggleLang, getLang } from './i18n.js';
import { initTheme, toggleTheme, getTheme } from './theme.js';
import { ready } from './store.js';
import { initUI, setView, render } from './ui.js';
import { connect, onSyncStatus } from './sync.js';
import { initReminders } from './reminders.js';
import { t } from './i18n.js';

async function main() {
  initLang();
  initTheme();

  // nav
  document.querySelectorAll('.nav-btn').forEach((b) =>
    b.addEventListener('click', () => setView(b.dataset.view))
  );
  // header buttons
  document.getElementById('theme-toggle').addEventListener('click', () => {
    toggleTheme();
    document.getElementById('theme-toggle').textContent = getTheme() === 'dark' ? '◑' : '◐';
  });
  document.getElementById('lang-toggle').addEventListener('click', () => {
    toggleLang();
    document.getElementById('lang-toggle').textContent = getLang().toUpperCase();
  });

  // sync status pill
  const pill = document.getElementById('sync-status');
  onSyncStatus((connected) => {
    pill.textContent = connected ? t('sync.online') : t('sync.offline');
    pill.classList.toggle('online', connected);
  });

  // wait for IndexedDB persistence
  await ready();
  initUI();
  render();

  // optional P2P sync
  connect();
  initReminders();

  // register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./src/sw.js').catch(() => {});
  }
}

main();
