import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MemorySleepRepository } from '../src/data/memoryRepository';
import { healthConnectSource } from '../src/integrations/healthConnect';
import { getEnabledSources } from '../src/integrations/registry';
import { syncSource } from '../src/integrations/sync';
import type { ExternalSleepDay, SleepSource, SourceAvailability } from '../src/integrations/types';

const TODAY = '2026-10-03';

function fakeSource(days: ExternalSleepDay[], availability: SourceAvailability = 'available'): SleepSource & { calls: number } {
  const source = {
    id: 'watch' as const,
    label: 'Тестовий годинник',
    calls: 0,
    async getAvailability() {
      return availability;
    },
    async requestPermissions() {
      return true;
    },
    async readSleep() {
      source.calls += 1;
      return days;
    },
  };
  return source;
}

test('синхронізація кладе дані годинника в базу й не чіпає ручні записи', async () => {
  const repo = new MemorySleepRepository();
  await repo.upsertRecord({ date: '2026-10-02', minutes: 400 });

  const source = fakeSource([
    { date: '2026-10-02', minutes: 415, meta: { deep: 70 } },
    { date: '2026-10-03', minutes: 452.4 },
  ]);
  const result = await syncSource(source, repo, { today: TODAY });

  assert.equal(result.status, 'available');
  assert.equal(result.upserted, 2);
  assert.equal(result.removed, 0);
  assert.deepEqual(result.range, { from: '2026-09-04', to: TODAY });

  const list = await repo.listRecords();
  const key = (r: (typeof list)[number]) => `${r.date}/${r.source}=${r.minutes}`;
  assert.deepEqual(list.map(key), ['2026-10-03/watch=452', '2026-10-02/manual=400', '2026-10-02/watch=415']);
  assert.deepEqual(list.find((r) => r.source === 'watch' && r.date === '2026-10-02')?.meta, { deep: 70 });
});

test('повторна синхронізація відображає стан джерела: зникле видаляється', async () => {
  const repo = new MemorySleepRepository();
  await syncSource(fakeSource([{ date: '2026-10-01', minutes: 400 }, { date: '2026-10-02', minutes: 410 }]), repo, { today: TODAY });
  const second = await syncSource(fakeSource([{ date: '2026-10-02', minutes: 420 }]), repo, { today: TODAY });
  assert.equal(second.removed, 1);
  const list = await repo.listRecords();
  assert.deepEqual(list.map((r) => [r.date, r.minutes]), [['2026-10-02', 420]]);
});

test('дані поза діапазоном і некоректні значення відкидаються', async () => {
  const repo = new MemorySleepRepository();
  const source = fakeSource([
    { date: '2026-10-03', minutes: 400 },
    { date: '2026-10-04', minutes: 400 }, // майбутнє
    { date: '2026-08-01', minutes: 400 }, // за межами 30 днів
    { date: '2026-09-30', minutes: -10 },
    { date: '2026-09-29', minutes: Number.NaN },
    { date: '2026-09-28', minutes: 5000 },
    { date: 'не дата', minutes: 400 },
    { date: '2026-10-02', minutes: 300 },
    { date: '2026-10-02', minutes: 310 }, // дублікат: останнє значення
  ]);
  const result = await syncSource(source, repo, { today: TODAY });
  assert.equal(result.upserted, 2);
  assert.deepEqual((await repo.listRecords()).map((r) => [r.date, r.minutes]), [['2026-10-03', 400], ['2026-10-02', 310]]);
});

test('якщо джерело недоступне, нічого не читається й не змінюється', async () => {
  const repo = new MemorySleepRepository();
  await repo.upsertRecord({ date: '2026-10-02', minutes: 415, source: 'watch' });
  for (const availability of ['unavailable', 'needs-permission'] as const) {
    const source = fakeSource([{ date: '2026-10-03', minutes: 400 }], availability);
    const result = await syncSource(source, repo, { today: TODAY });
    assert.equal(result.status, availability);
    assert.equal(result.upserted, 0);
    assert.equal(source.calls, 0);
  }
  assert.equal((await repo.listRecords()).length, 1);
});

test('кількість днів настроюється', async () => {
  const repo = new MemorySleepRepository();
  const result = await syncSource(fakeSource([]), repo, { today: TODAY, daysBack: 7 });
  assert.deepEqual(result.range, { from: '2026-09-27', to: TODAY });
  const one = await syncSource(fakeSource([]), repo, { today: TODAY, daysBack: 0 });
  assert.deepEqual(one.range, { from: TODAY, to: TODAY });
});

test('заготовка Health Connect поки вимкнена й нічого не робить', async () => {
  assert.deepEqual(getEnabledSources(), []);
  assert.equal(await healthConnectSource.getAvailability(), 'unavailable');
  assert.equal(await healthConnectSource.requestPermissions(), false);
  const repo = new MemorySleepRepository();
  const result = await syncSource(healthConnectSource, repo, { today: TODAY });
  assert.equal(result.status, 'unavailable');
  assert.deepEqual(await repo.listRecords(), []);
});
