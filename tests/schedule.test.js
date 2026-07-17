import { describe, it, expect } from 'vitest';
import { isDueOn, addDays, dateKey, computeStreaks, completionRate } from '../src/schedule.js';

const base = { id: 'h1', createdAt: new Date('2024-01-01').getTime(), frequency: { type: 'daily' } };

describe('schedule.isDueOn', () => {
  it('daily is due every day', () => {
    expect(isDueOn(base, '2024-01-01')).toBe(true);
    expect(isDueOn(base, '2024-06-15')).toBe(true);
  });
  it('everyN every 2 days', () => {
    const h = { ...base, frequency: { type: 'everyN', n: 2 } };
    expect(isDueOn(h, '2024-01-01')).toBe(true);
    expect(isDueOn(h, '2024-01-02')).toBe(false);
    expect(isDueOn(h, '2024-01-03')).toBe(true);
  });
  it('custom weekdays', () => {
    const h = { ...base, frequency: { type: 'custom', days: [1, 3, 5] } };
    // 2024-01-01 is Monday(1)
    expect(isDueOn(h, '2024-01-01')).toBe(true);
    expect(isDueOn(h, '2024-01-02')).toBe(false);
    expect(isDueOn(h, '2024-01-03')).toBe(true);
  });
  it('not due before creation', () => {
    expect(isDueOn(base, '2023-12-31')).toBe(false);
  });
});

describe('schedule.addDays', () => {
  it('adds days across month boundary', () => {
    expect(addDays('2024-01-30', 2)).toBe('2024-02-01');
  });
});

describe('schedule.computeStreaks', () => {
  it('counts current streak', () => {
    const today = dateKey(new Date());
    const comps = [
      { date: addDays(today, 0) },
      { date: addDays(today, -1) },
      { date: addDays(today, -2) }
    ];
    const { current, best } = computeStreaks(base, comps);
    expect(current).toBe(3);
    expect(best).toBe(3);
  });
  it('broken streak resets current', () => {
    const today = dateKey(new Date());
    const comps = [{ date: addDays(today, 0) }, { date: addDays(today, -2) }];
    const { current } = computeStreaks(base, comps);
    expect(current).toBe(1);
  });
});

describe('schedule.completionRate', () => {
  it('returns percent of due days done', () => {
    const h = { ...base, frequency: { type: 'daily' } };
    const today = dateKey(new Date());
    const comps = [{ date: addDays(today, 0) }, { date: addDays(today, -1) }];
    expect(completionRate(h, comps, 4)).toBe(50);
  });
  it('returns 0 when nothing due', () => {
    const h = { ...base, frequency: { type: 'custom', days: [0] } };
    expect(completionRate(h, [], 7)).toBe(0);
  });
});
