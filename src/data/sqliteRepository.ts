import type { DateISO, SleepInput, SleepRecord, SourceId } from '../domain/types';
import { isSourceId } from '../domain/types';
import { migrate } from './migrations';
import {
  keyOf,
  normalizeInput,
  type NormalizedInput,
  type RecordKey,
  type SleepRepository,
  type UpsertManyResult,
} from './repository';
import type { SqlExecutor } from './sqlExecutor';

interface RecordRow {
  date: string;
  minutes: number;
  source: string;
  meta: string | null;
  created_at: number;
  updated_at: number;
}

const SELECT_COLUMNS = 'date, minutes, source, meta, created_at, updated_at';

const UPSERT_SQL = `
  INSERT INTO sleep_records (date, minutes, source, meta, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT (date, source) DO UPDATE SET
    minutes    = excluded.minutes,
    meta       = excluded.meta,
    updated_at = excluded.updated_at
`;

function parseMeta(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toRecord(row: RecordRow): SleepRecord {
  return {
    date: row.date,
    minutes: row.minutes,
    // Невідоме джерело (наприклад, з новішої версії) трактуємо як ручний запис, а не губимо дані.
    source: isSourceId(row.source) ? row.source : 'manual',
    meta: parseMeta(row.meta),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Реалізація на SQLite. Усі операції виконуються по черзі, щоб транзакції не перетиналися. */
export class SqliteSleepRepository implements SleepRepository {
  private db: SqlExecutor | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  /**
   * @param open — відкриває базу (у застосунку — через expo-sqlite, у тестах — через node:sqlite).
   * @param now — джерело часу (підміняється в тестах).
   */
  constructor(
    private readonly open: () => Promise<SqlExecutor>,
    private readonly now: () => number = Date.now,
  ) {}

  private serial<T>(task: (db: SqlExecutor) => Promise<T>): Promise<T> {
    const run = this.queue.then(() => {
      if (!this.db) throw new Error('База даних ще не відкрита');
      return task(this.db);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async init(): Promise<void> {
    const run = this.queue.then(async () => {
      if (this.db) return;
      const db = await this.open();
      await migrate(db);
      this.db = db;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  listRecords(): Promise<SleepRecord[]> {
    return this.serial(async (db) => {
      const rows = await db.getAllAsync<RecordRow>(
        `SELECT ${SELECT_COLUMNS} FROM sleep_records ORDER BY date DESC, source ASC`,
      );
      return rows.map(toRecord);
    });
  }

  private async upsertOne(db: SqlExecutor, n: NormalizedInput): Promise<void> {
    const ts = this.now();
    await db.runAsync(UPSERT_SQL, [n.date, n.minutes, n.source, n.meta ? JSON.stringify(n.meta) : null, ts, ts]);
  }

  upsertRecord(input: SleepInput): Promise<SleepRecord> {
    return this.serial(async (db) => {
      const n = normalizeInput(input); // помилка валідації стає відхиленим промісом, а не синхронним винятком
      await this.upsertOne(db, n);
      const row = await db.getFirstAsync<RecordRow>(
        `SELECT ${SELECT_COLUMNS} FROM sleep_records WHERE date = ? AND source = ?`,
        [n.date, n.source],
      );
      if (!row) throw new Error('Запис не збережено');
      return toRecord(row);
    });
  }

  upsertMany(inputs: readonly SleepInput[], options?: { onlyMissing?: boolean }): Promise<UpsertManyResult> {
    return this.serial(async (db) => {
      const normalized = inputs.map(normalizeInput); // спершу перевіряємо все — або записуємо все, або нічого
      const existing = new Set(
        (await db.getAllAsync<{ date: string; source: string }>('SELECT date, source FROM sleep_records')).map((r) =>
          keyOf(r.date, r.source as SourceId),
        ),
      );
      let inserted = 0;
      let updated = 0;
      await db.withTransactionAsync(async () => {
        for (const n of normalized) {
          const exists = existing.has(keyOf(n.date, n.source));
          if (exists && options?.onlyMissing) continue;
          await this.upsertOne(db, n);
          if (exists) updated += 1;
          else inserted += 1;
        }
      });
      return { inserted, updated };
    });
  }

  deleteRecord(key: RecordKey): Promise<boolean> {
    return this.serial(async (db) => {
      const result = await db.runAsync('DELETE FROM sleep_records WHERE date = ? AND source = ?', [key.date, key.source]);
      return result.changes > 0;
    });
  }

  deleteMany(keys: readonly RecordKey[]): Promise<number> {
    return this.serial(async (db) => {
      let removed = 0;
      await db.withTransactionAsync(async () => {
        for (const key of keys) {
          const result = await db.runAsync('DELETE FROM sleep_records WHERE date = ? AND source = ?', [key.date, key.source]);
          removed += result.changes;
        }
      });
      return removed;
    });
  }

  replaceSourceRange(
    source: SourceId,
    range: { from: DateISO; to: DateISO },
    inputs: readonly SleepInput[],
  ): Promise<{ upserted: number; removed: number }> {
    return this.serial(async (db) => {
      const normalized = inputs.map((i) => normalizeInput({ ...i, source }));
      let removed = 0;
      await db.withTransactionAsync(async () => {
        const keep = new Set(normalized.map((n) => n.date));
        const existing = await db.getAllAsync<{ date: string }>(
          'SELECT date FROM sleep_records WHERE source = ? AND date >= ? AND date <= ?',
          [source, range.from, range.to],
        );
        for (const row of existing) {
          if (keep.has(row.date)) continue;
          const result = await db.runAsync('DELETE FROM sleep_records WHERE date = ? AND source = ?', [row.date, source]);
          removed += result.changes;
        }
        for (const n of normalized) await this.upsertOne(db, n);
      });
      return { upserted: normalized.length, removed };
    });
  }

  deleteAllRecords(): Promise<void> {
    return this.serial(async (db) => {
      await db.runAsync('DELETE FROM sleep_records');
    });
  }

  getAllSettings(): Promise<Record<string, string>> {
    return this.serial(async (db) => {
      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    });
  }

  getSetting(key: string): Promise<string | null> {
    return this.serial(async (db) => {
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
      return row?.value ?? null;
    });
  }

  setSetting(key: string, value: string): Promise<void> {
    return this.setSettings({ [key]: value });
  }

  setSettings(values: Record<string, string>): Promise<void> {
    return this.serial(async (db) => {
      await db.withTransactionAsync(async () => {
        for (const [key, value] of Object.entries(values)) {
          await db.runAsync(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
            [key, value],
          );
        }
      });
    });
  }

  deleteEverything(): Promise<void> {
    return this.serial(async (db) => {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM sleep_records');
        await db.runAsync('DELETE FROM settings');
      });
    });
  }
}
