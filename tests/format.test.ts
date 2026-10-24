import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffDays } from '../src/domain/dates';
import {
  capitalize,
  formatClock,
  formatDayLong,
  formatDayMedium,
  formatDayShort,
  formatDays,
  formatDelta,
  formatDuration,
  formatMonthYear,
  formatNights,
  formatPercent,
  formatRange,
  plural,
  relativeDayLabel,
  relativeDayLong,
  splitHM,
  weekdayLabels,
} from '../src/domain/format';

test('множина за українськими правилами', () => {
  const day = (n: number) => formatDays(n);
  assert.equal(day(0), '0 днів');
  assert.equal(day(1), '1 день');
  assert.equal(day(2), '2 дні');
  assert.equal(day(4), '4 дні');
  assert.equal(day(5), '5 днів');
  assert.equal(day(11), '11 днів');
  assert.equal(day(12), '12 днів');
  assert.equal(day(14), '14 днів');
  assert.equal(day(21), '21 день');
  assert.equal(day(22), '22 дні');
  assert.equal(day(25), '25 днів');
  assert.equal(day(101), '101 день');
  assert.equal(day(111), '111 днів');
  assert.equal(formatNights(1), '1 ніч');
  assert.equal(formatNights(3), '3 ночі');
  assert.equal(formatNights(7), '7 ночей');
  assert.equal(plural(31, 'a', 'b', 'c'), 'a');
});

test('тривалість сну', () => {
  assert.deepEqual(splitHM(450), { h: 7, m: 30 });
  assert.deepEqual(splitHM(449.6), { h: 7, m: 30 });
  assert.deepEqual(splitHM(-5), { h: 0, m: 0 });
  assert.equal(formatDuration(450), '7 год 30 хв');
  assert.equal(formatDuration(420), '7 год');
  assert.equal(formatDuration(45), '45 хв');
  assert.equal(formatDuration(0), '0 хв');
  assert.equal(formatDuration(65), '1 год 5 хв');
  assert.equal(formatClock(450), '7:30');
  assert.equal(formatClock(425), '7:05');
  assert.equal(formatClock(0), '0:00');
});

test('різниця з правильним знаком', () => {
  assert.equal(formatDelta(18), '+18 хв');
  assert.equal(formatDelta(-65), '−1 год 5 хв');
  assert.equal(formatDelta(0), '0 хв');
  assert.equal(formatDelta(0.4), '0 хв');
  assert.equal(formatDelta(120), '+2 год');
});

test('відсотки', () => {
  assert.equal(formatPercent(0.5714), '57%');
  assert.equal(formatPercent(1), '100%');
  assert.equal(formatPercent(0), '0%');
});

test('форматування дат', () => {
  assert.equal(formatDayLong('2026-10-03'), 'субота, 3 жовтня');
  assert.equal(formatDayLong('2026-03-09'), 'понеділок, 9 березня');
  assert.equal(formatDayMedium('2026-10-02'), 'пт, 2 жовт.');
  assert.equal(formatDayShort('2026-05-01'), '1 трав.');
  assert.equal(formatMonthYear('2026-10-03'), 'Жовтень 2026');
  assert.equal(capitalize('жовтень'), 'Жовтень');
  assert.equal(capitalize(''), '');
});

test('відносні дні', () => {
  assert.equal(relativeDayLabel('2026-10-03', '2026-10-03', diffDays), 'Сьогодні');
  assert.equal(relativeDayLabel('2026-10-02', '2026-10-03', diffDays), 'Вчора');
  assert.equal(relativeDayLabel('2026-10-01', '2026-10-03', diffDays), 'чт, 1 жовт.');
  assert.equal(relativeDayLong('2026-10-03', '2026-10-03', diffDays), 'Сьогодні, 3 жовтня');
  assert.equal(relativeDayLong('2026-10-02', '2026-10-03', diffDays), 'Вчора, 2 жовтня');
  assert.equal(relativeDayLong('2026-10-01', '2026-10-03', diffDays), 'Четвер, 1 жовтня');
});

test('діапазони дат', () => {
  assert.equal(formatRange('2026-09-28', '2026-10-04', '2026-10-03'), '28 вер. – 4 жовт.');
  assert.equal(formatRange('2025-09-29', '2025-10-05', '2026-10-03'), '29 вер. – 5 жовт. 2025');
  assert.equal(
    formatRange('2025-12-29', '2026-01-04', '2026-10-03'),
    '29 груд. 2025 – 4 січ. 2026',
  );
});

test('підписи днів тижня залежать від початку тижня', () => {
  assert.deepEqual(
    weekdayLabels(1).map((d) => d.label),
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
  );
  assert.deepEqual(
    weekdayLabels(0).map((d) => d.label),
    ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  );
  assert.deepEqual(
    weekdayLabels(0).map((d) => d.mon0),
    [6, 0, 1, 2, 3, 4, 5],
  );
});
