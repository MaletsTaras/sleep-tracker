/**
 * «Рік у крапках»: кожна ніч року — одна крапка, її колір залежить від тривалості сну.
 * Чисті функції: приймають записи й повертають сітку «тижні × дні тижня», нічого не знають про екран.
 */

import { addDays, diffDays, endOfYear, monthOf, startOfWeek, weekdayIndex } from './dates';
import { toDayMap, type DayValue } from './stats';
import type { DateISO, WeekStart } from './types';

/** Кількість груп за тривалістю сну. */
export const HEAT_LEVELS = 5;

/** Нижні межі груп у хвилинах: менше 6 год, 6–7, 7–8, 8–9, 9 і більше. */
const HEAT_FROM_MINUTES = [0, 360, 420, 480, 540] as const;

/** Підписи груп (у годинах), у порядку від найкоротшого сну. */
export const HEAT_LABELS = ['<6', '6–7', '7–8', '8–9', '9+'] as const;

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** До якої групи належить ніч такої тривалості. */
export function heatLevel(minutes: number): HeatLevel {
  let level: HeatLevel = 0;
  for (let i = 1; i < HEAT_LEVELS; i += 1) {
    if (minutes >= HEAT_FROM_MINUTES[i]) level = i as HeatLevel;
  }
  return level;
}

export interface HeatCell {
  date: DateISO;
  /** Стовпець (тиждень) і рядок (день тижня) у сітці. */
  col: number;
  row: number;
  /** Хвилини сну або null, якщо запису немає (чи день ще не настав). */
  minutes: number | null;
  level: HeatLevel | null;
  /** День ще не настав. */
  future: boolean;
}

export interface HeatMonth {
  /** 1..12. */
  month: number;
  /** Стовпець, у якому стоїть перше число місяця. */
  col: number;
}

export interface Heatmap {
  year: number;
  /** Скільки стовпців (тижнів) у сітці: 53 або 54. */
  weeks: number;
  /** У якому рядку стоїть 1 січня (скільки клітинок першого стовпця порожні). */
  lead: number;
  /** Усі дні року підряд. */
  cells: HeatCell[];
  months: HeatMonth[];
  /** Скільки ночей року вже записано. */
  nights: number;
  /** Скільки записаних ночей у кожній групі (довжина `HEAT_LEVELS`). */
  levelCounts: number[];
}

/** Будує сітку року. Тиждень починається з `weekStartsOn`; дні після `today` позначені як майбутні. */
export function buildYearHeatmap(
  days: Iterable<DayValue>,
  year: number,
  today: DateISO,
  weekStartsOn: WeekStart = 1,
): Heatmap {
  const first: DateISO = `${String(year).padStart(4, '0')}-01-01`;
  const last = endOfYear(first);
  const gridStart = startOfWeek(first, weekStartsOn);
  const map = toDayMap(days);

  const total = diffDays(first, last) + 1;
  const cells: HeatCell[] = [];
  const levelCounts = new Array<number>(HEAT_LEVELS).fill(0);
  let nights = 0;

  for (let i = 0; i < total; i += 1) {
    const date = addDays(first, i);
    const offset = diffDays(gridStart, date);
    const future = date > today;
    const recorded = future ? undefined : map.get(date);
    const level = recorded === undefined ? null : heatLevel(recorded);
    if (level !== null) {
      levelCounts[level] += 1;
      nights += 1;
    }
    cells.push({
      date,
      col: Math.floor(offset / 7),
      row: weekdayIndex(date, weekStartsOn),
      minutes: recorded === undefined ? null : recorded,
      level,
      future,
    });
  }

  const months: HeatMonth[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const day = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
    months.push({ month, col: Math.floor(diffDays(gridStart, day) / 7) });
  }

  return {
    year,
    weeks: cells[cells.length - 1].col + 1,
    lead: diffDays(gridStart, first),
    cells,
    months,
    nights,
    levelCounts,
  };
}

/** Клітинка в стовпці `col` і рядку `row`; null, якщо там порожньо (до 1 січня чи після 31 грудня). */
export function cellAt(heatmap: Heatmap, col: number, row: number): HeatCell | null {
  if (!Number.isInteger(col) || !Number.isInteger(row) || row < 0 || row > 6 || col < 0) return null;
  return heatmap.cells[col * 7 + row - heatmap.lead] ?? null;
}

/** Місяць, до якого належить клітинка (1..12). */
export function cellMonth(cell: HeatCell): number {
  return monthOf(cell.date);
}
