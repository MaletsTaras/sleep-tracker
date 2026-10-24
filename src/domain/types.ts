/**
 * Базові типи предметної області. Тут немає нічого, що залежить від React,
 * Expo чи бази даних — тільки чисті типи й константи.
 */

/** Дата у форматі YYYY-MM-DD (локальна, без часового поясу). */
export type DateISO = string;

/**
 * Звідки взято запис про сон.
 *  - `manual` — те, що користувач ввів сам;
 *  - `watch`  — дані з годинника (з'являться після підключення Health Connect).
 */
export type SourceId = 'manual' | 'watch';

export const SOURCE_IDS: readonly SourceId[] = ['manual', 'watch'];

export const SOURCE_LABELS: Record<SourceId, string> = {
  manual: 'Мої записи',
  watch: 'Годинник',
};

export function isSourceId(value: unknown): value is SourceId {
  return value === 'manual' || value === 'watch';
}

/**
 * Один запис: скільки сну припадає на конкретну дату.
 * Дата — це ДЕНЬ ПРОБУДЖЕННЯ: ніч з суботи на неділю записується на неділю.
 */
export interface SleepRecord {
  date: DateISO;
  /** Тривалість у хвилинах, 0..1440. */
  minutes: number;
  source: SourceId;
  /** Додаткові дані джерела (наприклад, фази сну від годинника). */
  meta: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

/** Те, що потрібно передати, щоб створити або оновити запис. */
export interface SleepInput {
  date: DateISO;
  minutes: number;
  source?: SourceId;
  meta?: Record<string, unknown> | null;
}

export type ThemePreference = 'system' | 'light' | 'dark';

/** 0 — тиждень починається з неділі, 1 — з понеділка. */
export type WeekStart = 0 | 1;

export interface Settings {
  /** Ціль сну в хвилинах. */
  goalMinutes: number;
  theme: ThemePreference;
  weekStartsOn: WeekStart;
  showTips: boolean;
}

export const GOAL_MIN_MINUTES = 240; // 4 год
export const GOAL_MAX_MINUTES = 720; // 12 год
export const GOAL_STEP_MINUTES = 15;
export const MAX_SLEEP_MINUTES = 24 * 60;

export const DEFAULT_SETTINGS: Settings = {
  goalMinutes: 8 * 60,
  theme: 'system',
  weekStartsOn: 1,
  showTips: true,
};

/** Позначка, якою відмічаються демонстраційні записи. */
export const DEMO_META_KEY = 'demo';

export function isDemoRecord(record: Pick<SleepRecord, 'meta'>): boolean {
  return record.meta?.[DEMO_META_KEY] === true;
}
