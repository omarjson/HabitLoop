import { allCompletions, listHabits } from './store.js';
import { dateKey, addDays } from './schedule.js';

const XP_PER_CHECKIN = 10;
const XP_PER_STREAK_DAY = 2;

export function xpForLevel(level) {
  // quadratic curve
  return 100 + (level - 1) * 50;
}

export function computeProgress() {
  const comps = allCompletions();
  const habits = listHabits();
  let xp = 0;
  for (const c of comps) xp += XP_PER_CHECKIN;
  // streak bonus
  for (const h of habits) {
    xp += 0; // computed separately if needed
  }
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return {
    xp,
    level,
    intoLevel: remaining,
    need: xpForLevel(level),
    pct: Math.round((remaining / xpForLevel(level)) * 100)
  };
}

export function evaluateBadges() {
  const comps = allCompletions();
  const today = dateKey(new Date());
  const last7 = new Set();
  for (let i = 0; i < 7; i++) last7.add(addDays(today, -i));
  const last7Done = comps.filter((c) => last7.has(c.date)).length;

  const badges = [
    { id: 'first', icon: '🌱', name: 'First Step', desc: 'Log your first check-in', earned: comps.length >= 1 },
    { id: 'week', icon: '🔥', name: 'Week Strong', desc: '7 check-ins in last 7 days', earned: last7Done >= 7 },
    { id: 'ten', icon: '💎', name: 'Consistent', desc: '50 total check-ins', earned: comps.length >= 50 },
    { id: 'hundred', icon: '🏆', name: 'Centurion', desc: '100 total check-ins', earned: comps.length >= 100 },
    { id: 'multi', icon: '🧬', name: 'Multitasker', desc: 'Track 5 habits', earned: listHabits().length >= 5 }
  ];
  return badges;
}

// Generate a shareable SVG streak card (returns data URL string).
export function streakCardSVG(habit, streak) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
    <rect width="400" height="200" rx="16" fill="#171a21"/>
    <text x="24" y="48" fill="#e6e9ef" font-size="22" font-family="system-ui">${habit.emoji} ${habit.name}</text>
    <text x="24" y="120" fill="#6ee7b7" font-size="64" font-weight="800" font-family="system-ui">${streak}</text>
    <text x="120" y="120" fill="#9aa3b2" font-size="20" font-family="system-ui">day streak</text>
    <text x="24" y="170" fill="#9aa3b2" font-size="14" font-family="system-ui">HabitLoop</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
