import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffDays, weekdayIndex } from '../src/domain/dates';
import { HEAT_LABELS, HEAT_LEVELS, buildYearHeatmap, cellAt, heatLevel } from '../src/domain/heatmap';

test('групи за тривалістю: межі 6, 7, 8 і 9 годин', () => {
  assert.equal(heatLevel(0), 0);
  assert.equal(heatLevel(359), 0);
  assert.equal(heatLevel(360), 1);
  assert.equal(heatLevel(419), 1);
  assert.equal(heatLevel(420), 2);
  assert.equal(heatLevel(479), 2);
  assert.equal(heatLevel(480), 3);
  assert.equal(heatLevel(539), 3);
  assert.equal(heatLevel(540), 4);
  assert.equal(heatLevel(1440), 4);
  assert.equal(HEAT_LABELS.length, HEAT_LEVELS);
});

test('2025 рік, тиждень з понеділка: 1 січня — середа, 53 стовпці', () => {
  const heat = buildYearHeatmap([], 2025, '2025-12-31', 1);
  assert.equal(heat.cells.length, 365);
  assert.equal(heat.weeks, 53);
  assert.equal(heat.lead, 2);
  assert.deepEqual([heat.cells[0].col, heat.cells[0].row], [0, 2]);
  assert.deepEqual([heat.cells[364].col, heat.cells[364].row], [52, 2]);
});

test('тиждень з неділі зсуває рядки: 1 січня 2025 стає рядком 3', () => {
  const heat = buildYearHeatmap([], 2025, '2025-12-31', 0);
  assert.equal(heat.lead, 3);
  assert.deepEqual([heat.cells[0].col, heat.cells[0].row], [0, 3]);
  assert.equal(heat.weeks, 53);
});

test('високосний рік, що починається з неділі, потребує 54 стовпці', () => {
  const heat = buildYearHeatmap([], 2012, '2012-12-31', 1);
  assert.equal(heat.cells.length, 366);
  assert.equal(heat.weeks, 54);
  assert.deepEqual([heat.cells[0].col, heat.cells[0].row], [0, 6]);
  // 31 грудня 2012 — понеділок: перший рядок останнього, 54-го, стовпця.
  assert.deepEqual([heat.cells[365].col, heat.cells[365].row], [53, 0]);
});

test('кожен день стоїть у своєму рядку й стовпці без накладань', () => {
  for (const weekStartsOn of [0, 1] as const) {
    for (const year of [2023, 2024, 2025, 2026]) {
      const heat = buildYearHeatmap([], year, `${year}-12-31`, weekStartsOn);
      const seen = new Set<string>();
      for (const cell of heat.cells) {
        assert.equal(cell.row, weekdayIndex(cell.date, weekStartsOn));
        assert.ok(cell.row >= 0 && cell.row <= 6);
        assert.ok(cell.col >= 0 && cell.col < heat.weeks);
        const key = `${cell.col}:${cell.row}`;
        assert.ok(!seen.has(key), `накладання ${key}`);
        seen.add(key);
        assert.equal(cellAt(heat, cell.col, cell.row)?.date, cell.date);
      }
    }
  }
});

test('порожні клітинки до 1 січня й після 31 грудня повертають null', () => {
  const heat = buildYearHeatmap([], 2025, '2025-12-31', 1);
  assert.equal(cellAt(heat, 0, 0), null);
  assert.equal(cellAt(heat, 0, 1), null);
  assert.equal(cellAt(heat, 0, 2)?.date, '2025-01-01');
  assert.equal(cellAt(heat, 52, 2)?.date, '2025-12-31');
  assert.equal(cellAt(heat, 52, 3), null);
  assert.equal(cellAt(heat, 53, 0), null);
  assert.equal(cellAt(heat, -1, 0), null);
  assert.equal(cellAt(heat, 0, 7), null);
  assert.equal(cellAt(heat, 1.5, 0), null);
});

test('місяці: перша клітинка кожного місяця лежить у позначеному стовпці', () => {
  const heat = buildYearHeatmap([], 2026, '2026-12-31', 1);
  assert.equal(heat.months.length, 12);
  assert.equal(heat.months[0].col, 0);
  for (let i = 0; i < 12; i += 1) {
    const day = `2026-${String(i + 1).padStart(2, '0')}-01`;
    const cell = heat.cells.find((item) => item.date === day);
    assert.ok(cell);
    assert.equal(heat.months[i].col, cell.col);
    if (i > 0) assert.ok(heat.months[i].col > heat.months[i - 1].col, 'стовпці місяців зростають');
  }
});

test('підрахунок ночей і груп; майбутні дні й чужі роки не рахуються', () => {
  const today = '2026-10-05';
  const heat = buildYearHeatmap(
    [
      { date: '2026-01-01', minutes: 300 }, // <6
      { date: '2026-01-02', minutes: 360 }, // 6–7
      { date: '2026-01-03', minutes: 450 }, // 7–8
      { date: '2026-01-04', minutes: 480 }, // 8–9
      { date: '2026-01-05', minutes: 600 }, // 9+
      { date: '2026-10-05', minutes: 420 }, // сьогодні: 7–8
      { date: '2026-10-06', minutes: 500 }, // майбутнє — ігнорується
      { date: '2025-12-31', minutes: 480 }, // інший рік
    ],
    2026,
    today,
    1,
  );
  assert.equal(heat.nights, 6);
  assert.deepEqual(heat.levelCounts, [1, 1, 2, 1, 1]);
  assert.equal(heat.levelCounts.reduce((sum, n) => sum + n, 0), heat.nights);

  const future = heat.cells.find((cell) => cell.date === '2026-10-06');
  assert.equal(future?.future, true);
  assert.equal(future?.minutes, null);
  assert.equal(future?.level, null);

  const missing = heat.cells.find((cell) => cell.date === '2026-01-06');
  assert.equal(missing?.future, false);
  assert.equal(missing?.minutes, null);
  assert.equal(missing?.level, null);

  const logged = heat.cells.find((cell) => cell.date === '2026-01-04');
  assert.equal(logged?.minutes, 480);
  assert.equal(logged?.level, 3);
});

test('запис із 0 хвилин — це записана ніч у найкоротшій групі', () => {
  const heat = buildYearHeatmap([{ date: '2026-03-03', minutes: 0 }], 2026, '2026-12-31', 1);
  assert.equal(heat.nights, 1);
  assert.deepEqual(heat.levelCounts, [1, 0, 0, 0, 0]);
});

test('позиція за датою збігається з математикою тижнів', () => {
  const heat = buildYearHeatmap([], 2026, '2026-12-31', 1);
  const gridStart = '2025-12-29'; // понеділок тижня, у якому 1 січня 2026
  for (const cell of heat.cells) {
    assert.equal(cell.col * 7 + cell.row, diffDays(gridStart, cell.date));
  }
});
