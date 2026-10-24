import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOCAL_TIPS, LocalTipsProvider } from '../src/tips/localTips';
import { createTipsProvider, FallbackTipsProvider } from '../src/tips/provider';
import { parseTipsFeed, RemoteTipsProvider, type FetchLike } from '../src/tips/remote';
import { nextSlotStart, pickBySlot, ROTATION_HOURS, slotIndex } from '../src/tips/rotation';
import type { KeyValueStore, Tip } from '../src/tips/types';

const HOUR = 3_600_000;

test('вбудований набір: унікальні id, коректні тексти', () => {
  const ids = new Set(LOCAL_TIPS.map((t) => t.id));
  assert.equal(ids.size, LOCAL_TIPS.length);
  assert.ok(LOCAL_TIPS.length >= 30);
  for (const tip of LOCAL_TIPS) {
    assert.ok(tip.text.length >= 40 && tip.text.length <= 220, `${tip.id}: довжина ${tip.text.length}`);
    assert.ok(tip.kind === 'tip' || tip.kind === 'fact');
    assert.ok(!/\s{2,}/.test(tip.text), `${tip.id}: подвійні пробіли`);
    assert.ok(/[.!?)]$/.test(tip.text), `${tip.id}: немає крапки в кінці`);
  }
  assert.ok(LOCAL_TIPS.some((t) => t.kind === 'tip') && LOCAL_TIPS.some((t) => t.kind === 'fact'));
});

test('слоти: зміна кожні 2 години за місцевим часом (Київ, UTC+3)', () => {
  assert.equal(ROTATION_HOURS, 2);
  const offset = -180; // getTimezoneOffset() для UTC+3
  // 2026-10-03 09:59 за Києвом = 06:59 UTC
  const a = Date.UTC(2026, 9, 3, 6, 59);
  const b = Date.UTC(2026, 9, 3, 7, 0); // 10:00 за Києвом — початок нового слота
  assert.equal(slotIndex(b, offset), slotIndex(a, offset) + 1);
  assert.equal(slotIndex(Date.UTC(2026, 9, 3, 5, 0), offset), slotIndex(a, offset)); // 08:00 — той самий слот
  assert.equal(nextSlotStart(a, offset), b);
  assert.equal(nextSlotStart(b, offset), b + 2 * HOUR);
  // у UTC слоти зміщуються на кратні години
  assert.equal(nextSlotStart(Date.UTC(2026, 9, 3, 6, 59), 0), Date.UTC(2026, 9, 3, 8, 0));
});

test('вибір за слотом: рівно раз за цикл, без повторів поспіль, детерміновано', () => {
  const items = Array.from({ length: 17 }, (_, i) => `t${i}`);
  const n = items.length;
  for (const cycle of [0, 1, 5, 6300]) {
    const seen = new Set<string>();
    for (let i = 0; i < n; i += 1) seen.add(pickBySlot(items, cycle * n + i)!);
    assert.equal(seen.size, n, `цикл ${cycle}`);
  }
  let prev: string | null = null;
  for (let slot = 100_000; slot < 100_000 + n * 40; slot += 1) {
    const cur = pickBySlot(items, slot)!;
    assert.notEqual(cur, prev, `повтор на слоті ${slot}`);
    prev = cur;
  }
  assert.equal(pickBySlot(items, 12345), pickBySlot(items, 12345));
  // порядок різний у різних циклах
  const order = (cycle: number) => Array.from({ length: n }, (_, i) => pickBySlot(items, cycle * n + i)).join();
  assert.notEqual(order(1), order(2));
});

test('вибір за слотом: дуже короткі списки', () => {
  assert.equal(pickBySlot([], 5), null);
  assert.equal(pickBySlot(['a'], 5), 'a');
  assert.deepEqual([0, 1, 2, 3].map((s) => pickBySlot(['a', 'b'], s)), ['a', 'b', 'a', 'b']);
  const three = ['a', 'b', 'c'];
  let prev: string | null = null;
  for (let s = 0; s < 300; s += 1) {
    const cur = pickBySlot(three, s)!;
    assert.notEqual(cur, prev);
    prev = cur;
  }
});

test('стрічка: перевірка формату', () => {
  assert.equal(parseTipsFeed(null), null);
  assert.equal(parseTipsFeed({ version: 2, tips: [] }), null);
  assert.equal(parseTipsFeed({ version: 1 }), null);
  const feed = parseTipsFeed({
    version: 1,
    tips: [
      { id: 'a', kind: 'tip', text: '  Достатньо довгий текст поради.  ' },
      { id: 'b', kind: 'fact', text: 'Ще один достатньо довгий текст.' },
      { id: 'a', kind: 'fact', text: 'Дублікат id перезаписує попередній запис.' },
      { id: '', kind: 'tip', text: 'Порожній id не допускається ніколи.' },
      { id: 'c', kind: 'joke', text: 'Невідомий тип запису у стрічці.' },
      { id: 'd', kind: 'tip', text: 'Коротко' },
      { id: 'e', kind: 'tip', text: 'x'.repeat(401) },
      { id: 'f', kind: 'tip' },
      null,
    ],
  });
  assert.ok(feed);
  assert.deepEqual(feed.tips.map((t) => t.id), ['a', 'b']);
  assert.equal(feed.tips[0].kind, 'fact');
  assert.equal(feed.tips[1].text, 'Ще один достатньо довгий текст.');
  assert.equal(feed.skipped, 6);
});

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async get(key) {
      return data.get(key) ?? null;
    },
    async set(key, value) {
      data.set(key, value);
    },
  };
}

const FEED = {
  version: 1,
  tips: [
    { id: 'r1', kind: 'tip', text: 'Порада з інтернету номер один.' },
    { id: 'r2', kind: 'fact', text: 'Факт з інтернету номер два.' },
  ],
};

function okFetch(body: unknown, counter?: { calls: number }): FetchLike {
  return async () => {
    if (counter) counter.calls += 1;
    return { ok: true, status: 200, json: async () => body };
  };
}

test('інтернет-провайдер: завантаження, кеш і повторне використання', async () => {
  const store = memoryStore();
  const counter = { calls: 0 };
  let now = 1_000_000;
  const provider = new RemoteTipsProvider({
    url: 'https://example.com/tips.json',
    fetchImpl: okFetch(FEED, counter),
    store,
    now: () => now,
  });

  assert.deepEqual((await provider.load()).map((t) => t.id), ['r1', 'r2']);
  assert.equal(counter.calls, 1);
  assert.equal(store.data.size, 1);

  now += HOUR; // кеш ще свіжий
  await provider.load();
  assert.equal(counter.calls, 1);

  now += 24 * HOUR; // кеш застарів — нове завантаження
  await provider.load();
  assert.equal(counter.calls, 2);
});

test('інтернет-провайдер: збій мережі → старий кеш, а без кешу — порожньо', async () => {
  const store = memoryStore();
  let now = 5_000_000;
  const failing: FetchLike = async () => {
    throw new Error('Немає мережі');
  };
  const cold = new RemoteTipsProvider({ url: 'u', fetchImpl: failing, store, now: () => now });
  assert.deepEqual(await cold.load(), []);

  await new RemoteTipsProvider({ url: 'u', fetchImpl: okFetch(FEED), store, now: () => now }).load();
  now += 48 * HOUR;
  const warm = new RemoteTipsProvider({ url: 'u', fetchImpl: failing, store, now: () => now });
  assert.deepEqual((await warm.load()).map((t) => t.id), ['r1', 'r2']);

  const bad = new RemoteTipsProvider({
    url: 'u',
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    store: memoryStore(),
  });
  assert.deepEqual(await bad.load(), []);

  const garbage = new RemoteTipsProvider({ url: 'u', fetchImpl: okFetch({ foo: 1 }), store: memoryStore() });
  assert.deepEqual(await garbage.load(), []);
});

test('пошкоджений кеш ігнорується', async () => {
  const store = memoryStore();
  store.data.set('tips.remote.cache.v1', '{не json');
  const provider = new RemoteTipsProvider({ url: 'u', fetchImpl: okFetch(FEED), store });
  assert.equal((await provider.load()).length, 2);
});

test('запасний варіант: інтернет → вбудовані поради', async () => {
  const store = memoryStore();
  const failing: FetchLike = async () => {
    throw new Error('offline');
  };
  const withoutRemote = createTipsProvider();
  assert.equal((await withoutRemote.load()).length, LOCAL_TIPS.length);

  const offline = createTipsProvider({ remote: { url: 'u', store, fetchImpl: failing } });
  assert.equal((await offline.load()).length, LOCAL_TIPS.length);

  const online = createTipsProvider({ remote: { url: 'u', store, fetchImpl: okFetch(FEED) } });
  assert.deepEqual((await online.load()).map((t) => t.id), ['r1', 'r2']);

  const throwing: { id: string; load(): Promise<Tip[]> } = {
    id: 'x',
    load: async () => {
      throw new Error('boom');
    },
  };
  const chain = new FallbackTipsProvider([throwing, new LocalTipsProvider()]);
  assert.equal((await chain.load()).length, LOCAL_TIPS.length);
  assert.deepEqual(await new FallbackTipsProvider([]).load(), []);
});
