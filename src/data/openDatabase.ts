/**
 * Єдиний файл, який знає про expo-sqlite: відкриває базу на телефоні й загортає її в інтерфейс SqlExecutor.
 */

import * as SQLite from 'expo-sqlite';

import { SqliteSleepRepository } from './sqliteRepository';
import type { SqlExecutor } from './sqlExecutor';

export const DATABASE_NAME = 'sleep-tracker.db';

export function wrapExpoDatabase(db: SQLite.SQLiteDatabase): SqlExecutor {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      const result = await db.runAsync(sql, params);
      return { changes: result.changes };
    },
    getAllAsync: <T>(sql: string, params: (string | number | null)[] = []) => db.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: (string | number | null)[] = []) => db.getFirstAsync<T>(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

export function createSqliteRepository(): SqliteSleepRepository {
  return new SqliteSleepRepository(async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    return wrapExpoDatabase(db);
  });
}
