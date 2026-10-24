/**
 * Робота з датами без часових поясів.
 *
 * Усі дати — рядки `YYYY-MM-DD`. Арифметика ведеться через «номер дня»
 * (кількість діб від 1970-01-01 за UTC), тому перехід на літній/зимовий час
 * ніколи не зсуває результат.
 */

import type { DateISO, WeekStart } from './types';

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface YMD {
  y: number;
  m: number; // 1..12
  d: number; // 1..31
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function formatISO(y: number, m: number, d: number): DateISO {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** Розбирає `YYYY-MM-DD`. Повертає null, якщо рядок не є коректною календарною датою. */
export function parseISO(value: string): YMD | null {
  const match = ISO_RE.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1) return null;
  if (d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function isValidISODate(value: unknown): value is DateISO {
  return typeof value === 'string' && parseISO(value) !== null;
}

function mustParse(value: DateISO): YMD {
  const ymd = parseISO(value);
  if (!ymd) throw new Error(`Некоректна дата: ${value}`);
  return ymd;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

/** Кількість діб від 1970-01-01. */
export function toDayNumber(date: DateISO): number {
  const { y, m, d } = mustParse(date);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNumber(n: number): DateISO {
  const dt = new Date(n * MS_PER_DAY);
  return formatISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(date: DateISO, n: number): DateISO {
  return fromDayNumber(toDayNumber(date) + n);
}

/** Скільки діб від `a` до `b` (b − a). */
export function diffDays(a: DateISO, b: DateISO): number {
  return toDayNumber(b) - toDayNumber(a);
}

/** Сьогоднішня дата за місцевим часом пристрою. */
export function todayISO(now: Date = new Date()): DateISO {
  return formatISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Номер дня тижня, де 0 = понеділок … 6 = неділя. */
export function weekdayMon0(date: DateISO): number {
  // 1970-01-01 — четвер (індекс 3 у нумерації з понеділка).
  return (((toDayNumber(date) + 3) % 7) + 7) % 7;
}

/** Номер дня тижня відносно обраного початку тижня: 0 = перший день тижня. */
export function weekdayIndex(date: DateISO, weekStartsOn: WeekStart = 1): number {
  const mon0 = weekdayMon0(date);
  return weekStartsOn === 1 ? mon0 : (mon0 + 1) % 7;
}

export function startOfWeek(date: DateISO, weekStartsOn: WeekStart = 1): DateISO {
  return addDays(date, -weekdayIndex(date, weekStartsOn));
}

export function endOfWeek(date: DateISO, weekStartsOn: WeekStart = 1): DateISO {
  return addDays(startOfWeek(date, weekStartsOn), 6);
}

export function startOfMonth(date: DateISO): DateISO {
  const { y, m } = mustParse(date);
  return formatISO(y, m, 1);
}

export function endOfMonth(date: DateISO): DateISO {
  const { y, m } = mustParse(date);
  return formatISO(y, m, daysInMonth(y, m));
}

export function startOfYear(date: DateISO): DateISO {
  const { y } = mustParse(date);
  return formatISO(y, 1, 1);
}

export function endOfYear(date: DateISO): DateISO {
  const { y } = mustParse(date);
  return formatISO(y, 12, 31);
}

/** Додає місяці; якщо в новому місяці немає такого числа — береться останній день. */
export function addMonths(date: DateISO, n: number): DateISO {
  const { y, m, d } = mustParse(date);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12 + 12) % 12 + 1;
  return formatISO(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function addYears(date: DateISO, n: number): DateISO {
  return addMonths(date, n * 12);
}

/** `YYYY-MM` для групування за місяцями. */
export function monthKey(date: DateISO): string {
  return date.slice(0, 7);
}

export function yearOf(date: DateISO): number {
  return mustParse(date).y;
}

export function monthOf(date: DateISO): number {
  return mustParse(date).m;
}

export function dayOf(date: DateISO): number {
  return mustParse(date).d;
}

/** Усі дати від `start` до `end` включно. Порожній масив, якщо end < start. */
export function eachDay(start: DateISO, end: DateISO): DateISO[] {
  const first = toDayNumber(start);
  const last = toDayNumber(end);
  const out: DateISO[] = [];
  for (let n = first; n <= last; n += 1) out.push(fromDayNumber(n));
  return out;
}

export function minISO(a: DateISO, b: DateISO): DateISO {
  return a <= b ? a : b;
}

export function maxISO(a: DateISO, b: DateISO): DateISO {
  return a >= b ? a : b;
}
