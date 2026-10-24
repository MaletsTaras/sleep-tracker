import type { SleepSource } from './types';

/**
 * ЗАГОТОВКА джерела «Годинник» (Da Fit → Health Connect → цей застосунок).
 *
 * Чому Health Connect, а не Google Fit: Google Fit API підтримується лише до кінця 2026 року
 * і нових підключень не приймає, тож офіційний шлях на Android — Health Connect.
 *
 * Що потрібно зробити (див. docs/ROADMAP.md):
 *  1. Додати бібліотеку для Health Connect і її плагін в app.json, зібрати нову версію APK.
 *  2. У маніфесті заявити дозволи на читання сну (READ_SLEEP) та кроків (READ_STEPS).
 *  3. Реалізувати тут getAvailability / requestPermissions / readSleep:
 *     сеанси сну за діапазон → сума хвилин по датах пробудження (ExternalSleepDay).
 *  4. Увімкнути features.watchSync у src/config/features.ts.
 *
 * Далі все працює вже зараз: syncSource() складе дані в базу з source = 'watch',
 * а в статистиці з'явиться перемикач «Мої записи / Годинник».
 */
export const healthConnectSource: SleepSource = {
  id: 'watch',
  label: 'Годинник (Health Connect)',

  async getAvailability() {
    return 'unavailable';
  },

  async requestPermissions() {
    return false;
  },

  async readSleep() {
    throw new Error('Підключення до Health Connect ще не реалізоване.');
  },
};
