/**
 * Налаштування зберігаються в базі як пари «ключ — рядок».
 * Ці функції перетворюють їх у типізований об'єкт і назад, завжди повертаючи допустимі значення.
 */

import {
  DEFAULT_SETTINGS,
  GOAL_MAX_MINUTES,
  GOAL_MIN_MINUTES,
  GOAL_STEP_MINUTES,
  type Settings,
  type ThemePreference,
  type WeekStart,
} from './types';

export function clampGoal(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_SETTINGS.goalMinutes;
  const snapped = Math.round(minutes / GOAL_STEP_MINUTES) * GOAL_STEP_MINUTES;
  return Math.min(GOAL_MAX_MINUTES, Math.max(GOAL_MIN_MINUTES, snapped));
}

function parseTheme(value: string | undefined): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_SETTINGS.theme;
}

function parseWeekStart(value: string | undefined): WeekStart {
  if (value === '0') return 0;
  if (value === '1') return 1;
  return DEFAULT_SETTINGS.weekStartsOn;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export function parseSettings(raw: Record<string, string | undefined>): Settings {
  const goal = raw.goalMinutes === undefined ? NaN : Number(raw.goalMinutes);
  return {
    goalMinutes: Number.isFinite(goal) ? clampGoal(goal) : DEFAULT_SETTINGS.goalMinutes,
    theme: parseTheme(raw.theme),
    weekStartsOn: parseWeekStart(raw.weekStartsOn),
    showTips: parseBool(raw.showTips, DEFAULT_SETTINGS.showTips),
  };
}

/** Перетворює частину налаштувань на пари для запису в базу. */
export function serializeSettings(patch: Partial<Settings>): Record<string, string> {
  const out: Record<string, string> = {};
  if (patch.goalMinutes !== undefined) out.goalMinutes = String(clampGoal(patch.goalMinutes));
  if (patch.theme !== undefined) out.theme = parseTheme(patch.theme);
  if (patch.weekStartsOn !== undefined) out.weekStartsOn = String(parseWeekStart(String(patch.weekStartsOn)));
  if (patch.showTips !== undefined) out.showTips = String(Boolean(patch.showTips));
  return out;
}
