import assert from 'node:assert/strict';
import { test } from 'node:test';

import { moonLitPath, niceScale, roundedTopBarPath } from '../src/domain/chartScale';

const H = 60;

test('шкала осі Y: мінімум 8 год і круглі мітки', () => {
  assert.deepEqual(niceScale(0), { top: 8 * H, ticks: [0, 2 * H, 4 * H, 6 * H, 8 * H] });
  assert.deepEqual(niceScale(Number.NaN).top, 8 * H);
  assert.equal(niceScale(7 * H).top, 8 * H);
  assert.equal(niceScale(8 * H).top, 8 * H);
  // 8 год 1 хв уже потребує 10 год
  assert.deepEqual(niceScale(8 * H + 1), { top: 10 * H, ticks: [0, 2 * H, 4 * H, 6 * H, 8 * H, 10 * H] });
  assert.equal(niceScale(9.5 * H).top, 10 * H);
  // вище 10 год — крок 4 год, верх кратний 4
  assert.deepEqual(niceScale(10.5 * H), { top: 12 * H, ticks: [0, 4 * H, 8 * H, 12 * H] });
  assert.deepEqual(niceScale(14 * H), { top: 16 * H, ticks: [0, 4 * H, 8 * H, 12 * H, 16 * H] });
  assert.deepEqual(niceScale(24 * H).ticks.at(-1), 24 * H);
  // верх завжди не менший за максимум
  for (let minutes = 0; minutes <= 24 * H; minutes += 7) {
    const { top, ticks } = niceScale(minutes);
    assert.ok(top >= minutes, `верх ${top} < ${minutes}`);
    assert.equal(ticks[0], 0);
    assert.equal(ticks.at(-1), top);
  }
});

test('місяць: форми для різних часток', () => {
  assert.equal(moonLitPath(50, 50, 40, 0), null);
  assert.equal(moonLitPath(50, 50, 40, -1), null);
  assert.equal(moonLitPath(50, 50, 40, Number.NaN), null);
  assert.match(moonLitPath(50, 50, 40, 1)!, /^M 10 50 A 40 40 0 1 1 90 50 A 40 40 0 1 1 10 50 Z$/);
  assert.match(moonLitPath(50, 50, 40, 1.7)!, /A 40 40 0 1 1 90 50/);

  // півмісяць: еліпс вироджується в пряму
  assert.equal(moonLitPath(50, 50, 40, 0.5), 'M 50 10 A 40 40 0 0 1 50 90 A 0.000 40 0 0 1 50 10 Z');
  // серп (менше половини): дуга терміна́тора йде проти годинникової стрілки
  assert.equal(moonLitPath(50, 50, 40, 0.25), 'M 50 10 A 40 40 0 0 1 50 90 A 20.000 40 0 0 0 50 10 Z');
  // горб (більше половини): терміна́тор вигинається вліво
  assert.equal(moonLitPath(50, 50, 40, 0.75), 'M 50 10 A 40 40 0 0 1 50 90 A 20.000 40 0 0 1 50 10 Z');
});

test('стовпчик із заокругленою верхівкою', () => {
  assert.equal(roundedTopBarPath(10, 100, 20, 50, 4), 'M 10 100 V 54 A 4 4 0 0 1 14 50 H 26 A 4 4 0 0 1 30 54 V 100 Z');
  // радіус не більший за половину ширини й висоту
  assert.equal(roundedTopBarPath(0, 100, 6, 50, 4), 'M 0 100 V 53 A 3 3 0 0 1 3 50 H 3 A 3 3 0 0 1 6 53 V 100 Z');
  assert.equal(roundedTopBarPath(0, 100, 20, 2, 4), 'M 0 100 V 100 A 2 2 0 0 1 2 98 H 18 A 2 2 0 0 1 20 100 V 100 Z');
  // нульова висота — плоска фігура без дуг
  assert.equal(roundedTopBarPath(0, 100, 20, 0, 4), 'M 0 100 V 100 H 20 V 100 Z');
  assert.equal(roundedTopBarPath(0, 100, 20, -5, 4), 'M 0 100 V 100 H 20 V 100 Z');
});
