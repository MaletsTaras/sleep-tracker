import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MemorySleepRepository } from '../src/data/memoryRepository';
import { LATEST_SCHEMA_VERSION, migrate, MIGRATIONS } from '../src/data/migrations';
import type { SleepRepository } from '../src/data/repository';
import { SqliteSleepRepository } from '../src/data/sqliteRepository';
import { openNodeSqlite } from './helpers/nodeSqlite';

/** Один набір перевірок для обох реалізацій — вони мають поводитися однаково. */
const implementations: { name: string; create: (now: () => number) => SleepRepository }[] = [
  { name: 'пам’ять', create: (now) => new MemorySleepRepository(now) },
  { name: 'SQLite', create: (now) => new SqliteSleepRepository(async () => openNodeSqlite(), now) },
];

function clock(start = 1_000) {
  let t = start;
  return { now: () => t, tick: (ms = 10) => (t += ms) };
}

for (const { name, create } of implementations) {
  test(`[${name}] додавання, оновлення, видалення`, async () => {
    const c = clock();
    const repo = create(c.now);
    await repo.init();
    assert.deepEqual(await repo.listRecords(), []);

    const first = await repo.upsertRecord({ date: '2026-10-03', minutes: 450 });
    assert.deepEqual(first, {
      date: '2026-10-03',
      minutes: 450,
      source: 'manual',
      meta: null,
      createdAt: 1_000,
      updatedAt: 1_000,
    });

    c.tick();
    const updated = await repo.upsertRecord({ date: '2026-10-03', minutes: 500 });
    assert.equal(updated.minutes, 500);
    assert.equal(updated.createdAt, 1_000, 'час створення зберігається');
    assert.equal(updated.updatedAt, 1_010);
    assert.equal((await repo.listRecords()).length, 1);

    assert.equal(await repo.deleteRecord({ date: '2026-10-03', source: 'manual' }), true);
    assert.equal(await repo.deleteRecord({ date: '2026-10-03', source: 'manual' }), false);
    assert.deepEqual(await repo.listRecords(), []);
  });

  test(`[${name}] джерела не перемішуються, порядок: нові дати зверху`, async () => {
    const repo = create(Date.now);
    await repo.init();
    await repo.upsertRecord({ date: '2026-10-01', minutes: 400 });
    await repo.upsertRecord({ date: '2026-10-03', minutes: 450 });
    await repo.upsertRecord({ date: '2026-10-03', minutes: 470, source: 'watch', meta: { stages: { deep: 80 } } });
    await repo.upsertRecord({ date: '2026-10-02', minutes: 420 });

    const list = await repo.listRecords();
    assert.deepEqual(
      list.map((r) => `${r.date}/${r.source}`),
      ['2026-10-03/manual', '2026-10-03/watch', '2026-10-02/manual', '2026-10-01/manual'],
    );
    assert.deepEqual(list[1].meta, { stages: { deep: 80 } });
    assert.equal(list[0].meta, null);

    await repo.deleteRecord({ date: '2026-10-03', source: 'watch' });
    assert.equal((await repo.listRecords()).filter((r) => r.date === '2026-10-03').length, 1);
  });

  test(`[${name}] некоректні дані відхиляються й нічого не ламають`, async () => {
    const repo = create(Date.now);
    await repo.init();
    await assert.rejects(() => repo.upsertRecord({ date: '2026-02-30', minutes: 400 }), /Некоректна дата/);
    await assert.rejects(() => repo.upsertRecord({ date: '2026-10-03', minutes: -1 }), /Некоректна тривалість/);
    await assert.rejects(() => repo.upsertRecord({ date: '2026-10-03', minutes: 1441 }), /Некоректна тривалість/);
    await assert.rejects(() => repo.upsertRecord({ date: '2026-10-03', minutes: 400.5 }), /Некоректна тривалість/);
    // @ts-expect-error — навмисно передаємо невідоме джерело
    await assert.rejects(() => repo.upsertRecord({ date: '2026-10-03', minutes: 400, source: 'fridge' }), /Невідоме джерело/);
    assert.deepEqual(await repo.listRecords(), []);
    // нульова й добова тривалість допустимі
    await repo.upsertRecord({ date: '2026-10-03', minutes: 0 });
    await repo.upsertRecord({ date: '2026-10-02', minutes: 1440 });
    assert.equal((await repo.listRecords()).length, 2);
  });

  test(`[${name}] пакетне додавання: onlyMissing і атомарність`, async () => {
    const repo = create(Date.now);
    await repo.init();
    await repo.upsertRecord({ date: '2026-10-02', minutes: 400 });

    const batch = [
      { date: '2026-10-01', minutes: 300 },
      { date: '2026-10-02', minutes: 999 },
      { date: '2026-10-03', minutes: 500 },
    ];
    assert.deepEqual(await repo.upsertMany(batch, { onlyMissing: true }), { inserted: 2, updated: 0 });
    assert.equal((await repo.listRecords()).find((r) => r.date === '2026-10-02')?.minutes, 400);

    assert.deepEqual(await repo.upsertMany(batch), { inserted: 0, updated: 3 });
    assert.equal((await repo.listRecords()).find((r) => r.date === '2026-10-02')?.minutes, 999);

    // одна некоректна позиція — не записується нічого
    await assert.rejects(() =>
      repo.upsertMany([
        { date: '2026-09-01', minutes: 300 },
        { date: 'oops', minutes: 300 },
      ]),
    );
    assert.equal((await repo.listRecords()).some((r) => r.date === '2026-09-01'), false);

    assert.equal(
      await repo.deleteMany([
        { date: '2026-10-01', source: 'manual' },
        { date: '2026-10-03', source: 'manual' },
        { date: '2020-01-01', source: 'manual' },
      ]),
      2,
    );
  });

  test(`[${name}] заміна записів джерела в діапазоні`, async () => {
    const repo = create(Date.now);
    await repo.init();
    await repo.upsertRecord({ date: '2026-10-01', minutes: 400 }); // ручний — не чіпаємо
    await repo.upsertRecord({ date: '2026-09-29', minutes: 300, source: 'watch' });
    await repo.upsertRecord({ date: '2026-09-30', minutes: 310, source: 'watch' });
    await repo.upsertRecord({ date: '2026-10-01', minutes: 320, source: 'watch' });
    await repo.upsertRecord({ date: '2026-09-01', minutes: 330, source: 'watch' }); // поза діапазоном

    const result = await repo.replaceSourceRange(
      'watch',
      { from: '2026-09-29', to: '2026-10-03' },
      [
        { date: '2026-09-30', minutes: 360 },
        { date: '2026-10-02', minutes: 370 },
      ],
    );
    assert.deepEqual(result, { upserted: 2, removed: 2 });

    const watch = (await repo.listRecords()).filter((r) => r.source === 'watch').map((r) => `${r.date}=${r.minutes}`);
    assert.deepEqual(watch.sort(), ['2026-09-01=330', '2026-09-30=360', '2026-10-02=370']);
    const manual = (await repo.listRecords()).filter((r) => r.source === 'manual');
    assert.equal(manual.length, 1);
    assert.equal(manual[0].minutes, 400);
  });

  test(`[${name}] налаштування`, async () => {
    const repo = create(Date.now);
    await repo.init();
    assert.deepEqual(await repo.getAllSettings(), {});
    assert.equal(await repo.getSetting('goalMinutes'), null);
    await repo.setSetting('goalMinutes', '450');
    await repo.setSettings({ theme: 'dark', goalMinutes: '480' });
    assert.deepEqual(await repo.getAllSettings(), { goalMinutes: '480', theme: 'dark' });
    assert.equal(await repo.getSetting('theme'), 'dark');

    await repo.upsertRecord({ date: '2026-10-03', minutes: 450 });
    await repo.deleteAllRecords();
    assert.equal((await repo.listRecords()).length, 0);
    assert.equal(await repo.getSetting('theme'), 'dark', 'налаштування лишаються');

    await repo.upsertRecord({ date: '2026-10-03', minutes: 450 });
    await repo.deleteEverything();
    assert.deepEqual(await repo.getAllSettings(), {});
    assert.equal((await repo.listRecords()).length, 0);
  });

  test(`[${name}] паралельні операції не перетинаються`, async () => {
    const repo = create(Date.now);
    await repo.init();
    const ops: Promise<unknown>[] = [];
    for (let i = 0; i < 40; i += 1) {
      const date = `2026-09-${String((i % 28) + 1).padStart(2, '0')}`;
      ops.push(repo.upsertRecord({ date, minutes: 300 + i }));
      if (i % 5 === 0) ops.push(repo.upsertMany([{ date: '2026-08-15', minutes: 400 + i }]));
      if (i % 7 === 0) ops.push(repo.replaceSourceRange('watch', { from: '2026-09-01', to: '2026-09-30' }, [{ date, minutes: 350 }]));
      if (i % 9 === 0) ops.push(repo.setSettings({ k: String(i) }));
      ops.push(repo.listRecords());
    }
    await Promise.all(ops);
    assert.ok((await repo.listRecords()).length > 20);
  });
}

test('SQLite: міграції ідемпотентні й зберігають дані', async () => {
  const db = openNodeSqlite();
  assert.equal(await migrate(db), LATEST_SCHEMA_VERSION);
  await db.runAsync(
    "INSERT INTO sleep_records (date, minutes, source, created_at, updated_at) VALUES ('2026-10-03', 450, 'manual', 1, 1)",
  );
  assert.equal(await migrate(db), LATEST_SCHEMA_VERSION); // повторний запуск нічого не ламає
  const rows = await db.getAllAsync('SELECT * FROM sleep_records');
  assert.equal(rows.length, 1);
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  assert.equal(version?.user_version, LATEST_SCHEMA_VERSION);
});

test('SQLite: майбутні міграції застосовуються по черзі, збій відкочує крок', async () => {
  const db = openNodeSqlite();
  await migrate(db);
  await db.runAsync(
    "INSERT INTO sleep_records (date, minutes, source, created_at, updated_at) VALUES ('2026-10-03', 450, 'manual', 1, 1)",
  );
  const v2 = {
    version: LATEST_SCHEMA_VERSION + 1,
    name: 'тест',
    async up(d: typeof db) {
      await d.execAsync('CREATE TABLE steps_daily (date TEXT NOT NULL, steps INTEGER NOT NULL, PRIMARY KEY (date))');
    },
  };
  assert.equal(await migrate(db, [...MIGRATIONS, v2]), v2.version);
  assert.equal((await db.getAllAsync('SELECT * FROM sleep_records')).length, 1, 'старі дані на місці');
  await db.execAsync("INSERT INTO steps_daily (date, steps) VALUES ('2026-10-03', 1000)");

  const broken = {
    version: v2.version + 1,
    name: 'зламана',
    async up(d: typeof db) {
      await d.execAsync('CREATE TABLE half_done (x INTEGER)');
      throw new Error('збій посеред міграції');
    },
  };
  await assert.rejects(() => migrate(db, [...MIGRATIONS, v2, broken]), /збій посеред міграції/);
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  assert.equal(version?.user_version, v2.version, 'версія не змінилась');
  const leftover = await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'half_done'");
  assert.equal(leftover, null, 'частково створена таблиця відкотилась');
});

test('SQLite: база від новішої версії застосунку не відкривається мовчки', async () => {
  const db = openNodeSqlite();
  await db.execAsync(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 5}`);
  await assert.rejects(() => migrate(db), /новішою версією/);
});

test('SQLite: обмеження бази захищають від сміття навіть повз репозиторій', async () => {
  const db = openNodeSqlite();
  await migrate(db);
  await assert.rejects(() =>
    db.runAsync("INSERT INTO sleep_records (date, minutes, source, created_at, updated_at) VALUES ('2026-10-03', 5000, 'manual', 1, 1)"),
  );
  await db.runAsync("INSERT INTO sleep_records (date, minutes, source, created_at, updated_at) VALUES ('2026-10-03', 400, 'manual', 1, 1)");
  await assert.rejects(() =>
    db.runAsync("INSERT INTO sleep_records (date, minutes, source, created_at, updated_at) VALUES ('2026-10-03', 410, 'manual', 1, 1)"),
  );
});

test('SQLite: невідоме джерело й пошкоджений meta не ламають читання', async () => {
  const repo = new SqliteSleepRepository(async () => {
    const db = openNodeSqlite();
    await migrate(db);
    await db.runAsync("INSERT INTO sleep_records (date, minutes, source, meta, created_at, updated_at) VALUES ('2026-10-03', 400, 'future-source', '{не json', 1, 1)");
    await db.runAsync("INSERT INTO sleep_records (date, minutes, source, meta, created_at, updated_at) VALUES ('2026-10-02', 410, 'manual', '[1,2]', 1, 1)");
    return db;
  });
  await repo.init();
  const list = await repo.listRecords();
  assert.deepEqual(list.map((r) => [r.date, r.source, r.meta]), [
    ['2026-10-03', 'manual', null],
    ['2026-10-02', 'manual', null],
  ]);
});

test('SQLite: операції до init() дають зрозумілу помилку', async () => {
  const repo = new SqliteSleepRepository(async () => openNodeSqlite());
  await assert.rejects(() => repo.listRecords(), /ще не відкрита/);
  await repo.init();
  await repo.init(); // повторний init безпечний
  assert.deepEqual(await repo.listRecords(), []);
});
