/**
 * Статистика сну за тиждень, місяць і рік.
 * Усе — чисті функції: приймають записи й повертають числа, нічого не знають про екран чи базу.
 */

import {
  addDays,
  addMonths,
  addYears,
  diffDays,
  eachDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  minISO,
  monthOf,
  startOfMonth,
  startOfWeek,
  startOfYear,
  weekdayMon0,
  yearOf,
  dayOf,
} from './dates';
import { MONTHS_LETTER, WEEKDAYS_SHORT_CAP, formatMonthYear, formatRange } from './format';
import type { DateISO, WeekStart } from './types';

export type PeriodKind = 'week' | 'month' | 'year';

export interface Period {
  kind: PeriodKind;
  /** Перший день періоду (включно). */
  start: DateISO;
  /** Останній день періоду (включно). */
  end: DateISO;
  /** Будь-яка дата всередині періоду — від неї рахується навігація «назад/вперед». */
  anchor: DateISO;
}

export interface DayValue {
  date: DateISO;
  minutes: number;
}

export interface Extreme {
  date: DateISO;
  minutes: number;
}

export interface Bucket {
  /** Нижня межа в годинах — зручно як ключ. */
  key: string;
  /** «<4», «4–5», …, «10+». */
  label: string;
  fromMinutes: number;
  /** null — без верхньої межі. */
  toMinutes: number | null;
  count: number;
}

export interface SeriesPoint {
  /** Дата для днів, `YYYY-MM-01` для місяців. */
  date: DateISO;
  /** Підпис під стовпчиком. */
  label: string;
  /** Хвилини (для місяця — середнє за місяць) або null, якщо даних немає. */
  value: number | null;
  /** Скільки записів ліг у цей стовпчик. */
  count: number;
  /** Дата ще не настала. */
  future: boolean;
}

export interface PeriodStats {
  period: Period;
  /** Останній день, що вже настав (min(кінець періоду, сьогодні)); null, якщо період у майбутньому. */
  elapsedEnd: DateISO | null;
  totalDays: number;
  elapsedDays: number;
  loggedDays: number;
  missingDays: number;
  totalMinutes: number;
  averageMinutes: number | null;
  medianMinutes: number | null;
  /** Стандартне відхилення (генеральна сукупність), хв. Потрібно щонайменше 2 записи. */
  stdDevMinutes: number | null;
  longest: Extreme | null;
  shortest: Extreme | null;
  goalMinutes: number;
  goalMetDays: number;
  /** Частка записаних ночей, що досягли цілі (0..1). */
  goalMetRate: number | null;
  /** Сума «не дотягнув до цілі» по всіх записаних ночах. */
  sleepDebtMinutes: number;
  buckets: Bucket[];
  /** Середнє за днями тижня, індекс 0 = понеділок … 6 = неділя. */
  weekdayAverages: (number | null)[];
  series: SeriesPoint[];
  previousAverageMinutes: number | null;
  /** Середнє зараз мінус середнє в попередньому періоді. */
  deltaMinutes: number | null;
}

export interface StatsOptions {
  today: DateISO;
  goalMinutes: number;
}

// ---------------------------------------------------------------------------
// Періоди

export function getPeriod(kind: PeriodKind, anchor: DateISO, weekStartsOn: WeekStart = 1): Period {
  switch (kind) {
    case 'week':
      return { kind, anchor, start: startOfWeek(anchor, weekStartsOn), end: endOfWeek(anchor, weekStartsOn) };
    case 'month':
      return { kind, anchor, start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'year':
      return { kind, anchor, start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

export function shiftAnchor(kind: PeriodKind, anchor: DateISO, delta: number): DateISO {
  switch (kind) {
    case 'week':
      return addDays(anchor, 7 * delta);
    case 'month':
      return addMonths(anchor, delta);
    case 'year':
      return addYears(anchor, delta);
  }
}

export function shiftPeriod(period: Period, delta: number, weekStartsOn: WeekStart = 1): Period {
  return getPeriod(period.kind, shiftAnchor(period.kind, period.anchor, delta), weekStartsOn);
}

export function containsDate(period: Period, date: DateISO): boolean {
  return date >= period.start && date <= period.end;
}

export function isCurrentPeriod(period: Period, today: DateISO): boolean {
  return containsDate(period, today);
}

/** Вперед можна йти, лише поки період уже закінчився. */
export function canGoNext(period: Period, today: DateISO): boolean {
  return period.end < today;
}

export function periodLabel(period: Period, today: DateISO): string {
  switch (period.kind) {
    case 'week':
      return formatRange(period.start, period.end, today);
    case 'month':
      return formatMonthYear(period.start);
    case 'year':
      return String(yearOf(period.start));
  }
}

/** Межі попереднього періоду тієї ж довжини. */
function previousRange(period: Period): { start: DateISO; end: DateISO } {
  switch (period.kind) {
    case 'week':
      return { start: addDays(period.start, -7), end: addDays(period.end, -7) };
    case 'month': {
      const anchor = addMonths(period.start, -1);
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    }
    case 'year': {
      const anchor = addYears(period.start, -1);
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
    }
  }
}

// ---------------------------------------------------------------------------
// Розподіл за годинами

/** Нижні межі груп у годинах: <4, 4–5, 5–6, 6–7, 7–8, 8–9, 9–10, 10+. */
const BUCKET_LOWER_HOURS = [0, 4, 5, 6, 7, 8, 9, 10] as const;

function makeBuckets(): Bucket[] {
  return BUCKET_LOWER_HOURS.map((lower, i) => {
    const next = BUCKET_LOWER_HOURS[i + 1];
    let label: string;
    if (i === 0) label = `<${BUCKET_LOWER_HOURS[1]}`;
    else if (next === undefined) label = `${lower}+`;
    else label = `${lower}–${next}`;
    return {
      key: String(lower),
      label,
      fromMinutes: lower * 60,
      toMinutes: next === undefined ? null : next * 60,
      count: 0,
    };
  });
}

function bucketIndex(minutes: number): number {
  let index = 0;
  for (let i = 0; i < BUCKET_LOWER_HOURS.length; i += 1) {
    if (minutes >= BUCKET_LOWER_HOURS[i] * 60) index = i;
  }
  return index;
}

// ---------------------------------------------------------------------------
// Допоміжне

export function toDayMap(days: Iterable<DayValue>): Map<DateISO, number> {
  const map = new Map<DateISO, number>();
  for (const { date, minutes } of days) map.set(date, minutes);
  return map;
}

function valuesInRange(map: Map<DateISO, number>, start: DateISO, end: DateISO): DayValue[] {
  const out: DayValue[] = [];
  for (const [date, minutes] of map) {
    if (date >= start && date <= end) out.push({ date, minutes });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function populationStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function roundOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}

// ---------------------------------------------------------------------------
// Головна функція

export function computeStats(records: Iterable<DayValue>, period: Period, options: StatsOptions): PeriodStats {
  const { today, goalMinutes } = options;
  const map = toDayMap(records);

  const totalDays = diffDays(period.start, period.end) + 1;
  const elapsedEnd = period.start > today ? null : minISO(period.end, today);
  const elapsedDays = elapsedEnd === null ? 0 : diffDays(period.start, elapsedEnd) + 1;

  const values = elapsedEnd === null ? [] : valuesInRange(map, period.start, elapsedEnd);
  const minutesList = values.map((v) => v.minutes);
  const loggedDays = values.length;
  const totalMinutes = minutesList.reduce((sum, v) => sum + v, 0);

  // Найдовший/найкоротший: при рівності береться найраніша дата.
  let longest: Extreme | null = null;
  let shortest: Extreme | null = null;
  for (const v of values) {
    if (longest === null || v.minutes > longest.minutes) longest = { date: v.date, minutes: v.minutes };
    if (shortest === null || v.minutes < shortest.minutes) shortest = { date: v.date, minutes: v.minutes };
  }

  const buckets = makeBuckets();
  let goalMetDays = 0;
  let sleepDebtMinutes = 0;
  const weekdaySums: number[] = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const v of values) {
    buckets[bucketIndex(v.minutes)].count += 1;
    if (v.minutes >= goalMinutes) goalMetDays += 1;
    else sleepDebtMinutes += goalMinutes - v.minutes;
    const wd = weekdayMon0(v.date);
    weekdaySums[wd] += v.minutes;
    weekdayCounts[wd] += 1;
  }
  const weekdayAverages = weekdaySums.map((sum, i) => (weekdayCounts[i] === 0 ? null : Math.round(sum / weekdayCounts[i])));

  const averageMinutes = roundOrNull(mean(minutesList));

  // Попередній період для порівняння.
  const prev = previousRange(period);
  const prevValues = valuesInRange(map, prev.start, prev.end).map((v) => v.minutes);
  const previousAverageMinutes = roundOrNull(mean(prevValues));
  const deltaMinutes =
    averageMinutes !== null && previousAverageMinutes !== null ? averageMinutes - previousAverageMinutes : null;

  return {
    period,
    elapsedEnd,
    totalDays,
    elapsedDays,
    loggedDays,
    missingDays: Math.max(0, elapsedDays - loggedDays),
    totalMinutes,
    averageMinutes,
    medianMinutes: roundOrNull(median(minutesList)),
    stdDevMinutes: roundOrNull(populationStdDev(minutesList)),
    longest,
    shortest,
    goalMinutes,
    goalMetDays,
    goalMetRate: loggedDays === 0 ? null : goalMetDays / loggedDays,
    sleepDebtMinutes,
    buckets,
    weekdayAverages,
    series: buildSeries(map, period, today),
    previousAverageMinutes,
    deltaMinutes,
  };
}

function buildSeries(map: Map<DateISO, number>, period: Period, today: DateISO): SeriesPoint[] {
  if (period.kind === 'year') {
    const year = yearOf(period.start);
    const points: SeriesPoint[] = [];
    for (let month = 1; month <= 12; month += 1) {
      const first = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
      const last = endOfMonth(first);
      const future = first > today;
      const monthValues = future ? [] : valuesInRange(map, first, minISO(last, today)).map((v) => v.minutes);
      points.push({
        date: first,
        label: MONTHS_LETTER[month - 1],
        value: roundOrNull(mean(monthValues)),
        count: monthValues.length,
        future,
      });
    }
    return points;
  }

  return eachDay(period.start, period.end).map((date) => {
    const future = date > today;
    const minutes = future ? undefined : map.get(date);
    const label = period.kind === 'week' ? WEEKDAYS_SHORT_CAP[weekdayMon0(date)] : String(dayOf(date));
    return {
      date,
      label,
      value: minutes === undefined ? null : minutes,
      count: minutes === undefined ? 0 : 1,
      future,
    };
  });
}

/** Останні `n` днів, що закінчуються сьогодні (для смужки на головному екрані). */
export function recentDays(records: Iterable<DayValue>, today: DateISO, n: number): SeriesPoint[] {
  const map = toDayMap(records);
  const out: SeriesPoint[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const minutes = map.get(date);
    out.push({
      date,
      label: WEEKDAYS_SHORT_CAP[weekdayMon0(date)],
      value: minutes === undefined ? null : minutes,
      count: minutes === undefined ? 0 : 1,
      future: false,
    });
  }
  return out;
}

/** Номер місяця (1..12) для точки річного графіка. */
export function seriesMonth(point: SeriesPoint): number {
  return monthOf(point.date);
}
