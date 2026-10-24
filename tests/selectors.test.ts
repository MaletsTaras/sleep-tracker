import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateDemoRecords } from '../src/domain/demo';
import { computeStats, getPeriod, type DayValue } from '../src/domain/stats';
import type { SleepRecord } from '../src/domain/types';
import { readoutFor, seriesToBars, weekdayBars } from '../src/state/chartData';
import {
  buildInsights,
  clockTimeLabel,
  dayValuesFor,
  greetingFor,
  groupByMonth,
  hasSource,
  isMonthAxisLabel,
  qualityOf,
  recordFor,
  suggestMinutes,
  summarizeRecent,
} from '../src/state/selectors';

function rec(date: string, minutes: number, source: SleepRecord['source'] = 'manual'): SleepRecord {
  return { date, minutes, source, meta: null, createdAt: 1, updatedAt: 1 };
}

const TODAY = '2026-10-03';

test('вибірка за джерелом', () => {
  const records = [rec('2026-10-03', 450), rec('2026-10-03', 470, 'watch'), rec('2026-10-02', 400)];
  assert.deepEqual(dayValuesFor(records, 'manual'), [
    { date: '2026-10-03', minutes: 450 },
    { date: '2026-10-02', minutes: 400 },
  ]);
  assert.deepEqual(dayValuesFor(records, 'watch'), [{ date: '2026-10-03', minutes: 470 }]);
  assert.equal(hasSource(records, 'watch'), true);
  assert.equal(hasSource(records.filter((r) => r.source === 'manual'), 'watch'), false);
  assert.equal(recordFor(records, '2026-10-03')?.minutes, 450);
  assert.equal(recordFor(records, '2026-10-03', 'watch')?.minutes, 470);
  assert.equal(recordFor(records, '2020-01-01'), undefined);
});

test('пропонована тривалість: медіана останніх семи, до 5 хвилин', () => {
  assert.equal(suggestMinutes([]), 450);
  assert.equal(suggestMinutes([rec('2026-10-01', 400, 'watch')]), 450, 'годинник не враховується');
  assert.equal(suggestMinutes([rec('2026-10-01', 423)]), 425);
  const eight = [
    rec('2026-09-20', 100), // найстаріший — відпадає
    rec('2026-09-26', 420),
    rec('2026-09-27', 430),
    rec('2026-09-28', 440),
    rec('2026-09-29', 450),
    rec('2026-09-30', 460),
    rec('2026-10-01', 470),
    rec('2026-10-02', 480),
  ];
  assert.equal(suggestMinutes(eight), 450);
  // парна кількість: середнє двох середніх
  assert.equal(suggestMinutes([rec('2026-10-01', 400), rec('2026-10-02', 450)]), 425);
});

test('привітання за годиною', () => {
  assert.equal(greetingFor(5), 'Доброго ранку');
  assert.equal(greetingFor(10), 'Доброго ранку');
  assert.equal(greetingFor(11), 'Добрий день');
  assert.equal(greetingFor(16), 'Добрий день');
  assert.equal(greetingFor(17), 'Добрий вечір');
  assert.equal(greetingFor(22), 'Добрий вечір');
  assert.equal(greetingFor(23), 'Доброї ночі');
  assert.equal(greetingFor(0), 'Доброї ночі');
  assert.equal(greetingFor(4), 'Доброї ночі');
});

test('якість ночі відносно цілі', () => {
  assert.equal(qualityOf(480, 480), 'good');
  assert.equal(qualityOf(600, 480), 'good');
  assert.equal(qualityOf(479, 480), 'near');
  assert.equal(qualityOf(420, 480), 'near');
  assert.equal(qualityOf(419, 480), 'low');
  assert.equal(qualityOf(0, 480), 'low');
});

test('групування історії за місяцями зберігає порядок і рахує середнє', () => {
  const groups = groupByMonth([
    rec('2026-10-03', 480),
    rec('2026-10-02', 420),
    rec('2026-09-30', 360),
    rec('2025-10-01', 300),
  ]);
  assert.deepEqual(groups.map((g) => [g.key, g.label, g.records.length, g.averageMinutes]), [
    ['2026-10', 'Жовтень 2026', 2, 450],
    ['2026-09', 'Вересень 2026', 1, 360],
    ['2025-10', 'Жовтень 2025', 1, 300],
  ]);
  assert.deepEqual(groupByMonth([]), []);
});

test('підписи осі місяця', () => {
  const labels = Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`).filter(isMonthAxisLabel);
  assert.deepEqual(labels.map((d) => d.slice(8)), ['01', '05', '10', '15', '20', '25', '30']);
});

test('час початку наступної поради', () => {
  assert.equal(clockTimeLabel(new Date(2026, 9, 4, 20, 0).getTime()), '20:00');
  assert.equal(clockTimeLabel(new Date(2026, 9, 4, 8, 5).getTime()), '08:05');
});

test('дані для графіків: підписи й тексти для зчитувача екрана', () => {
  const records: DayValue[] = [
    { date: '2026-09-28', minutes: 420 },
    { date: '2026-10-01', minutes: 480 },
    { date: '2026-10-03', minutes: 540 },
  ];
  const options = { today: TODAY, goalMinutes: 480 };

  const week = computeStats(records, getPeriod('week', TODAY, 1), options);
  const weekBars = seriesToBars(week.series, 'week');
  assert.deepEqual(weekBars.map((b) => b.label), ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']);
  assert.equal(weekBars[0].a11y, 'пн, 28 вер.: 7 год');
  assert.equal(weekBars[1].a11y, 'вт, 29 вер.: немає запису');
  assert.equal(weekBars[6].future, true);

  const month = computeStats(records, getPeriod('month', TODAY), options);
  const monthBars = seriesToBars(month.series, 'month');
  assert.equal(monthBars.length, 31);
  assert.deepEqual(monthBars.filter((b) => b.label).map((b) => b.label), ['1', '5', '10', '15', '20', '25', '30']);

  const year = computeStats(records, getPeriod('year', TODAY), options);
  const yearBars = seriesToBars(year.series, 'year');
  assert.equal(yearBars.length, 12);
  assert.equal(yearBars[9].a11y, 'жовтень: у середньому 8 год 30 хв'); // (480 + 540) / 2
  assert.equal(yearBars[0].a11y, 'січень: немає записів');
});

test('підпис над графіком при виборі стовпчика', () => {
  const stats = computeStats([{ date: '2026-10-03', minutes: 455 }], getPeriod('week', TODAY, 1), { today: TODAY, goalMinutes: 480 });
  assert.deepEqual(readoutFor(stats.series[5], 'week'), { title: 'Субота, 3 жовтня', value: '7 год 35 хв' });
  assert.deepEqual(readoutFor(stats.series[0], 'week'), { title: 'Понеділок, 28 вересня', value: 'Немає запису' });
  const year = computeStats([{ date: '2026-10-03', minutes: 455 }], getPeriod('year', TODAY), { today: TODAY, goalMinutes: 480 });
  assert.deepEqual(readoutFor(year.series[9], 'year'), { title: 'Жовтень 2026', value: '7 год 35 хв у середньому' });
  assert.deepEqual(readoutFor(year.series[0], 'year'), { title: 'Січень 2026', value: 'Немає записів' });
});

test('середнє за днями тижня у порядку від обраного першого дня', () => {
  const averages = [420, 430, 440, 450, 460, 540, null];
  const monday = weekdayBars(averages, 1);
  assert.deepEqual(monday.map((b) => b.label), ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']);
  assert.equal(monday[6].value, null);
  assert.equal(monday[6].a11y, 'неділя: немає даних');
  const sunday = weekdayBars(averages, 0);
  assert.deepEqual(sunday.map((b) => b.label), ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']);
  assert.equal(sunday[0].value, null);
  assert.equal(sunday[6].value, 540);
  assert.equal(sunday[6].a11y, 'субота: у середньому 9 год');
});

test('висновки: порожньо при малій кількості записів', () => {
  const stats = computeStats([{ date: TODAY, minutes: 480 }], getPeriod('month', TODAY), { today: TODAY, goalMinutes: 480 });
  assert.deepEqual(buildInsights(stats), []);
});

test('висновки: стабільність, ціль, дні тижня — за місяць реалістичних даних', () => {
  const demo = generateDemoRecords(TODAY, 120).map((r) => ({ date: r.date, minutes: r.minutes }));
  const stats = computeStats(demo, getPeriod('month', '2026-09-15'), { today: TODAY, goalMinutes: 480 });
  const insights = buildInsights(stats);
  assert.ok(insights.length >= 1 && insights.length <= 3, `кількість: ${insights.length}`);
  for (const line of insights) {
    assert.ok(line.endsWith('.'), line);
    assert.ok(!line.includes('undefined') && !line.includes('NaN'), line);
  }
});

test('висновки: сильно нестабільний сон і день тижня з найдовшим сном', () => {
  const swing: DayValue[] = [];
  for (let day = 1; day <= 28; day += 1) {
    const date = `2026-09-${String(day).padStart(2, '0')}`;
    swing.push({ date, minutes: day % 2 === 0 ? 300 : 540 });
  }
  const stats = computeStats(swing, getPeriod('month', '2026-09-15'), { today: TODAY, goalMinutes: 480 });
  const joined = buildInsights(stats).join(' | ');
  assert.match(joined, /сильно коливається/);
  const steady: DayValue[] = swing.map((d) => ({ date: d.date, minutes: 480 }));
  const steadyStats = computeStats(steady, getPeriod('month', '2026-09-15'), { today: TODAY, goalMinutes: 480 });
  const steadyText = buildInsights(steadyStats).join(' | ');
  assert.match(steadyText, /дуже стабільний/);
  assert.match(steadyText, /100%/);
});

test('висновки: найдовше й найкоротше за днями тижня', () => {
  // Вересень 2026: усі суботи й неділі — по 9 год, будні — по 7 год.
  const records: DayValue[] = [];
  for (let day = 1; day <= 30; day += 1) {
    const date = `2026-09-${String(day).padStart(2, '0')}`;
    const weekday = new Date(Date.UTC(2026, 8, day)).getUTCDay(); // 0 = неділя
    records.push({ date, minutes: weekday === 0 || weekday === 6 ? 540 : 420 });
  }
  const stats = computeStats(records, getPeriod('month', '2026-09-15'), { today: TODAY, goalMinutes: 480 });
  const first = buildInsights(stats)[0];
  assert.match(first, /^Найдовше ви спите у (суботу|неділю) \(в середньому 9 год\), найкоротше — у (понеділок|вівторок|середу|четвер|п’ятницю) \(7 год\)\.$/);
});

test('підсумок за 7 днів: середнє, ціль і порівняння з попередніми 7 днями', () => {
  const days: DayValue[] = [
    // останні 7 днів (27.09–03.10)
    { date: '2026-10-03', minutes: 480 },
    { date: '2026-10-02', minutes: 420 },
    { date: '2026-10-01', minutes: 540 },
    { date: '2026-09-30', minutes: 360 },
    // попередні 7 днів (20.09–26.09)
    { date: '2026-09-26', minutes: 400 },
    { date: '2026-09-22', minutes: 440 },
    // давніше — не враховується
    { date: '2026-08-01', minutes: 100 },
  ];
  const summary = summarizeRecent(days, TODAY, 480);
  assert.equal(summary.logged, 4);
  assert.equal(summary.average, 450); // (480 + 420 + 540 + 360) / 4
  assert.equal(summary.goalHits, 2); // 480 і 540
  assert.equal(summary.previousAverage, 420);
  assert.equal(summary.delta, 30);
});

test('підсумок за 7 днів без записів або без попереднього періоду', () => {
  assert.deepEqual(summarizeRecent([], TODAY, 480), { logged: 0, average: null, goalHits: 0, previousAverage: null, delta: null });
  const onlyNow = summarizeRecent([{ date: '2026-10-03', minutes: 455 }], TODAY, 480);
  assert.equal(onlyNow.average, 455);
  assert.equal(onlyNow.previousAverage, null);
  assert.equal(onlyNow.delta, null);
  assert.equal(onlyNow.goalHits, 0);
});
