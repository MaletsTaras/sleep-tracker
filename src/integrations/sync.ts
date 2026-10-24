import type { SleepRepository } from '../data/repository';
import { addDays, isValidISODate } from '../domain/dates';
import { MAX_SLEEP_MINUTES, type DateISO, type SleepInput } from '../domain/types';
import type { ExternalSourceId, SleepSource, SourceAvailability } from './types';

export interface SyncOptions {
  today: DateISO;
  /** Скільки останніх днів синхронізувати (разом із сьогоднішнім). За замовчуванням 30. */
  daysBack?: number;
}

export interface SyncResult {
  sourceId: ExternalSourceId;
  status: SourceAvailability;
  upserted: number;
  removed: number;
  range: { from: DateISO; to: DateISO };
}

/**
 * Читає дані з джерела й кладе їх у базу з позначкою цього джерела. Ручні записи не чіпає.
 * Дані в діапазоні, яких джерело більше не повертає, видаляються — база відображає стан джерела.
 */
export async function syncSource(
  source: SleepSource,
  repo: Pick<SleepRepository, 'replaceSourceRange'>,
  options: SyncOptions,
): Promise<SyncResult> {
  const daysBack = Math.max(1, Math.floor(options.daysBack ?? 30));
  const range = { from: addDays(options.today, -(daysBack - 1)), to: options.today };

  const status = await source.getAvailability();
  if (status !== 'available') return { sourceId: source.id, status, upserted: 0, removed: 0, range };

  const days = await source.readSleep(range);

  // Беремо лише коректні дані з діапазону; для однієї дати лишається останнє значення.
  const byDate = new Map<DateISO, SleepInput>();
  for (const day of days) {
    if (!isValidISODate(day.date) || day.date < range.from || day.date > range.to) continue;
    if (!Number.isFinite(day.minutes)) continue;
    const minutes = Math.round(day.minutes);
    if (minutes < 0 || minutes > MAX_SLEEP_MINUTES) continue;
    byDate.set(day.date, { date: day.date, minutes, source: source.id, meta: day.meta ?? null });
  }

  const { upserted, removed } = await repo.replaceSourceRange(source.id, range, [...byDate.values()]);
  return { sourceId: source.id, status, upserted, removed, range };
}
