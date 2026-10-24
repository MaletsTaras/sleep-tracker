import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  addMonths,
  addYears,
  daysInMonth,
  diffDays,
  eachDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  fromDayNumber,
  isValidISODate,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  todayISO,
  toDayNumber,
  weekdayIndex,
  weekdayMon0,
} from '../src/domain/dates';

test('parseISO відхиляє некоректні дати', () => {
  assert.deepEqual(parseISO('2026-10-03'), { y: 2026, m: 10, d: 3 });
  assert.equal(parseISO('2026-02-29'), null);
  assert.equal(parseISO('2024-02-29')?.d, 29);
  assert.equal(parseISO('2026-13-01'), null);
  assert.equal(parseISO('2026-00-10'), null);
  assert.equal(parseISO('2026-4-5'), null);
  assert.equal(parseISO('hello'), null);
  assert.equal(isValidISODate('2026-10-03'), true);
  assert.equal(isValidISODate(20261003), false);
});

test('номер дня та зворотне перетворення', () => {
  assert.equal(toDayNumber('1970-01-01'), 0);
  assert.equal(toDayNumber('1970-01-02'), 1);
  assert.equal(fromDayNumber(0), '1970-01-01');
  assert.equal(fromDayNumber(toDayNumber('2026-10-03')), '2026-10-03');
  assert.equal(fromDayNumber(toDayNumber('1969-12-31')), '1969-12-31');
});

test('addDays і diffDays через межі місяців, років і перехід на літній час', () => {
  assert.equal(addDays('2026-10-03', 1), '2026-10-04');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2024-03-01', -1), '2024-02-29');
  // Україна переходить на літній час 29 березня 2026 та на зимовий 25 жовтня 2026
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(diffDays('2026-10-01', '2026-10-31'), 30);
  assert.equal(diffDays('2026-10-31', '2026-10-01'), -30);
  assert.equal(diffDays('2025-12-31', '2026-01-01'), 1);
});

test('день тижня: 3 жовтня 2026 — субота', () => {
  assert.equal(weekdayMon0('2026-10-03'), 5);
  assert.equal(weekdayMon0('2026-10-04'), 6); // неділя
  assert.equal(weekdayMon0('2026-10-05'), 0); // понеділок
  assert.equal(weekdayMon0('1970-01-01'), 3); // четвер
  assert.equal(weekdayMon0('1969-12-31'), 2); // середа (від'ємні номери днів)
  assert.equal(weekdayIndex('2026-10-04', 1), 6);
  assert.equal(weekdayIndex('2026-10-04', 0), 0); // неділя — перший день тижня
  assert.equal(weekdayIndex('2026-10-05', 0), 1);
});

test('початок і кінець тижня', () => {
  assert.equal(startOfWeek('2026-10-03', 1), '2026-09-28');
  assert.equal(endOfWeek('2026-10-03', 1), '2026-10-04');
  assert.equal(startOfWeek('2026-10-04', 1), '2026-09-28');
  assert.equal(startOfWeek('2026-10-05', 1), '2026-10-05');
  assert.equal(startOfWeek('2026-10-03', 0), '2026-09-27');
  assert.equal(endOfWeek('2026-10-03', 0), '2026-10-03');
  assert.equal(startOfWeek('2026-10-04', 0), '2026-10-04');
});

test('місяць і рік', () => {
  assert.equal(startOfMonth('2026-10-17'), '2026-10-01');
  assert.equal(endOfMonth('2026-10-17'), '2026-10-31');
  assert.equal(endOfMonth('2026-02-10'), '2026-02-28');
  assert.equal(endOfMonth('2024-02-10'), '2024-02-29');
  assert.equal(startOfYear('2026-10-17'), '2026-01-01');
  assert.equal(endOfYear('2026-10-17'), '2026-12-31');
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(1900, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
});

test('addMonths та addYears обрізають число до кінця місяця', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(addMonths('2026-10-15', 3), '2027-01-15');
  assert.equal(addMonths('2026-01-15', -2), '2025-11-15');
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28');
  assert.equal(addMonths('2026-12-05', 12), '2027-12-05');
  assert.equal(addYears('2024-02-29', 1), '2025-02-28');
  assert.equal(addYears('2026-10-03', -1), '2025-10-03');
});

test('eachDay включає обидва краї', () => {
  assert.deepEqual(eachDay('2026-02-27', '2026-03-02'), ['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
  assert.deepEqual(eachDay('2026-10-03', '2026-10-03'), ['2026-10-03']);
  assert.deepEqual(eachDay('2026-10-04', '2026-10-03'), []);
});

test('todayISO бере місцеву дату', () => {
  assert.equal(todayISO(new Date(2026, 9, 3, 23, 59, 59)), '2026-10-03');
  assert.equal(todayISO(new Date(2026, 9, 4, 0, 0, 1)), '2026-10-04');
  assert.equal(todayISO(new Date(2026, 0, 5, 12)), '2026-01-05');
});
