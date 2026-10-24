/**
 * Українське форматування: тривалість, множина, дати.
 * Свідомо не користуємось Intl — його підтримка на Android залежить від збірки Hermes,
 * а цей код легко тестувати окремо.
 */

import { dayOf, monthOf, weekdayMon0, yearOf } from './dates';
import type { DateISO, WeekStart } from './types';

export const WEEKDAYS_FULL = ['понеділок', 'вівторок', 'середа', 'четвер', 'п’ятниця', 'субота', 'неділя'] as const;
export const WEEKDAYS_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'] as const;
export const WEEKDAYS_SHORT_CAP = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const;

export const MONTHS_NOMINATIVE = [
  'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
  'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
] as const;

export const MONTHS_GENITIVE = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
] as const;

export const MONTHS_SHORT = [
  'січ', 'лют', 'бер', 'квіт', 'трав', 'черв',
  'лип', 'серп', 'вер', 'жовт', 'лист', 'груд',
] as const;

/** Однолітерні підписи місяців для річного графіка. */
export const MONTHS_LETTER = ['С', 'Л', 'Б', 'К', 'Т', 'Ч', 'Л', 'С', 'В', 'Ж', 'Л', 'Г'] as const;

export function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/**
 * Українська множина: one — 1, 21, 31…; few — 2–4, 22–24…; many — решта (5–20, 25–30…).
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatDays(n: number): string {
  return `${n} ${plural(n, 'день', 'дні', 'днів')}`;
}

export function formatNights(n: number): string {
  return `${n} ${plural(n, 'ніч', 'ночі', 'ночей')}`;
}

export function formatRecords(n: number): string {
  return `${n} ${plural(n, 'запис', 'записи', 'записів')}`;
}

/** Розбиває хвилини на години й хвилини (з округленням до цілої хвилини). */
export function splitHM(minutes: number): { h: number; m: number } {
  const total = Math.max(0, Math.round(minutes));
  return { h: Math.floor(total / 60), m: total % 60 };
}

/** «7 год 30 хв», «7 год», «45 хв». */
export function formatDuration(minutes: number): string {
  const { h, m } = splitHM(minutes);
  if (h === 0) return `${m} хв`;
  if (m === 0) return `${h} год`;
  return `${h} год ${m} хв`;
}

/** «7:30» — компактний запис для підписів і таблиць. */
export function formatClock(minutes: number): string {
  const { h, m } = splitHM(minutes);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** «+18 хв», «−1 год 5 хв», «0 хв». Мінус — справжній (U+2212). */
export function formatDelta(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded === 0) return '0 хв';
  return `${rounded > 0 ? '+' : '−'}${formatDuration(Math.abs(rounded))}`;
}

/** «57%» зі співвідношення 0..1. */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** «субота, 3 жовтня». */
export function formatDayLong(date: DateISO): string {
  return `${WEEKDAYS_FULL[weekdayMon0(date)]}, ${dayOf(date)} ${MONTHS_GENITIVE[monthOf(date) - 1]}`;
}

/** «сб, 3 жовт.». */
export function formatDayMedium(date: DateISO): string {
  return `${WEEKDAYS_SHORT[weekdayMon0(date)]}, ${dayOf(date)} ${MONTHS_SHORT[monthOf(date) - 1]}.`;
}

/** «3 жовт.». */
export function formatDayShort(date: DateISO): string {
  return `${dayOf(date)} ${MONTHS_SHORT[monthOf(date) - 1]}.`;
}

/** «Жовтень 2026». */
export function formatMonthYear(date: DateISO): string {
  return `${capitalize(MONTHS_NOMINATIVE[monthOf(date) - 1])} ${yearOf(date)}`;
}

/** «Жовтень». */
export function formatMonthName(date: DateISO): string {
  return capitalize(MONTHS_NOMINATIVE[monthOf(date) - 1]);
}

/** «Сьогодні» / «Вчора» / «сб, 3 жовт.». */
export function relativeDayLabel(date: DateISO, today: DateISO, diff: (a: DateISO, b: DateISO) => number): string {
  const delta = diff(date, today);
  if (delta === 0) return 'Сьогодні';
  if (delta === 1) return 'Вчора';
  return formatDayMedium(date);
}

/** «Сьогодні, 3 жовтня» / «Вчора, 2 жовтня» / «Субота, 3 жовтня». */
export function relativeDayLong(date: DateISO, today: DateISO, diff: (a: DateISO, b: DateISO) => number): string {
  const delta = diff(date, today);
  const base = `${dayOf(date)} ${MONTHS_GENITIVE[monthOf(date) - 1]}`;
  if (delta === 0) return `Сьогодні, ${base}`;
  if (delta === 1) return `Вчора, ${base}`;
  return capitalize(formatDayLong(date));
}

/** «28 вер. – 4 жовт.»; рік додається, якщо діапазон не в поточному році. */
export function formatRange(start: DateISO, end: DateISO, today: DateISO): string {
  const sameYearAsToday = yearOf(start) === yearOf(today) && yearOf(end) === yearOf(today);
  const base = `${formatDayShort(start)} – ${formatDayShort(end)}`;
  if (sameYearAsToday) return base;
  return yearOf(start) === yearOf(end) ? `${base} ${yearOf(end)}` : `${formatDayShort(start)} ${yearOf(start)} – ${formatDayShort(end)} ${yearOf(end)}`;
}

/** Підписи днів тижня у порядку, що починається з обраного першого дня. */
export function weekdayLabels(weekStartsOn: WeekStart): { mon0: number; label: string }[] {
  const out: { mon0: number; label: string }[] = [];
  for (let i = 0; i < 7; i += 1) {
    const mon0 = (i + (weekStartsOn === 1 ? 0 : 6)) % 7;
    out.push({ mon0, label: WEEKDAYS_SHORT_CAP[mon0] });
  }
  return out;
}
