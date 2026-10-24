/**
 * Демонстраційні дані — щоб одразу побачити, як виглядає статистика.
 * Усі записи помічені `meta.demo = true`, тому їх можна прибрати однією кнопкою,
 * не чіпаючи справжніх.
 */

import { addDays, weekdayMon0 } from './dates';
import { createRng } from './random';
import { DEMO_META_KEY, type DateISO, type SleepInput } from './types';

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
