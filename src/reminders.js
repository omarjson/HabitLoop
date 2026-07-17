import { listHabits, isDone } from './store.js';
import { isDueOn, dateKey } from './schedule.js';
import { t } from './i18n.js';

let timer = null;
const KEY = 'hl-reminders';
let enabled = localStorage.getItem(KEY) === '1';

export function remindersEnabled() {
  return enabled;
}

export function setReminders(on) {
  enabled = !!on;
  localStorage.setItem(KEY, enabled ? '1' : '0');
  if (enabled) start();
  else stop();
}

async function notifyDue() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const today = dateKey(new Date());
  const due = listHabits().filter(
    (h) => !h.archived && isDueOn(h, today) && !isDone(h.id, today)
  );
  if (due.length === 0) return;
  const names = due.map((h) => h.emoji + ' ' + h.name).join('\n');
  new Notification('HabitLoop', {
    body: `${due.length} habit(s) waiting:\n${names}`
  });
}

export function start() {
  stop();
  if (!enabled) return;
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  timer = setInterval(notifyDue, 30 * 60 * 1000); // every 30 min
  notifyDue();
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function initReminders() {
  if (enabled) start();
}
