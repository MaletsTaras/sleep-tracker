/**
 * Резервна копія: звичайний текст (JSON), який можна надіслати собі в месенджер
 * чи нотатки й потім вставити назад. Файли й дозволи на сховище не потрібні.
 */

import { isValidISODate } from './dates';
import { parseSettings } from './settings';
import {
  isDemoRecord,
  isSourceId,
  MAX_SLEEP_MINUTES,
  type Settings,
  type SleepInput,
  type SleepRecord,
} from './types';

export const BACKUP_APP = 'sleep-tracker';
export const BACKUP_VERSION = 1;
const MAX_RECORDS = 100_000;

export type BackupParseResult =
  | {
      ok: true;
      records: SleepInput[];
      settings: Partial<Settings> | null;
      /** Скільки записів у файлі виявилися некоректними й були пропущені. */
      skipped: number;
      exportedAt: string | null;
    }
  | { ok: false; error: string };

export function createBackup(records: readonly SleepRecord[], settings: Settings, now: Date = new Date()): string {
  const real = records
    .filter((r) => !isDemoRecord(r))
    .slice()
    .sort((a, b) => (a.date === b.date ? a.source.localeCompare(b.source) : a.date < b.date ? -1 : 1));

  const lines = real.map((r) => JSON.stringify({ date: r.date, minutes: r.minutes, source: r.source }));
  const header = [
    `"app":${JSON.stringify(BACKUP_APP)}`,
    `"version":${BACKUP_VERSION}`,
    `"exportedAt":${JSON.stringify(now.toISOString())}`,
    `"settings":${JSON.stringify(settings)}`,
  ].join(',');
  return `{${header},\n"records":[\n${lines.join(',\n')}\n]}`;
}

/** Дістає JSON із тексту, навіть якщо його обгорнули в лапки, кодові блоки чи зайвий текст. */
function extractJsonObject(text: string): string | null {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

export function parseBackup(text: string): BackupParseResult {
  const candidate = extractJsonObject(text);
  if (!candidate) return { ok: false, error: 'У буфері обміну немає резервної копії. Спершу скопіюйте її повністю.' };

  let data: unknown;
  try {
    data = JSON.parse(candidate);
  } catch {
    return { ok: false, error: 'Текст схожий на копію, але пошкоджений. Скопіюйте її ще раз повністю.' };
  }

  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Це не резервна копія «Трекера сну».' };
  }
  const obj = data as Record<string, unknown>;
  if (obj.app !== BACKUP_APP) return { ok: false, error: 'Це не резервна копія «Трекера сну».' };
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) {
    return { ok: false, error: 'Копію створено новішою версією застосунку. Оновіть застосунок і спробуйте знову.' };
  }
  if (!Array.isArray(obj.records)) return { ok: false, error: 'У копії немає списку записів.' };
  if (obj.records.length > MAX_RECORDS) return { ok: false, error: 'У копії забагато записів.' };

  // Останній запис для пари (дата, джерело) перемагає.
  const byKey = new Map<string, SleepInput>();
  let skipped = 0;
  for (const item of obj.records) {
    const rec = item as Record<string, unknown> | null;
    const source = rec?.source ?? 'manual';
    if (
      !rec ||
      !isValidISODate(rec.date) ||
      typeof rec.minutes !== 'number' ||
      !Number.isInteger(rec.minutes) ||
      rec.minutes < 0 ||
      rec.minutes > MAX_SLEEP_MINUTES ||
      !isSourceId(source)
    ) {
      skipped += 1;
      continue;
    }
    byKey.set(`${rec.date}|${source}`, { date: rec.date, minutes: rec.minutes, source });
  }

  const records = [...byKey.values()];
  if (records.length === 0 && skipped > 0) {
    return { ok: false, error: 'У копії немає жодного коректного запису.' };
  }

  let settings: Partial<Settings> | null = null;
  if (typeof obj.settings === 'object' && obj.settings !== null) {
    const raw = obj.settings as Record<string, unknown>;
    const asStrings: Record<string, string> = {};
    for (const key of ['goalMinutes', 'theme', 'weekStartsOn', 'showTips']) {
      if (raw[key] !== undefined) asStrings[key] = String(raw[key]);
    }
    const parsed = parseSettings(asStrings);
    settings = {};
    if (asStrings.goalMinutes !== undefined) settings.goalMinutes = parsed.goalMinutes;
    if (asStrings.theme !== undefined) settings.theme = parsed.theme;
    if (asStrings.weekStartsOn !== undefined) settings.weekStartsOn = parsed.weekStartsOn;
    if (asStrings.showTips !== undefined) settings.showTips = parsed.showTips;
  }

  return {
    ok: true,
    records,
    settings,
    skipped,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : null,
  };
}
