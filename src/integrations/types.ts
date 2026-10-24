import type { DateISO, SourceId } from '../domain/types';

/** Джерела, дані з яких приходять ззовні (усе, крім ручного введення). */
export type ExternalSourceId = Exclude<SourceId, 'manual'>;

export type SourceAvailability =
  /** Усе готово, можна читати дані. */
  | 'available'
  /** Джерело є, але користувач ще не дав дозвіл. */
  | 'needs-permission'
  /** Джерела немає на цьому пристрої (або воно не підключене). */
  | 'unavailable';

/** Сон за одну дату (день пробудження), як його повідомило зовнішнє джерело. */
export interface ExternalSleepDay {
  date: DateISO;
  minutes: number;
  /** Додаткові дані: фази сну, час засинання/пробудження тощо. */
  meta?: Record<string, unknown> | null;
}

/**
 * Зовнішнє джерело даних про сон. Щоб підключити нове (Health Connect, інший сервіс),
 * достатньо реалізувати цей інтерфейс — решта застосунку (база, статистика, перемикач
 * «Мої записи / Годинник») уже готова.
 */
export interface SleepSource {
  readonly id: ExternalSourceId;
  readonly label: string;
  getAvailability(): Promise<SourceAvailability>;
  /** Показує системний запит на дозвіл. Повертає true, якщо дозвіл надано. */
  requestPermissions(): Promise<boolean>;
  /** Повертає сон по днях у діапазоні (включно). */
  readSleep(range: { from: DateISO; to: DateISO }): Promise<ExternalSleepDay[]>;
}
