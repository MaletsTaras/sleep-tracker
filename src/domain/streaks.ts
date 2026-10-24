import { addDays, toDayNumber } from './dates';
import type { DateISO } from './types';

export interface StreakInfo {
  /** Скільки днів поспіль записано, рахуючи до сьогодні (або до вчора, якщо сьогодні ще немає запису). */
  current: number;
  /** Найдовша серія за весь час. */
  best: number;
}

/**
 * Серія — це дні підряд, за які є запис.
 * Серія не обривається, поки сьогоднішній день не закінчився: якщо запису за сьогодні ще немає,
 * але вчора він був, серія вважається поточною.
 */
export function computeStreaks(dates: Iterable<DateISO>, today: DateISO): StreakInfo {
  const set = new Set<DateISO>();
  for (const d of dates) if (d <= today) set.add(d);
  if (set.size === 0) return { current: 0, best: 0 };

  const numbers = [...set].map(toDayNumber).sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < numbers.length; i += 1) {
    run = numbers[i] === numbers[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  let cursor: DateISO | null = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  let current = 0;
  while (cursor !== null && set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}
