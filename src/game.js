import { allCompletions, listHabits } from './store.js';
import { dateKey, addDays } from './schedule.js';
import { heatmapData } from './stats.js';

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

// Generate a shareable radial-bloom streak card as an SVG string.
export function streakCardSVG(habit, streak) {
  const cells = heatmapData(habit, 26).filter((c) => c.level >= 0);
  const size = 480;
  const cx = size / 2;
  const cy = size / 2;
  const inner = 60;
  const weeks = Math.max(1, Math.ceil(cells.length / 7));
  const step = (cx - inner - 12) / weeks;
  const start = dateKey(new Date(habit.createdAt));
  const startIdx = cells.findIndex((c) => c.date === start);

  let rings = '';
  for (let i = 1; i <= weeks; i++) {
    const r = inner + i * step;
    if (r > cx - 6) break;
    rings += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#232a39" stroke-width="0.6" opacity="0.6"/>`;
  }

  const petals = cells
    .map((c, i) => {
      const dayIdx = new Date(c.date + 'T00:00:00Z').getUTCDay();
      const weekIdx = Math.max(0, Math.floor((i - Math.max(0, startIdx)) / 7));
      const angle = (dayIdx / 7) * Math.PI * 2 - Math.PI / 2;
      const r = inner + weekIdx * step;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const rad = c.level === 4 ? 5 : c.level >= 2 ? 3.6 : 2.4;
      const fill =
        c.level === 4
          ? 'url(#g)'
          : c.level === 3
          ? '#2dd4d4'
          : c.level === 2
          ? '#7c5cff'
          : c.level === 1
          ? '#ff8a5b'
          : '#1b202d';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${fill}"/>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c5cff"/><stop offset="50%" stop-color="#2dd4d4"/><stop offset="100%" stop-color="#b6f24a"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" rx="28" fill="#0b0d12"/>
    ${rings}${petals}
    <circle cx="${cx}" cy="${cy}" r="46" fill="#0b0d12" stroke="url(#g)" stroke-width="2"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#e8ecf4" font-size="40" font-weight="700" font-family="Space Grotesk, sans-serif">${streak}</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" fill="#8a93a6" font-size="13" font-family="IBM Plex Mono, monospace">DAY STREAK</text>
    <text x="${cx}" y="${size - 22}" text-anchor="middle" fill="#8a93a6" font-size="15" font-family="Space Grotesk, sans-serif">${habit.emoji} ${escapeXml(habit.name)} · HabitLoop</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
