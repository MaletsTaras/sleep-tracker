import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canGoNext,
  computeStats,
  getPeriod,
  isCurrentPeriod,
  periodLabel,
  recentDays,
  shiftPeriod,
  type DayValue,
} from '../src/domain/stats';
import { computeStreaks } from '../src/domain/streaks';

const TODAY = '2026-10-03'; // субота
const GOAL = 480;

/** Поточний тиждень: пн 28.09 – сб 03.10 (неділя ще не настала). */
const THIS_WEEK: DayValue[] = [
  { date: '2026-09-28', minutes: 420 },
  { date: '2026-09-29', minutes: 450 },
  { date: '2026-09-30', minutes: 390 },
  { date: '2026-10-01', minutes: 480 },
  { date: '2026-10-02', minutes: 300 },
  { date: '2026-10-03', minutes: 540 },
];

/** Минулий тиждень: пн 21.09 – нд 27.09, середнє 410. */
const LAST_WEEK: DayValue[] = [
  { date: '2026-09-21', minutes: 400 },
  { date: '2026-09-22', minutes: 410 },
  { date: '2026-09-23', minutes: 420 },
  { date: '2026-09-24', minutes: 410 },
  { date: '2026-09-25', minutes: 400 },
  { date: '2026-09-26', minutes: 430 },
  { date: '2026-09-27', minutes: 400 },
];

const options = { today: TODAY, goalMinutes: GOAL };

test('періоди: тиждень, місяць, рік', () => {
  const week = getPeriod('week', TODAY, 1);
  assert.deepEqual([week.start, week.end], ['2026-09-28', '2026-10-04']);
  const weekSun = getPeriod('week', TODAY, 0);
  assert.deepEqual([weekSun.start, weekSun.end], ['2026-09-27', '2026-10-03']);
  const month = getPeriod('month', TODAY);
  assert.deepEqual([month.start, month.end], ['2026-10-01', '2026-10-31']);
  const year = getPeriod('year', TODAY);
  assert.deepEqual([year.start, year.end], ['2026-01-01', '2026-12-31']);
});

test('навігація по періодах', () => {
  const week = getPeriod('week', TODAY, 1);
  const prev = shiftPeriod(week, -1, 1);
  assert.deepEqual([prev.start, prev.end], ['2026-09-21', '2026-09-27']);
  const next = shiftPeriod(prev, 1, 1);
  assert.deepEqual([next.start, next.end], [week.start, week.end]);

  const jan31 = getPeriod('month', '2026-03-31');
  const feb = shiftPeriod(jan31, -1);
  assert.deepEqual([feb.start, feb.end], ['2026-02-01', '2026-02-28']);

  assert.equal(isCurrentPeriod(week, TODAY), true);
  assert.equal(isCurrentPeriod(prev, TODAY), false);
  assert.equal(canGoNext(week, TODAY), false);
  assert.equal(canGoNext(prev, TODAY), true);

  assert.equal(periodLabel(week, TODAY), '28 вер. – 4 жовт.');
  assert.equal(periodLabel(getPeriod('month', TODAY), TODAY), 'Жовтень 2026');
  assert.equal(periodLabel(getPeriod('year', TODAY), TODAY), '2026');
});

test('тиждень: усі показники', () => {
  const stats = computeStats([...LAST_WEEK, ...THIS_WEEK], getPeriod('week', TODAY, 1), options);

  assert.equal(stats.totalDays, 7);
  assert.equal(stats.elapsedEnd, TODAY);
  assert.equal(stats.elapsedDays, 6);
  assert.equal(stats.loggedDays, 6);
  assert.equal(stats.missingDays, 0);
  assert.equal(stats.totalMinutes, 2580);
  assert.equal(stats.averageMinutes, 430);
  assert.equal(stats.medianMinutes, 435);
  assert.equal(stats.stdDevMinutes, 75); // sqrt(5600) ≈ 74.8
  assert.deepEqual(stats.longest, { date: '2026-10-03', minutes: 540 });
  assert.deepEqual(stats.shortest, { date: '2026-10-02', minutes: 300 });
  assert.equal(stats.goalMetDays, 2);
  assert.equal(stats.goalMetRate, 2 / 6);
  assert.equal(stats.sleepDebtMinutes, 60 + 30 + 90 + 0 + 180 + 0);

  // розподіл: 5–6 год — 1 (300), 6–7 — 1 (390), 7–8 — 2 (420, 450), 8–9 — 1 (480), 9–10 — 1 (540)
  assert.deepEqual(
    stats.buckets.map((b) => [b.label, b.count]),
    [['<4', 0], ['4–5', 0], ['5–6', 1], ['6–7', 1], ['7–8', 2], ['8–9', 1], ['9–10', 1], ['10+', 0]],
  );
  assert.equal(stats.buckets.reduce((sum, b) => sum + b.count, 0), stats.loggedDays);

  assert.deepEqual(stats.weekdayAverages, [420, 450, 390, 480, 300, 540, null]);

  assert.equal(stats.previousAverageMinutes, 410);
  assert.equal(stats.deltaMinutes, 20);

  assert.equal(stats.series.length, 7);
  assert.deepEqual(
    stats.series.map((p) => p.label),
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
  );
  assert.equal(stats.series[5].value, 540);
  assert.equal(stats.series[6].value, null);
  assert.equal(stats.series[6].future, true);
  assert.equal(stats.series[0].future, false);
});

test('пропущені дні рахуються тільки до сьогодні', () => {
  const sparse: DayValue[] = [
    { date: '2026-09-29', minutes: 400 },
    { date: '2026-10-02', minutes: 500 },
  ];
  const stats = computeStats(sparse, getPeriod('week', TODAY, 1), options);
  assert.equal(stats.elapsedDays, 6);
  assert.equal(stats.loggedDays, 2);
  assert.equal(stats.missingDays, 4);
  assert.equal(stats.averageMinutes, 450);
  assert.equal(stats.series[0].value, null);
  assert.equal(stats.series[0].future, false);
});

test('порожній період не ламає розрахунки', () => {
  const stats = computeStats([], getPeriod('week', TODAY, 1), options);
  assert.equal(stats.loggedDays, 0);
  assert.equal(stats.averageMinutes, null);
  assert.equal(stats.medianMinutes, null);
  assert.equal(stats.stdDevMinutes, null);
  assert.equal(stats.longest, null);
  assert.equal(stats.shortest, null);
  assert.equal(stats.goalMetRate, null);
  assert.equal(stats.deltaMinutes, null);
  assert.equal(stats.sleepDebtMinutes, 0);
  assert.equal(stats.buckets.every((b) => b.count === 0), true);
  assert.deepEqual(stats.weekdayAverages, [null, null, null, null, null, null, null]);
});

test('один запис: відхилення немає', () => {
  const stats = computeStats([{ date: TODAY, minutes: 480 }], getPeriod('week', TODAY, 1), options);
  assert.equal(stats.stdDevMinutes, null);
  assert.equal(stats.averageMinutes, 480);
  assert.equal(stats.goalMetDays, 1); // рівно ціль зараховується
  assert.equal(stats.goalMetRate, 1);
});

test('межі груп: рівно 6:00 належить групі 6–7, а 5:59 — групі 5–6', () => {
  const edge: DayValue[] = [
    { date: '2026-10-01', minutes: 360 },
    { date: '2026-10-02', minutes: 359 },
    { date: '2026-10-03', minutes: 600 },
  ];
  const stats = computeStats(edge, getPeriod('week', TODAY, 1), options);
  const counts = Object.fromEntries(stats.buckets.map((b) => [b.label, b.count]));
  assert.equal(counts['6–7'], 1);
  assert.equal(counts['5–6'], 1);
  assert.equal(counts['10+'], 1);
});

test('записи за межами періоду та з майбутнього ігноруються', () => {
  const extra: DayValue[] = [
    ...THIS_WEEK,
    { date: '2026-10-04', minutes: 999 }, // майбутнє
    { date: '2026-09-27', minutes: 999 }, // минулий тиждень
  ];
  const stats = computeStats(extra, getPeriod('week', TODAY, 1), options);
  assert.equal(stats.loggedDays, 6);
  assert.equal(stats.longest?.minutes, 540);
});

test('місяць: підписи по днях і кількість днів', () => {
  const stats = computeStats(THIS_WEEK, getPeriod('month', TODAY), options);
  assert.equal(stats.totalDays, 31);
  assert.equal(stats.elapsedDays, 3);
  assert.equal(stats.loggedDays, 3); // 1, 2, 3 жовтня
  assert.equal(stats.series.length, 31);
  assert.equal(stats.series[0].label, '1');
  assert.equal(stats.series[30].label, '31');
  assert.equal(stats.series[2].value, 540);
  assert.equal(stats.series[3].future, true);
  // попередній місяць (вересень): записи 21–30 вер.
  const full = [...LAST_WEEK, ...THIS_WEEK];
  const withPrev = computeStats(full, getPeriod('month', TODAY), options);
  const sepAvg = Math.round((400 + 410 + 420 + 410 + 400 + 430 + 400 + 420 + 450 + 390) / 10);
  assert.equal(withPrev.previousAverageMinutes, sepAvg);
});

test('рік: помісячні середні', () => {
  const records: DayValue[] = [
    { date: '2026-01-10', minutes: 400 },
    { date: '2026-01-20', minutes: 500 },
    { date: '2026-03-05', minutes: 480 },
    { date: '2026-09-30', minutes: 300 },
    { date: '2026-10-01', minutes: 420 },
    { date: '2025-12-31', minutes: 100 },
  ];
  const stats = computeStats(records, getPeriod('year', TODAY), options);
  assert.equal(stats.series.length, 12);
  assert.equal(stats.series[0].value, 450);
  assert.equal(stats.series[0].count, 2);
  assert.equal(stats.series[1].value, null);
  assert.equal(stats.series[2].value, 480);
  assert.equal(stats.series[8].value, 300);
  assert.equal(stats.series[9].value, 420);
  assert.equal(stats.series[10].future, true);
  assert.equal(stats.series[9].future, false);
  assert.equal(stats.series[0].label, 'С');
  assert.equal(stats.totalDays, 365);
  assert.equal(stats.loggedDays, 5);
  assert.equal(stats.previousAverageMinutes, 100); // 2025
});

test('минулий період повністю враховується, навіть якщо сьогодні поза ним', () => {
  const lastWeek = getPeriod('week', '2026-09-24', 1);
  const stats = computeStats(LAST_WEEK, lastWeek, options);
  assert.equal(stats.elapsedDays, 7);
  assert.equal(stats.loggedDays, 7);
  assert.equal(stats.averageMinutes, 410);
  assert.equal(stats.series.every((p) => !p.future), true);
});

test('період у майбутньому порожній', () => {
  const stats = computeStats(THIS_WEEK, getPeriod('week', '2026-10-12', 1), options);
  assert.equal(stats.elapsedEnd, null);
  assert.equal(stats.elapsedDays, 0);
  assert.equal(stats.loggedDays, 0);
  assert.equal(stats.series.every((p) => p.future), true);
});

test('останні 7 днів', () => {
  const days = recentDays(THIS_WEEK, TODAY, 7);
  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-09-27');
  assert.equal(days[0].value, null);
  assert.equal(days[6].date, TODAY);
  assert.equal(days[6].value, 540);
  assert.equal(days[6].label, 'Сб');
});

test('серії записів', () => {
  assert.deepEqual(computeStreaks([], TODAY), { current: 0, best: 0 });
  assert.deepEqual(
    computeStreaks(['2026-10-01', '2026-10-02', '2026-10-03'], TODAY),
    { current: 3, best: 3 },
  );
  // сьогодні ще не записано — серія не обривається
  assert.deepEqual(computeStreaks(['2026-10-01', '2026-10-02'], TODAY), { current: 2, best: 2 });
  // пропущено вчора — серії немає
  assert.deepEqual(computeStreaks(['2026-09-30', '2026-10-01'], TODAY), { current: 0, best: 2 });
  // найкраща серія в минулому
  assert.deepEqual(
    computeStreaks(['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-10-03'], TODAY),
    { current: 1, best: 4 },
  );
  // дублікати та майбутні дати ігноруються
  assert.deepEqual(computeStreaks(['2026-10-03', '2026-10-03', '2026-10-05'], TODAY), { current: 1, best: 1 });
});
