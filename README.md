# HabitLoop

An offline-first **Progressive Web App** habit tracker with local-first sync, smart scheduling, in-browser ML insights, and gamification. No backend, no accounts — all your data stays on your device.

![HabitLoop](public/icons/icon-192.png)

[🇸🇦 القراءة بالعربية](README.ar.md)

## ✨ Features

- **Habits & check-ins** — one-tap daily logging with optional notes, rendered as **Loop Rings** that close (chromatic arc fills) when you complete them
- **Advanced scheduling** — daily, every N days, X/week, X/month, or specific weekdays; grace-aware streaks
- **Streaks & stats** — current/best streak, completion rate, total check-ins
- **Heatmap & charts** — radial "bloom" year heatmap (weeks as concentric rings) + weekly trend bars
- **Insights (ML)** — in-browser sentiment analysis of your notes via `transformers.js` (WebGPU/CPU), plus a habit correlation engine
- **Gamification** — XP, levels, badges, and shareable SVG streak cards
- **Cross-device sync** — conflict-free CRDT (`yjs` + `y-indexeddb`) with optional peer-to-peer sync via `y-webrtc` (no server)
- **Reminders** — Notification API nudges for due habits
- **i18n & a11y** — English/العربية, full keyboard navigation, ARIA, dark/light theme, reduced-motion respected
- **PWA** — installable, works fully offline
- **Export / Import** — JSON backup

## 🎨 Design

HabitLoop uses an **"Observatory"** visual system: a near-black blue canvas, a chromatic ring gradient (violet → cyan → lime), and **Space Grotesk / Inter / IBM Plex Mono**. The signature element is the **Loop Ring** — every habit is a circle whose arc travels around and closes when you check in, echoing the app's subject (habits as rhythms, not checklists). The history heatmap is rendered as a radial bloom.

## 🚀 Deploy (free)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/omarjson/habitloop)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/omarjson/habitloop)

Or deploy to **GitHub Pages** automatically — the included workflow builds and publishes on every push to `main`.
Build command: `npm run build` → output `dist/`.

## 🛠️ Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest unit tests
npm run test:e2e   # playwright (needs: npx playwright install chromium)
npm run build      # production build -> dist/
```

## 🧱 Architecture

```
src/
  main.js        entry: wires UI, sync, reminders, service worker
  store.js       Y.Doc + y-indexeddb persistence (habits, completions)
  sync.js        y-webrtc peer-to-peer sync + room management
  schedule.js    frequency rules, due-days, streak & rate math
  stats.js       streak/rate aggregation, heatmap + chart data
  insights.js    transformers.js sentiment + correlation engine
  game.js        XP/levels, badges, SVG streak card
  ui.js          view rendering (today/stats/insights/settings) + habit modal
  theme.js       dark/light persistence
  reminders.js   Notification-based nudges
  sw.js          service worker (offline cache)
i18n/            en.json, ar.json
tests/           vitest unit tests (schedule)
e2e/             playwright check-in flow
```

### Data model
- `habit`: `{ id, name, emoji, color, frequency, tags[], createdAt, archived }`
- `completion`: `{ habitId, date, done, note, ts }` keyed by `habitId@date`

## 📦 Tech
Vanilla JS + [Vite](https://vitejs.dev) · [yjs](https://yjs.dev) · [idb](https://github.com/jakearchibald/idb) · [@xenova/transformers](https://huggingface.co/docs/transformers.js) · Vitest · Playwright

## 📄 License
MIT — see the [LICENSE](LICENSE) file.
