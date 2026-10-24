export type TipKind = 'tip' | 'fact';

export interface Tip {
  /** Стабільний ідентифікатор (потрібен, щоб не дублювати поради з різних джерел). */
  id: string;
  kind: TipKind;
  text: string;
}

export const TIP_KIND_LABELS: Record<TipKind, string> = {
  tip: 'Порада',
  fact: 'Цікавий факт',
};

/** Джерело порад: вбудований набір, інтернет-стрічка тощо. */
export interface TipsProvider {
  readonly id: string;
  load(): Promise<Tip[]>;
}

/** Мінімальне сховище «ключ — значення» (кеш стрічки). У застосунку його надає база даних. */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
