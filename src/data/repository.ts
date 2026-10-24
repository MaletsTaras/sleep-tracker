import { isValidISODate } from '../domain/dates';
import {
  isSourceId,
  MAX_SLEEP_MINUTES,
  type DateISO,
  type SleepInput,
  type SleepRecord,
  type SourceId,
} from '../domain/types';

export interface RecordKey {
  date: DateISO;
  source: SourceId;
}

export interface UpsertManyResult {
  inserted: number;
  updated: number;
}

/**
 * Єдине місце, через яке застосунок читає й пише дані.
 * Є дві реалізації: SQLite (для телефона) і в пам'яті (для тестів та попереднього перегляду).
 */
export interface SleepRepository {
  init(): Promise<void>;

  listRecords(): Promise<SleepRecord[]>;
  upsertRecord(input: SleepInput): Promise<SleepRecord>;
  /** Додає або оновлює пачку записів; з `onlyMissing` уже наявні записи лишаються недоторканими. */
  upsertMany(inputs: readonly SleepInput[], options?: { onlyMissing?: boolean }): Promise<UpsertManyResult>;
  deleteRecord(key: RecordKey): Promise<boolean>;
  deleteMany(keys: readonly RecordKey[]): Promise<number>;
  /** Замінює всі записи джерела в діапазоні дат тими, що передані (для синхронізації з годинником). */
  replaceSourceRange(
    source: SourceId,
    range: { from: DateISO; to: DateISO },
    inputs: readonly SleepInput[],
  ): Promise<{ upserted: number; removed: number }>;
  deleteAllRecords(): Promise<void>;

  getAllSettings(): Promise<Record<string, string>>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  setSettings(values: Record<string, string>): Promise<void>;

  /** Видаляє записи й налаштування. */
  deleteEverything(): Promise<void>;
}

export interface NormalizedInput {
  date: DateISO;
  minutes: number;
  source: SourceId;
  meta: Record<string, unknown> | null;
}

/** Перевіряє вхідні дані й підставляє значення за замовчуванням. Кидає зрозумілу помилку. */
export function normalizeInput(input: SleepInput): NormalizedInput {
  if (!isValidISODate(input.date)) throw new Error(`Некоректна дата: ${String(input.date)}`);
  const minutes = input.minutes;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_SLEEP_MINUTES) {
    throw new Error(`Некоректна тривалість сну: ${String(minutes)}`);
  }
  const source = input.source ?? 'manual';
  if (!isSourceId(source)) throw new Error(`Невідоме джерело: ${String(source)}`);
  return { date: input.date, minutes, source, meta: input.meta ?? null };
}

export function keyOf(date: DateISO, source: SourceId): string {
  return `${date}|${source}`;
}

export function sortRecords(records: SleepRecord[]): SleepRecord[] {
  return records.sort((a, b) => (a.date === b.date ? a.source.localeCompare(b.source) : a.date < b.date ? 1 : -1));
}
