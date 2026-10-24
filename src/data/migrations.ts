/**
 * Міграції бази. Версія схеми зберігається в `PRAGMA user_version`.
 * Щоб змінити схему, ДОДАЙТЕ нову міграцію в кінець списку (стару не редагуйте) —
 * тоді дані наявних користувачів збережуться.
 */

import type { SqlExecutor } from './sqlExecutor';

export interface Migration {
  version: number;
  name: string;
  up(db: SqlExecutor): Promise<void>;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'початкова схема: записи сну та налаштування',
    async up(db) {
      await db.execAsync(`
        CREATE TABLE sleep_records (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          date       TEXT    NOT NULL,                              -- YYYY-MM-DD, день пробудження
          minutes    INTEGER NOT NULL CHECK (minutes BETWEEN 0 AND 1440),
          source     TEXT    NOT NULL DEFAULT 'manual',             -- 'manual' | 'watch' | ...
          meta       TEXT,                                          -- JSON із додатковими даними джерела
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE (date, source)
        );
        CREATE INDEX idx_sleep_records_date ON sleep_records (date);

        CREATE TABLE settings (
          key   TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
    },
  },
  // Приклад наступної міграції (кроки за годинника з'являться пізніше):
  // {
  //   version: 2,
  //   name: 'кроки',
  //   async up(db) {
  //     await db.execAsync(`CREATE TABLE steps_daily (date TEXT NOT NULL, steps INTEGER NOT NULL, source TEXT NOT NULL, PRIMARY KEY (date, source));`);
  //   },
  // },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/** Доводить базу до останньої версії схеми. Повертає версію, на якій вона опинилась. */
export async function migrate(db: SqlExecutor, migrations: readonly Migration[] = MIGRATIONS): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  const latest = migrations.length === 0 ? 0 : migrations[migrations.length - 1].version;
  if (current > latest) {
    throw new Error('База даних створена новішою версією застосунку. Оновіть застосунок.');
  }
  for (const migration of migrations) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    current = migration.version;
  }
  return current;
}
