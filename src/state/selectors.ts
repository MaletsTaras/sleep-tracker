/**
 * Чисті функції, що перетворюють дані застосунку на те, що показують екрани.
 * Тут немає React — тому все перевіряється звичайними тестами.
 */

import { addDays, dayOf } from '../domain/dates';
import { formatDuration, formatMonthYear, formatPercent, WEEKDAYS_FULL } from '../domain/format';
import { recentDays, type PeriodStats, type DayValue } from '../domain/stats';
import type { DateISO, SleepRecord, SourceId } from '../domain/types';

export function dayValuesFor(records: readonly SleepRecord[], source: SourceId): DayValue[] {
  const out: DayValue[] = [];
  for (const record of records) {
    if (record.source === source) out.push({ date: record.date, minutes: record.minutes });
  }
  return out;
}

export function hasSource(records: readonly SleepRecord[], source: SourceId): boolean {
  return records.some((record) => record.source === source);
}

export function recordFor(records: readonly SleepRecord[], date: DateISO, source: SourceId = 'manual'): SleepRecord | undefined {
  return records.find((record) => record.date === date && record.source === source);
}

/** Тривалість, яку варто запропонувати за замовчуванням: медіана останніх семи записів (до 5 хв) або 7:30. */
export function suggestMinutes(records: readonly SleepRecord[]): number {
  const recent = records
    .filter((record) => record.source === 'manual')
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 7)
    .map((record) => record.minutes)
    .sort((a, b) => a - b);
  if (recent.length === 0) return 450;
  const mid = Math.floor(recent.length / 2);
  const median = recent.length % 2 === 1 ? recent[mid] : (recent[mid - 1] + recent[mid]) / 2;
  return Math.min(1439, Math.max(0, Math.round(median / 5) * 5));
}

export interface RecentSummary {
  /** Скільки з останніх `span` ночей записано. */
  logged: number;
  /** Середня тривалість за записані ночі (хв) або null, якщо записів немає. */
  average: number | null;
  /** У скількох із записаних ночей досягнуто ціль. */
  goalHits: number;
  /** Те саме середнє за попередні `span` днів. */
  previousAverage: number | null;
  /** Різниця «зараз мінус раніше» або null, якщо порівнювати нема з чим. */
  delta: number | null;
}

function averageOf(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return Math.round(present.reduce((sum, value) => sum + value, 0) / present.length);
}

/** Підсумок за останні `span` днів (включно із сьогодні) і порівняння з попередніми `span` днями. */
export function summarizeRecent(days: readonly DayValue[], today: DateISO, goalMinutes: number, span = 7): RecentSummary {
  const current = recentDays(days, today, span).map((point) => point.value);
  const previous = recentDays(days, addDays(today, -span), span).map((point) => point.value);
  const average = averageOf(current);
  const previousAverage = averageOf(previous);
  return {
    logged: current.filter((value) => value !== null).length,
    average,
    goalHits: current.filter((value) => value !== null && value >= goalMinutes).length,
    previousAverage,
    delta: average !== null && previousAverage !== null ? average - previousAverage : null,
  };
}

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Доброго ранку';
  if (hour >= 11 && hour < 17) return 'Добрий день';
  if (hour >= 17 && hour < 23) return 'Добрий вечір';
  return 'Доброї ночі';
}

export type Quality = 'good' | 'near' | 'low';

/** good — ціль досягнуто; near — не вистачило до години; low — менше. */
export function qualityOf(minutes: number, goalMinutes: number): Quality {
  if (minutes >= goalMinutes) return 'good';
  if (minutes >= goalMinutes - 60) return 'near';
  return 'low';
}

export interface MonthGroup {
  key: string;
  label: string;
  records: SleepRecord[];
  averageMinutes: number;
}

/** Групує записи (вже відсортовані від нових до старих) за місяцями, зберігаючи порядок. */
export function groupByMonth(records: readonly SleepRecord[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  const byKey = new Map<string, MonthGroup>();
  for (const record of records) {
    const key = record.date.slice(0, 7);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: formatMonthYear(record.date), records: [], averageMinutes: 0 };
      byKey.set(key, group);
      groups.push(group);
    }
    group.records.push(record);
  }
  for (const group of groups) {
    const total = group.records.reduce((sum, record) => sum + record.minutes, 0);
    group.averageMinutes = Math.round(total / group.records.length);
  }
  return groups;
}

const WEEKDAY_WITH_PREPOSITION = ['у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у п’ятницю', 'у суботу', 'у неділю'] as const;

/**
 * Короткі висновки під статистикою. Лише факти з даних, без медичних оцінок.
 * Повертає не більше трьох речень; для малої кількості записів — порожній список.
 */
export function buildInsights(stats: PeriodStats): string[] {
  const out: string[] = [];
  const logged = stats.loggedDays;

  if (stats.period.kind !== 'week' && logged >= 10) {
    let best = -1;
    let worst = -1;
    stats.weekdayAverages.forEach((value, index) => {
      if (value === null) return;
      if (best === -1 || value > (stats.weekdayAverages[best] as number)) best = index;
      if (worst === -1 || value < (stats.weekdayAverages[worst] as number)) worst = index;
    });
    if (best !== -1 && worst !== -1 && best !== worst) {
      const hi = stats.weekdayAverages[best] as number;
      const lo = stats.weekdayAverages[worst] as number;
      if (hi - lo >= 20) {
        out.push(
          `Найдовше ви спите ${WEEKDAY_WITH_PREPOSITION[best]} (в середньому ${formatDuration(hi)}), найкоротше — ${WEEKDAY_WITH_PREPOSITION[worst]} (${formatDuration(lo)}).`,
        );
      }
    }
  }

  if (logged >= 5 && stats.stdDevMinutes !== null) {
    const std = stats.stdDevMinutes;
    if (std <= 30) out.push(`Режим сну дуже стабільний: тривалість коливається лише на ±${std} хв.`);
    else if (std <= 60) out.push(`Режим сну досить стабільний: типове відхилення — ±${formatDuration(std)}.`);
    else if (std >= 90) {
      out.push(`Тривалість сну сильно коливається (±${formatDuration(std)}). Спробуйте лягати й вставати в один і той самий час.`);
    }
  }

  if (logged >= 5 && stats.goalMetRate !== null) {
    if (stats.goalMetRate >= 0.8) out.push(`Ціль сну досягнуто у ${formatPercent(stats.goalMetRate)} ночей — чудовий результат.`);
    else if (stats.goalMetRate <= 0.25) out.push(`Ціль сну досягнуто лише у ${formatPercent(stats.goalMetRate)} ночей.`);
  }

  if (logged >= 5 && stats.sleepDebtMinutes >= 300) {
    out.push(`Сумарний недосип відносно цілі за цей період — ${formatDuration(stats.sleepDebtMinutes)}.`);
  }

  return out.slice(0, 3);
}

/** «20:00» — час початку наступної поради за місцевим часом. */
export function clockTimeLabel(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Номер дня місяця для підписів на осі (1, 5, 10, …, 30). */
export function isMonthAxisLabel(date: DateISO): boolean {
  const d = dayOf(date);
  return d === 1 || (d % 5 === 0 && d <= 30);
}

export { WEEKDAYS_FULL };
