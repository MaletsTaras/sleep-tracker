/**
 * Перетворення статистики на дані для графіків (чисті функції).
 */

import { dayOf, monthOf } from '../domain/dates';
import {
  capitalize,
  formatDayLong,
  formatDayMedium,
  formatDuration,
  formatMonthYear,
  MONTHS_NOMINATIVE,
  WEEKDAYS_FULL,
  weekdayLabels,
} from '../domain/format';
import type { PeriodKind, SeriesPoint } from '../domain/stats';
import type { WeekStart } from '../domain/types';
import type { BarDatum } from '../ui/charts/BarChart';
import { isMonthAxisLabel } from './selectors';

export function seriesToBars(series: readonly SeriesPoint[], kind: PeriodKind): BarDatum[] {
  return series.map((point) => {
    let label = point.label;
    if (kind === 'month') label = isMonthAxisLabel(point.date) ? String(dayOf(point.date)) : '';

    let a11y: string;
    if (kind === 'year') {
      const month = MONTHS_NOMINATIVE[monthOf(point.date) - 1];
      a11y = point.value === null ? `${month}: немає записів` : `${month}: у середньому ${formatDuration(point.value)}`;
    } else {
      a11y = point.value === null ? `${formatDayMedium(point.date)}: немає запису` : `${formatDayMedium(point.date)}: ${formatDuration(point.value)}`;
    }

    return { key: point.date, label, value: point.value, future: point.future, a11y };
  });
}

/** Підпис над графіком, коли вибрано стовпчик. */
export function readoutFor(point: SeriesPoint, kind: PeriodKind): { title: string; value: string } {
  if (kind === 'year') {
    return {
      title: formatMonthYear(point.date),
      value: point.value === null ? 'Немає записів' : `${formatDuration(point.value)} у середньому`,
    };
  }
  return {
    title: capitalize(formatDayLong(point.date)),
    value: point.value === null ? 'Немає запису' : formatDuration(point.value),
  };
}

/** Середнє за днями тижня у порядку, що починається з обраного першого дня. */
export function weekdayBars(averages: readonly (number | null)[], weekStartsOn: WeekStart): BarDatum[] {
  return weekdayLabels(weekStartsOn).map(({ mon0, label }) => {
    const value = averages[mon0] ?? null;
    return {
      key: `wd${mon0}`,
      label,
      value,
      a11y: value === null ? `${WEEKDAYS_FULL[mon0]}: немає даних` : `${WEEKDAYS_FULL[mon0]}: у середньому ${formatDuration(value)}`,
    };
  });
}
