import { t, onLangChange } from './i18n.js';
import {
  listHabits,
  addHabit,
  updateHabit,
  deleteHabit,
  toggleCompletion,
  getHabit,
  exportData,
  importData,
  resetAll,
  isDone
} from './store.js';
import { isDueOn, dateKey } from './schedule.js';
import { habitStats, heatmapData, weeklyTrend, globalStats } from './stats.js';
import { computeProgress, evaluateBadges, streakCardSVG } from './game.js';
import { analyzeSentiment, correlations } from './insights.js';
import { getRoom, setRoom } from './sync.js';
import { remindersEnabled, setReminders } from './reminders.js';
import { toggleTheme, getTheme } from './theme.js';

const root = () => document.getElementById('view-root');

let currentView = 'today';
const EMOJIS = ['✅', '🏃', '📚', '💧', '🧘', '💪', '🌙', '🥗', '✍️', '🎯', '🎸', '🧹'];

export function setView(v) {
  currentView = v;
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.view === v));
  });
  render();
}

export function render() {
  const r = root();
  if (currentView === 'today') r.innerHTML = renderToday();
  else if (currentView === 'stats') r.innerHTML = renderStats();
  else if (currentView === 'insights') r.innerHTML = renderInsights();
  else if (currentView === 'settings') r.innerHTML = renderSettings();
  bindView();
  // replay load animation only once per view mount
  r.querySelector('.view.enter')?.addEventListener('animationend', (e) => {
    if (e.target.classList.contains('loop-row')) r.querySelector('.view')?.classList.remove('enter');
  }, { once: true });
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

/* ---------- TODAY ---------- */
const R = 32;
const CIRC = 2 * Math.PI * R;

function loopRing(h, done, due) {
  const offset = done ? 0 : CIRC; // filled when done
  const cls = `loop ${done ? 'done' : ''} ${due && !done ? 'due' : ''}`;
  return `<div class="${cls}">
    <svg width="76" height="76" viewBox="0 0 76 76">
      <circle class="track" cx="38" cy="38" r="${R}"></circle>
      <circle class="prog" cx="38" cy="38" r="${R}"
        stroke-dasharray="${CIRC}" stroke-dashoffset="${offset}"></circle>
    </svg>
    <div class="center">
      <button class="check" data-act="toggle" data-id="${h.id}"
        aria-label="${done ? t('habit.undo') : t('habit.done')}">${done ? '✓' : h.emoji}</button>
    </div>
  </div>`;
}

function renderToday() {
  const habits = listHabits().filter((h) => !h.archived);
  const today = dateKey(new Date());
  if (habits.length === 0) {
    return `<div class="card empty">
      <div class="lead">Nothing to loop yet.</div>
      <div>Pick one rhythm you want to keep. We'll close the ring when you do it.</div>
      <div style="margin-top:18px"><button class="primary" id="add-first">${t('today.add')}</button></div>
    </div>`;
  }
  const rows = habits
    .map((h) => {
      const due = isDueOn(h, today);
      const done = isDone(h.id, today);
      const tags = (h.tags || [])
        .map((tag) => `<span class="tag">#${tag}</span>`)
        .join('');
      const meta = due
        ? done
          ? `<span class="done">loop closed</span>`
          : `<span class="due">open · due today</span>`
        : `<span>${t('freq.' + h.frequency.type)}</span>`;
      return `<div class="loop-row" data-id="${h.id}">
        ${loopRing(h, done, due)}
        <div class="habit-info">
          <div class="habit-name">${escapeHtml(h.name)}</div>
          <div class="habit-meta">${meta}</div>
          <div class="habit-tags">${tags}</div>
        </div>
        <div class="row-actions">
          <button class="ghost" data-act="edit" data-id="${h.id}" aria-label="${t('habit.edit')}">✎</button>
        </div>
      </div>`;
    })
    .join('');
  return `<div class="view enter"><div>${rows}</div>
    <div class="flex spread"><span class="muted">${dateKey(new Date())}</span>
    <button class="primary" id="add-habit">+ ${t('today.add')}</button></div></div>`;
}

/* ---------- STATS ---------- */
function renderStats() {
  const habits = listHabits().filter((h) => !h.archived);
  const g = globalStats();
  const cards = habits
    .map((h) => {
      const s = habitStats(h);
      return `<div class="card">
        <div class="flex spread"><div class="habit-name">${h.emoji} ${escapeHtml(h.name)}</div></div>
        <div class="stats-grid" style="margin-top:12px">
          <div class="stat"><div class="num">${s.current}</div><div class="lbl">${t('stats.streak')}</div></div>
          <div class="stat"><div class="num">${s.best}</div><div class="lbl">${t('stats.best')}</div></div>
          <div class="stat"><div class="num">${s.rate}%</div><div class="lbl">${t('stats.rate')}</div></div>
          <div class="stat"><div class="num">${s.total}</div><div class="lbl">${t('stats.total')}</div></div>
        </div>
        <div style="margin-top:12px">${heatmapSVG(heatmapData(h))}</div>
        <div style="margin-top:12px">${barChart(weeklyTrend(h))}</div>
      </div>`;
    })
    .join('');
  return `<div class="view"><div class="card"><div class="stats-grid">
    <div class="stat"><div class="num">${g.totalCheckins}</div><div class="lbl">Total check-ins</div></div>
    <div class="stat"><div class="num">${g.daysActive}</div><div class="lbl">Active days</div></div>
  </div></div>${cards || '<div class="card empty">No habits</div>'}</div>`;
}

function heatmapSVG(cells) {
  const valid = cells.filter((c) => c.level >= 0);
  if (valid.length === 0) return '<p class="muted">No history yet.</p>';
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const inner = 26;
  const ringStep = (cx - inner - 10) / Math.max(1, weeksOf(cells));
  const petals = valid
    .map((c) => {
      const dayIdx = new Date(c.date + 'T00:00:00Z').getUTCDay(); // 0..6
      const weekIdx = Math.floor(dayIndexFromStart(cells, c.date) / 7);
      const angle = (dayIdx / 7) * Math.PI * 2 - Math.PI / 2;
      const r = inner + weekIdx * ringStep;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const rad = c.level === 4 ? 4.2 : c.level >= 2 ? 3.2 : 2.2;
      const fill =
        c.level === 4
          ? 'url(#loopGrad)'
          : c.level === 3
          ? 'var(--cyan)'
          : c.level === 2
          ? 'var(--violet)'
          : c.level === 1
          ? 'var(--warn)'
          : 'var(--panel-2)';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${fill}"><title>${c.date}</title></circle>`;
    })
    .join('');
  // faint orbit rings
  let rings = '';
  const n = weeksOf(cells);
  for (let i = 1; i <= n; i++) {
    const r = inner + i * ringStep;
    if (r > cx - 6) break;
    rings += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="var(--line)" stroke-width="0.5" opacity="0.5" />`;
  }
  return `<div class="heatmap radial"><svg viewBox="0 0 ${size} ${size}" width="240" height="240">${rings}${petals}<circle cx="${cx}" cy="${cy}" r="6" fill="url(#loopGrad)" /></svg></div>`;
}

function weeksOf(cells) {
  return Math.ceil(cells.filter((c) => c.level >= 0).length / 7);
}
function dayIndexFromStart(cells, date) {
  return cells.findIndex((c) => c.date === date);
}

function barChart(buckets) {
  const max = Math.max(1, ...buckets.map((b) => b.due));
  const w = 100;
  const h = 40;
  const bw = w / buckets.length;
  const bars = buckets
    .map((b, i) => {
      const bh = (b.done / max) * h;
      return `<rect class="bar" x="${i * bw}" y="${h - bh}" width="${bw * 0.7}" height="${bh}" rx="1"><title>${b.label}: ${b.done}/${b.due}</title></rect>`;
    })
    .join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h + 10}" preserveAspectRatio="none">${bars}</svg>`;
}

/* ---------- INSIGHTS ---------- */
function renderInsights() {
  return `<div class="view"><div class="card">
    <button class="primary" id="run-insights">${t('insights.run')}</button>
    <div id="insight-out" style="margin-top:14px"></div>
  </div></div>`;
}

async function runInsights() {
  const out = document.getElementById('insight-out');
  out.innerHTML = `<p class="muted">${t('insights.loading')}</p>`;
  try {
    const [sent, corr] = await Promise.all([analyzeSentiment(), Promise.resolve(correlations())]);
    const mood = sent.score > 0.2 ? '😊 Positive' : sent.score < -0.2 ? '😟 Negative' : '😐 Neutral';
    const corrHtml = corr.length
      ? corr
          .map((c) => `<div class="badge">${escapeHtml(c.a)} ↔ ${escapeHtml(c.b)} · ${c.coef}% (${c.days}d)</div>`)
          .join(' ')
      : '<p class="muted">Not enough data yet.</p>';
    out.innerHTML = `<h3>${t('insights.sentiment')}</h3>
      <p class="stat"><span class="num">${mood}</span></p>
      <p class="muted">From ${sent.count} notes</p>
      <h3 style="margin-top:16px">${t('insights.correlation')}</h3>
      <div class="wrap" style="gap:8px">${corrHtml}</div>`;
  } catch (e) {
    out.innerHTML = `<p class="muted">Model failed to load (offline?). ${e.message}</p>`;
  }
}

/* ---------- SETTINGS ---------- */
function renderSettings() {
  const prog = computeProgress();
  const badges = evaluateBadges();
  const badgesHtml = badges
    .map(
      (b) =>
        `<span class="badge ${b.earned ? '' : 'locked'}">${b.icon} ${t(b.name ? 'game.badges' : 'game.badges')} ${b.name}${b.earned ? '' : ' 🔒'}</span>`
    )
    .join(' ');
  const themeLabel = getTheme() === 'dark' ? 'Dark' : 'Light';
  return `<div class="view">
    <div class="card">
      <h3>${t('game.level')} ${prog.level}</h3>
      <div class="level-bar"><span style="width:${prog.pct}%"></span></div>
      <p class="muted">${prog.intoLevel}/${prog.need} XP · total ${prog.xp}</p>
      <h3 style="margin-top:14px">${t('game.badges')}</h3>
      <div class="wrap" style="gap:8px;margin-top:8px">${badgesHtml}</div>
    </div>
    <div class="card">
      <h3>Streak card</h3>
      <p class="muted">Share your longest-running loop as a radial bloom.</p>
      <div id="card-preview" style="display:flex;justify-content:center;margin:12px 0"></div>
      <div class="flex spread wrap">
        <button class="ghost" id="card-prev">‹ Prev</button>
        <button class="primary" id="card-share">Download PNG</button>
        <button class="ghost" id="card-next">Next ›</button>
      </div>
    </div>
    <div class="card">
      <div class="field"><label>${t('settings.theme')}</label>
        <button class="ghost" id="theme-btn">${themeLabel}</button></div>
      <div class="field"><label>${t('settings.reminders')}</label>
        <button class="ghost" id="rem-btn">${remindersEnabled() ? 'On' : 'Off'}</button></div>
      <div class="field"><label>${t('settings.sync')}</label>
        <div class="flex"><input id="room-input" value="${getRoom()}" />
        <button class="primary" id="room-save">Save</button></div>
        <p class="muted">Share this room ID with another device to sync (peer-to-peer).</p></div>
      <div class="field"><label>Data</label>
        <div class="flex wrap">
          <button class="ghost" id="export-btn">${t('settings.export')}</button>
          <button class="ghost" id="import-btn">${t('settings.import')}</button>
          <button class="ghost" id="reset-btn" style="color:var(--danger)">${t('settings.reset')}</button>
        </div>
        <input type="file" id="import-file" accept="application/json" hidden />
      </div>
    </div>
  </div>`;
}

/* ---------- STREAK CARD ---------- */
let cardIdx = 0;
function cardHabits() {
  return listHabits()
    .filter((h) => !h.archived)
    .map((h) => ({ h, s: habitStats(h).current }))
    .sort((a, b) => b.s - a.s);
}
function renderCardPreview() {
  const wrap = document.getElementById('card-preview');
  if (!wrap) return;
  const list = cardHabits();
  if (list.length === 0) {
    wrap.innerHTML = '<p class="muted">No habits yet.</p>';
    return;
  }
  cardIdx = Math.min(cardIdx, list.length - 1);
  const { h, s } = list[cardIdx];
  wrap.innerHTML = `<img src="${streakCardSVG(h, s)}" width="220" height="220" alt="streak card" style="border-radius:18px;box-shadow:var(--shadow)" />`;
  const label = document.createElement('p');
  label.className = 'muted';
  label.style.textAlign = 'center';
  label.textContent = `${h.emoji} ${h.name} · ${s}-day streak (${cardIdx + 1}/${list.length})`;
  wrap.appendChild(label);
}
function downloadCard() {
  const list = cardHabits();
  if (!list.length) return;
  const { h, s } = list[cardIdx];
  const a = document.createElement('a');
  a.href = streakCardSVG(h, s);
  a.download = `habitloop-${h.name}-streak.svg`;
  a.click();
}

/* ---------- HABIT FORM MODAL ---------- */
function openHabitModal(id) {
  const h = id ? getHabit(id) : null;
  const freq = h?.frequency || { type: 'daily' };
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Habit form">
    <h2>${h ? t('habit.edit') : t('today.add')}</h2>
    <div class="field"><label>${t('form.name')}</label>
      <input id="f-name" value="${h ? escapeHtml(h.name) : ''}" /></div>
    <div class="field"><label>${t('form.emoji')}</label>
      <div class="days-picker" id="f-emoji">${EMOJIS.map(
        (e) => `<button class="day-chip ${h && h.emoji === e ? 'active' : ''}" data-emoji="${e}">${e}</button>`
      ).join('')}</div></div>
    <div class="field"><label>${t('form.color')}</label>
      <input id="f-color" type="color" value="${h?.color || '#6ee7b7'}" style="height:40px" /></div>
    <div class="field"><label>${t('form.frequency')}</label>
      <select id="f-freq">
        <option value="daily" ${freq.type === 'daily' ? 'selected' : ''}>${t('freq.daily')}</option>
        <option value="everyN" ${freq.type === 'everyN' ? 'selected' : ''}>${t('freq.everyN')}</option>
        <option value="weekly" ${freq.type === 'weekly' ? 'selected' : ''}>${t('freq.weekly')}</option>
        <option value="monthly" ${freq.type === 'monthly' ? 'selected' : ''}>${t('freq.monthly')}</option>
        <option value="custom" ${freq.type === 'custom' ? 'selected' : ''}>${t('freq.custom')}</option>
      </select></div>
    <div class="field" id="f-extra"></div>
    <div class="field"><label>${t('form.tags')}</label>
      <input id="f-tags" value="${(h?.tags || []).join(', ')}" placeholder="health, work" /></div>
    <div class="flex spread">
      <button class="ghost" id="f-cancel">${t('form.cancel')}</button>
      <button class="primary" id="f-save">${t('form.save')}</button>
    </div>
  </div>`;
  document.getElementById('modal-root').appendChild(modal);

  let chosenEmoji = h?.emoji || EMOJIS[0];
  modal.querySelectorAll('[data-emoji]').forEach((b) =>
    b.addEventListener('click', () => {
      chosenEmoji = b.dataset.emoji;
      modal.querySelectorAll('[data-emoji]').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    })
  );

  const freqSel = modal.querySelector('#f-freq');
  const extra = modal.querySelector('#f-extra');
  function renderExtra() {
    const v = freqSel.value;
    if (v === 'everyN') extra.innerHTML = `<label>Every N days</label><input id="f-n" type="number" min="1" value="${freq.n || 2}" />`;
    else if (v === 'weekly') extra.innerHTML = `<label>X times per week</label><input id="f-wx" type="number" min="1" max="7" value="${freq.x || 3}" />`;
    else if (v === 'monthly') extra.innerHTML = `<label>X times per month</label><input id="f-mx" type="number" min="1" max="28" value="${freq.x || 10}" />`;
    else if (v === 'custom') {
      const days = freq.days || [1, 2, 3, 4, 5];
      extra.innerHTML = `<label>Specific weekdays</label><div class="days-picker" id="f-days">${['S', 'M', 'T', 'W', 'T', 'F', 'S']
        .map((d, i) => `<button class="day-chip ${days.includes(i) ? 'active' : ''}" data-day="${i}">${d}</button>`)
        .join('')}</div>`;
      extra.querySelectorAll('[data-day]').forEach((b) =>
        b.addEventListener('click', () => b.classList.toggle('active'))
      );
    } else extra.innerHTML = '';
  }
  freqSel.addEventListener('change', renderExtra);
  renderExtra();

  modal.querySelector('#f-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  modal.querySelector('#f-save').addEventListener('click', () => {
    const name = modal.querySelector('#f-name').value.trim();
    if (!name) return toast('Name required');
    const frequency = { type: freqSel.value };
    if (frequency.type === 'everyN') frequency.n = +modal.querySelector('#f-n').value;
    if (frequency.type === 'weekly') frequency.x = +modal.querySelector('#f-wx').value;
    if (frequency.type === 'monthly') frequency.x = +modal.querySelector('#f-mx').value;
    if (frequency.type === 'custom')
      frequency.days = Array.from(extra.querySelectorAll('[data-day].active')).map((b) => +b.dataset.day);
    const tags = modal
      .querySelector('#f-tags')
      .value.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const color = modal.querySelector('#f-color').value;
    if (id) updateHabit(id, { name, emoji: chosenEmoji, color, frequency, tags });
    else addHabit({ name, emoji: chosenEmoji, color, frequency, tags });
    modal.remove();
    render();
  });
}

/* ---------- BINDING ---------- */
function bindView() {
  root().querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (btn.dataset.act === 'toggle') {
        toggleCompletion(id);
        render();
      } else if (btn.dataset.act === 'edit') {
        openHabitModal(id);
      }
    });
  });
  const addH = document.getElementById('add-habit') || document.getElementById('add-first');
  if (addH) addH.addEventListener('click', () => openHabitModal());
  const runI = document.getElementById('run-insights');
  if (runI) runI.addEventListener('click', runInsights);

  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', () => { toggleTheme(); render(); });
  const remBtn = document.getElementById('rem-btn');
  if (remBtn) remBtn.addEventListener('click', () => { setReminders(!remindersEnabled()); render(); });
  const roomSave = document.getElementById('room-save');
  if (roomSave) roomSave.addEventListener('click', () => {
    setRoom(document.getElementById('room-input').value.trim());
    toast('Room saved');
  });
  const exp = document.getElementById('export-btn');
  if (exp) exp.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `habitloop-${dateKey(new Date())}.json`;
    a.click();
  });
  const imp = document.getElementById('import-btn');
  if (imp) imp.addEventListener('click', () => document.getElementById('import-file').click());
  const impFile = document.getElementById('import-file');
  if (impFile) impFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      importData(JSON.parse(await file.text()));
      toast('Imported');
      render();
    } catch (err) {
      toast('Import failed');
    }
  });
  const reset = document.getElementById('reset-btn');
  if (reset) reset.addEventListener('click', () => {
    if (confirm('Delete all data?')) { resetAll(); render(); }
  });

  // streak card carousel
  renderCardPreview();
  const cardPrev = document.getElementById('card-prev');
  const cardNext = document.getElementById('card-next');
  const cardShare = document.getElementById('card-share');
  if (cardPrev) cardPrev.addEventListener('click', () => { cardIdx = (cardIdx - 1 + cardHabits().length) % Math.max(1, cardHabits().length); renderCardPreview(); });
  if (cardNext) cardNext.addEventListener('click', () => { cardIdx = (cardIdx + 1) % Math.max(1, cardHabits().length); renderCardPreview(); });
  if (cardShare) cardShare.addEventListener('click', downloadCard);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function initUI() {
  onLangChange(() => render());
}
