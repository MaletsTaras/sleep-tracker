import type { SqlExecutor, SqlParam } from '../../src/data/sqlExecutor';

type NodeSqliteModule = typeof import('node:sqlite');

/**
 * Реальний SQLite з Node (node:sqlite) у вигляді SqlExecutor — для перевірки SQL-коду без телефона.
 * Вимагає Node 22.5 або новішої.
 */
export function openNodeSqlite(path = ':memory:'): SqlExecutor {
  const sqlite = process.getBuiltinModule('node:sqlite') as NodeSqliteModule;
  const db = new sqlite.DatabaseSync(path);

  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params: SqlParam[] = []) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    async getAllAsync<T>(sql: string, params: SqlParam[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[] = []) {
      return ((db.prepare(sql).get(...params) as T | undefined) ?? null) as T | null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
