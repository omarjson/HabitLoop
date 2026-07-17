import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

const ROOM = 'habitloop-doc';

export const ydoc = new Y.Doc();
export const persistence = new IndexeddbPersistence(ROOM, ydoc);

export const yHabits = ydoc.getMap('habits');
export const yCompletions = ydoc.getMap('completions');

let readyResolve;
export const whenReady = new Promise((res) => (readyResolve = res));
persistence.once('synced', () => readyResolve());

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function ready() {
  await whenReady;
}

export function listHabits() {
  return Array.from(yHabits.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function getHabit(id) {
  return yHabits.get(id);
}

export function addHabit(data) {
  const id = uid();
  const habit = {
    id,
    name: data.name || 'Habit',
    emoji: data.emoji || '✅',
    color: data.color || '#6ee7b7',
    frequency: data.frequency || { type: 'daily' },
    tags: data.tags || [],
    createdAt: Date.now(),
    archived: false
  };
  yHabits.set(id, habit);
  return habit;
}

export function updateHabit(id, patch) {
  const h = yHabits.get(id);
  if (!h) return;
  yHabits.set(id, { ...h, ...patch });
}

export function deleteHabit(id) {
  yHabits.delete(id);
  // remove completions for habit
  for (const [k, v] of yCompletions.entries()) {
    if (v.habitId === id) yCompletions.delete(k);
  }
}

export function isDone(habitId, date = todayKey()) {
  return yCompletions.get(`${habitId}@${date}`)?.done === true;
}

export function getCompletion(habitId, date = todayKey()) {
  return yCompletions.get(`${habitId}@${date}`);
}

export function toggleCompletion(habitId, date = todayKey(), note = '') {
  const key = `${habitId}@${date}`;
  const existing = yCompletions.get(key);
  if (existing?.done) {
    yCompletions.delete(key);
    return false;
  }
  yCompletions.set(key, {
    habitId,
    date,
    done: true,
    note,
    ts: Date.now()
  });
  return true;
}

export function listCompletions(habitId) {
  const out = [];
  for (const v of yCompletions.values()) {
    if (v.habitId === habitId && v.done) out.push(v);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function allCompletions() {
  return Array.from(yCompletions.values());
}

export function exportData() {
  return {
    version: 1,
    habits: listHabits(),
    completions: allCompletions()
  };
}

export function importData(json) {
  if (!json?.habits) throw new Error('Invalid data');
  ydoc.transact(() => {
    for (const h of json.habits) yHabits.set(h.id, h);
    for (const c of json.completions || []) {
      yCompletions.set(`${c.habitId}@${c.date}`, c);
    }
  });
}

export function resetAll() {
  ydoc.transact(() => {
    for (const k of Array.from(yHabits.keys())) yHabits.delete(k);
    for (const k of Array.from(yCompletions.keys())) yCompletions.delete(k);
  });
}
