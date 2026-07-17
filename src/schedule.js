const DAY_MS = 86400000;

export function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(key, n) {
  return dateKey(new Date(parseKey(key).getTime() + n * DAY_MS));
}

// Returns whether a habit is "due" on a given date based on its frequency rule.
export function isDueOn(habit, key) {
  const f = habit.frequency || { type: 'daily' };
  const created = dateKey(new Date(habit.createdAt));
  if (key < created) return false;
  const day = parseKey(key).getUTCDay(); // 0 Sun .. 6 Sat

  switch (f.type) {
    case 'daily':
      return true;
    case 'everyN': {
      const n = Math.max(1, f.n || 1);
      const offset = Math.floor(
        (parseKey(key) - parseKey(created)) / DAY_MS
      );
      return offset % n === 0;
    }
    case 'weekly': {
      // X times per week -> due on first X weekdays (Mon..Fri then weekend)
      const order = [1, 2, 3, 4, 5, 6, 0];
      const x = Math.min(7, Math.max(1, f.x || 1));
      return order.indexOf(day) < x;
    }
    case 'monthly': {
      const x = Math.min(28, Math.max(1, f.x || 1));
      const date = parseKey(key).getUTCDate();
      return date <= x;
    }
    case 'custom': {
      const days = f.days || []; // [0..6]
      return days.includes(day);
    }
    default:
      return true;
  }
}

// Count how many times a habit was due between two date keys (inclusive).
export function dueCountBetween(habit, fromKey, toKey) {
  let count = 0;
  let k = fromKey;
  while (k <= toKey) {
    if (isDueOn(habit, k)) count++;
    k = addDays(k, 1);
  }
  return count;
}

// Compute current and best streak (consecutive due-days completed).
export function computeStreaks(habit, completions) {
  const done = new Set(completions.map((c) => c.date));
  let current = 0;
  let best = 0;
  let run = 0;

  const today = dateKey(new Date());
  // walk backward from today
  let k = today;
  while (isDueOn(habit, k)) {
    if (done.has(k)) {
      current++;
      run++;
      best = Math.max(best, run);
    } else {
      break;
    }
    k = addDays(k, -1);
  }

  // best full scan since creation
  const created = dateKey(new Date(habit.createdAt));
  let scan = created;
  let r2 = 0;
  while (scan <= today) {
    if (isDueOn(habit, scan)) {
      if (done.has(scan)) {
        r2++;
        best = Math.max(best, r2);
      } else {
        r2 = 0;
      }
    }
    scan = addDays(scan, 1);
  }

  return { current, best };
}

// Completion rate over last `days` days (only due days counted).
export function completionRate(habit, completions, days = 30) {
  const today = dateKey(new Date());
  const from = addDays(today, -(days - 1));
  const due = dueCountBetween(habit, from, today);
  if (due === 0) return 0;
  const done = completions.filter(
    (c) => c.date >= from && c.date <= today
  ).length;
  return Math.round((done / due) * 100);
}
