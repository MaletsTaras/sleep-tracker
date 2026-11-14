/**
 * Демонстраційні дані — щоб одразу побачити, як виглядає статистика.
 * Усі записи помічені `meta.demo = true`, тому їх можна прибрати однією кнопкою,
 * не чіпаючи справжніх. Якщо користувач змінив демонстраційну ніч, запис отримує позначку
 * `meta.demoEdited` (див. types.ts): тоді «Прибрати демо» питає, що робити зі зміненими.
 */

import { addDays, diffDays, weekdayMon0 } from './dates';
import { createRng } from './random';
import { DEMO_META_KEY, isDemoRecord, isEditedDemoRecord, type DateISO, type SleepInput, type SleepRecord } from './types';

/** Скільки днів охоплює демонстраційний набір: з запасом на цілий рік, щоб було що показати на «Рік у крапках». */
export const DEMO_DAYS = 400;

/** Для скількох останніх днів додаємо «дані годинника» (щоб можна було спробувати перемикач джерел). */
const DEMO_WATCH_DAYS = 150;

export function generateDemoRecords(today: DateISO, days = 90, seed = 20261003): SleepInput[] {
  const rng = createRng(seed);
  const out: SleepInput[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(today, -i);
    // Для реалізму іноді «забуваємо» записати.
    if (rng() < 0.08) continue;

    const weekday = weekdayMon0(date); // 5 = субота, 6 = неділя (ранок після вихідної ночі)
    const base = 6 * 60 + 55 + (weekday >= 5 ? 55 : 0);
    // Сума трьох рівномірних величин дає приблизно «дзвоноподібний» розкид.
    const noise = (rng() + rng() + rng() - 1.5) * 100;
    const minutes = Math.min(660, Math.max(240, Math.round((base + noise) / 5) * 5));
    out.push({ date, minutes, source: 'manual', meta: { [DEMO_META_KEY]: true } });
  }
  return out;
}

/** Повний демонстраційний набір: власні записи за `days` днів і правдоподібні «дані годинника» за останні місяці. */
export function generateDemoSet(today: DateISO, days = DEMO_DAYS, seed = 20261003): SleepInput[] {
  const manual = generateDemoRecords(today, days, seed);
  const rng = createRng(seed ^ 0x5bd1e995);
  const watch: SleepInput[] = [];
  for (const record of manual) {
    if (diffDays(record.date, today) >= DEMO_WATCH_DAYS) continue;
    if (rng() < 0.1) continue;
    // Годинник зазвичай «бачить» трохи менше сну, ніж людина записує сама.
    const shift = 5 + Math.floor(rng() * 7) * 5; // 5…35 хв
    watch.push({
      date: record.date,
      minutes: Math.max(180, record.minutes - shift),
      source: 'watch',
      meta: { [DEMO_META_KEY]: true },
    });
  }
  return [...manual, ...watch];
}

export interface DemoCounts {
  /** Записи, які лишились демонстраційними. */
  pure: number;
  /** Демонстраційні ночі, які користувач змінив. */
  edited: number;
}

export function countDemo(records: readonly Pick<SleepRecord, 'meta'>[]): DemoCounts {
  let pure = 0;
  let edited = 0;
  for (const record of records) {
    if (isDemoRecord(record)) pure += 1;
    else if (isEditedDemoRecord(record)) edited += 1;
  }
  return { pure, edited };
}
