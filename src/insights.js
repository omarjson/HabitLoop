import { listHabits, listCompletions, allCompletions } from './store.js';
import { dateKey } from './schedule.js';

let pipeline = null;
let loading = null;

async function getSentimentPipeline() {
  if (pipeline) return pipeline;
  if (loading) return loading;
  loading = (async () => {
    const { pipeline: p } = await import('@xenova/transformers');
    return p('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
      quantized: true
    });
  })();
  pipeline = await loading;
  return pipeline;
}

// Returns average sentiment score (-1..1) across all notes. Lazy-loads model.
export async function analyzeSentiment() {
  const pipe = await getSentimentPipeline();
  const comps = allCompletions().filter((c) => c.note && c.note.trim());
  if (comps.length === 0) return { score: 0, count: 0 };
  let sum = 0;
  for (const c of comps) {
    const res = await pipe(c.note);
    const r = res[0];
    const s = r.label === 'POSITIVE' ? r.score : -r.score;
    sum += s;
  }
  return { score: sum / comps.length, count: comps.length };
}

// Correlation engine: for each pair of habits, measure co-occurrence of
// done days. Returns top pairs with a phi-like coefficient.
export function correlations() {
  const habits = listHabits();
  const doneByHabit = new Map();
  for (const h of habits) {
    doneByHabit.set(
      h.id,
      new Set(listCompletions(h.id).map((c) => c.date))
    );
  }
  const results = [];
  for (let i = 0; i < habits.length; i++) {
    for (let j = i + 1; j < habits.length; j++) {
      const a = doneByHabit.get(habits[i].id);
      const b = doneByHabit.get(habits[j].id);
      if (a.size === 0 || b.size === 0) continue;
      let both = 0;
      for (const d of a) if (b.has(d)) both++;
      const coef = both / Math.max(a.size, b.size);
      if (both >= 2) {
        results.push({
          a: habits[i].name,
          b: habits[j].name,
          coef: Math.round(coef * 100),
          days: both
        });
      }
    }
  }
  return results.sort((x, y) => y.coef - x.coef).slice(0, 8);
}
