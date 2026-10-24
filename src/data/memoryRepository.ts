import type { DateISO, SleepInput, SleepRecord, SourceId } from '../domain/types';
import {
  keyOf,
  normalizeInput,
  sortRecords,
  type RecordKey,
  type SleepRepository,
  type UpsertManyResult,
} from './repository';

/** Сховище в оперативній пам'яті: для тестів і попереднього перегляду на комп'ютері. Дані не зберігаються. */
export class MemorySleepRepository implements SleepRepository {
  private readonly records = new Map<string, SleepRecord>();
  private readonly settings = new Map<string, string>();

  constructor(private readonly now: () => number = Date.now) {}

  async init(): Promise<void> {}

  async listRecords(): Promise<SleepRecord[]> {
    return sortRecords([...this.records.values()].map((r) => ({ ...r })));
  }

  private put(input: SleepInput): { record: SleepRecord; existed: boolean } {
    const n = normalizeInput(input);
    const key = keyOf(n.date, n.source);
    const prev = this.records.get(key);
    const ts = this.now();
    const record: SleepRecord = {
      date: n.date,
      minutes: n.minutes,
      source: n.source,
      meta: n.meta,
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
    };
    this.records.set(key, record);
    return { record: { ...record }, existed: prev !== undefined };
  }

  async upsertRecord(input: SleepInput): Promise<SleepRecord> {
    return this.put(input).record;
  }

  async upsertMany(inputs: readonly SleepInput[], options?: { onlyMissing?: boolean }): Promise<UpsertManyResult> {
    const normalized = inputs.map(normalizeInput); // спершу перевіряємо все — або записуємо все, або нічого
    let inserted = 0;
    let updated = 0;
    for (const n of normalized) {
      const exists = this.records.has(keyOf(n.date, n.source));
      if (exists && options?.onlyMissing) continue;
      this.put(n);
      if (exists) updated += 1;
      else inserted += 1;
    }
    return { inserted, updated };
  }

  async deleteRecord(key: RecordKey): Promise<boolean> {
    return this.records.delete(keyOf(key.date, key.source));
  }

  async deleteMany(keys: readonly RecordKey[]): Promise<number> {
    let removed = 0;
    for (const key of keys) if (this.records.delete(keyOf(key.date, key.source))) removed += 1;
    return removed;
  }

  async replaceSourceRange(
    source: SourceId,
    range: { from: DateISO; to: DateISO },
    inputs: readonly SleepInput[],
  ): Promise<{ upserted: number; removed: number }> {
    const normalized = inputs.map((i) => normalizeInput({ ...i, source }));
    const keep = new Set(normalized.map((n) => keyOf(n.date, n.source)));
    let removed = 0;
    for (const [key, rec] of [...this.records]) {
      if (rec.source === source && rec.date >= range.from && rec.date <= range.to && !keep.has(key)) {
        this.records.delete(key);
        removed += 1;
      }
    }
    for (const n of normalized) this.put(n);
    return { upserted: normalized.length, removed };
  }

  async deleteAllRecords(): Promise<void> {
    this.records.clear();
  }

  async getAllSettings(): Promise<Record<string, string>> {
    return Object.fromEntries(this.settings);
  }

  async getSetting(key: string): Promise<string | null> {
    return this.settings.get(key) ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.settings.set(key, value);
  }

  async setSettings(values: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(values)) this.settings.set(key, value);
  }

  async deleteEverything(): Promise<void> {
    this.records.clear();
    this.settings.clear();
  }
}
