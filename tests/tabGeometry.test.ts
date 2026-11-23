import assert from 'node:assert/strict';
import { test } from 'node:test';

import { positionToX, settleTarget, tabLayout, xToPosition } from '../src/ui/tabGeometry';

const layout = tabLayout({ barWidth: 360 - 32, border: 1, pad: 6, plusSlot: 62, count: 4, plusAfter: 2 });

test('слоти вкладок: однакова ширина, «+» розсуває другу пару', () => {
  assert.ok(Math.abs(layout.slot - (328 - 2 - 12 - 62) / 4) < 1e-9);
  assert.equal(layout.lefts[0], 6);
  assert.ok(Math.abs(layout.lefts[1] - layout.lefts[0] - layout.slot) < 1e-9);
  // між другою й третьою вкладками — місце під кнопку «+»
  assert.ok(Math.abs(layout.lefts[2] - layout.lefts[1] - layout.slot - 62) < 1e-9);
  assert.ok(Math.abs(layout.lefts[3] - layout.lefts[2] - layout.slot) < 1e-9);
  // права крайня вкладка закінчується на внутрішньому відступі
  assert.ok(Math.abs(layout.lefts[3] + layout.slot - (328 - 2 - 6)) < 1e-9);
});

test('положення ↔ координата: цілі значення збігаються з центрами, між ними лінійно', () => {
  layout.centers.forEach((center, i) => assert.ok(Math.abs(positionToX(i, layout.centers) - center) < 1e-9));
  const mid = positionToX(1.5, layout.centers);
  assert.ok(Math.abs(mid - (layout.centers[1] + layout.centers[2]) / 2) < 1e-9);
  assert.equal(positionToX(-3, layout.centers), layout.centers[0]);
  assert.equal(positionToX(9, layout.centers), layout.centers[3]);
});

test('координата → положення: зворотне перетворення й обмеження краями', () => {
  for (const position of [0, 0.25, 0.8, 1, 1.5, 2.2, 3]) {
    const back = xToPosition(positionToX(position, layout.centers), layout.centers);
    assert.ok(Math.abs(back - position) < 1e-9, `${position} → ${back}`);
  }
  assert.equal(xToPosition(-50, layout.centers), 0);
  assert.equal(xToPosition(9999, layout.centers), 3);
});

test('після відпускання: за замовчуванням до найближчої, швидкий змах — до сусідньої, не далі', () => {
  assert.equal(settleTarget(1.2, 0, 3), 1);
  assert.equal(settleTarget(1.6, 0, 3), 2);
  assert.equal(settleTarget(1.2, 0.01, 3), 2); // швидкий змах праворуч (0.01 вкладки/мс)
  assert.equal(settleTarget(1.8, -0.01, 3), 1); // і ліворуч
  assert.equal(settleTarget(1.2, 0.5, 3), 2); // дуже швидкий змах усе одно лише на одну вкладку
  assert.equal(settleTarget(2, 0.5, 3), 3);
  assert.equal(settleTarget(0, -1, 3), 0);
  assert.equal(settleTarget(3, 1, 3), 3);
  assert.equal(settleTarget(2.9, 1, 3), 3); // не далі за останню вкладку
});
