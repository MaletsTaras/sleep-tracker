/**
 * Мінімальний інтерфейс до SQLite. Його реалізує тонка обгортка над expo-sqlite (openDatabase.ts),
 * а в тестах — вбудований у Node модуль node:sqlite. Завдяки цьому весь SQL-код перевіряється тестами.
 */

export type SqlParam = string | number | null;

export interface SqlExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlParam[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
