/**
 * Ротація порад: кожні 2 години (за місцевим часом) показується наступна порада.
 * Вибір детермінований — той самий «слот» завжди дає ту саму пораду, тож вона не стрибає
 * при перезапуску застосунку, а за один цикл кожна порада з'являється рівно раз, у випадковому порядку.
 */

import { seededShuffle } from '../domain/random';

export const ROTATION_HOURS = 2;
const SLOT_MS = ROTATION_HOURS * 3_600_000;

/**
 * Номер двогодинного слота за місцевим часом.
 * `tzOffsetMinutes` — значення `Date#getTimezoneOffset()` (хвилини від місцевого часу до UTC, для Києва влітку −180).
 */
export function slotIndex(nowMs: number, tzOffsetMinutes: number): number {
  return Math.floor((nowMs - tzOffsetMinutes * 60_000) / SLOT_MS);
}

/** Момент (UTC, мс), коли почнеться наступний слот. */
export function nextSlotStart(nowMs: number, tzOffsetMinutes: number): number {
  return (slotIndex(nowMs, tzOffsetMinutes) + 1) * SLOT_MS + tzOffsetMinutes * 60_000;
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Порядок показу в межах циклу; перший елемент не збігається з останнім елементом попереднього циклу. */
function cycleOrder(n: number, cycle: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  const order = seededShuffle(indices, 0x9e3779b1 ^ cycle);
  if (n > 2) {
    const prevLast = seededShuffle(indices, 0x9e3779b1 ^ (cycle - 1))[n - 1];
    if (order[0] === prevLast) [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

/** Вибирає елемент для слота; для порожнього списку повертає null. */
export function pickBySlot<T>(items: readonly T[], slot: number): T | null {
  const n = items.length;
  if (n === 0) return null;
  if (n <= 2) return items[mod(slot, n)];
  const cycle = Math.floor(slot / n);
  return items[cycleOrder(n, cycle)[mod(slot, n)]];
}
