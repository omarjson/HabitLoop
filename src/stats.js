import { listCompletions, allCompletions } from './store.js';
import {
  computeStreaks,
  completionRate,
  dateKey,
  addDays,
  dueCountBetween,
  isDueOn
} from './schedule.js';

export function habitStats(habit, days = 30) {
  const comps = listCompletions(habit.id);
  const { current, best } = computeStreaks(habit, comps);
  const rate = completionRate(habit, comps, days);
  return {
    current,
    best,
    rate,
    total: comps.length
  };
}

// Build a per-day intensity map (level 0..4) for heatmap over `weeks` weeks.
export function heatmapData(habit, weeks = 26) {
  const comps = listCompletions(habit.id);
  const doneSet = new Set(comps.map((c) => c.date));
  const today = dateKey(new Date());
  const start = addDays(today, -(weeks * 7 - 1));
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const k = addDays(start, i);
    if (k < dateKey(new Date(habit.createdAt))) {
      cells.push({ date: k, level: -1, due: false, done: false });
      continue;
    }
    const due = isDueOn(habit, k);
    const done = doneSet.has(k);
    let level = 0;
    if (due && done) level = 4;
    else if (due && !done && k <= today) level = 1;
    else if (due) level = 2;
    cells.push({ date: k, level, due, done });
  }
  return cells;
}

// Aggregate completion counts per ISO weekday for charts.
export function weeklyTrend(habit, days = 84) {
  const comps = listCompletions(habit.id);
  const doneSet = new Set(comps.map((c) => c.date));
  const today = dateKey(new Date());
  const buckets = [];
  for (let w = Math.floor(days / 7) - 1; w >= 0; w--) {
    const from = addDays(today, -(w * 7 + 6));
    const to = addDays(today, -w * 7);
    const due = dueCountBetween(habit, from, to);
    const done = doneSet.size
      ? comps.filter((c) => c.date >= from && c.date <= to).length
      : 0;
    buckets.push({ label: from.slice(5), due, done, rate: due ? done / due : 0 });
  }
  return buckets;
}

export function globalStats() {
  const all = allCompletions();
  return {
    totalCheckins: all.length,
    daysActive: new Set(all.map((c) => c.date)).size
  };
}
