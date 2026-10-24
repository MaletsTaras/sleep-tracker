/**
 * Перемикачі майбутніх можливостей. Код для них уже в проєкті (див. src/integrations і src/tips),
 * а вмикаються вони тут — після того, як підключення буде реалізоване й перевірене.
 */
export const features: { watchSync: boolean; remoteTips: boolean } = {
  /** Дані з годинника через Health Connect. Потребує нативного модуля — див. docs/ROADMAP.md. */
  watchSync: false,
  /** Поради з інтернету (JSON-стрічка за посиланням нижче). */
  remoteTips: false,
};

/** Адреса JSON-стрічки з порадами. Формат описано в src/tips/remote.ts. */
export const TIPS_FEED_URL: string = '';
