import { LocalTipsProvider } from './localTips';
import { RemoteTipsProvider, type FetchLike } from './remote';
import type { KeyValueStore, Tip, TipsProvider } from './types';

/** Пробує провайдерів по черзі й повертає перший непорожній результат. */
export class FallbackTipsProvider implements TipsProvider {
  readonly id = 'fallback';

  constructor(private readonly providers: readonly TipsProvider[]) {}

  async load(): Promise<Tip[]> {
    for (const provider of this.providers) {
      try {
        const tips = await provider.load();
        if (tips.length > 0) return tips;
      } catch {
        // переходимо до наступного джерела
      }
    }
    return [];
  }
}

/** Об'єднує набори за id: версія з пізнішого набору заміщає ранішу, порядок — за першою появою. */
export function mergeTips(...lists: readonly (readonly Tip[])[]): Tip[] {
  const byId = new Map<string, Tip>();
  for (const list of lists) for (const tip of list) byId.set(tip.id, tip);
  return [...byId.values()];
}

/** Вбудований набір плюс те, що вдалося підвантажити (збій мережі не помилка: лишаються вбудовані). */
export class MergedTipsProvider implements TipsProvider {
  readonly id = 'merged';

  constructor(
    private readonly base: TipsProvider,
    private readonly extra: TipsProvider | null,
  ) {}

  async load(): Promise<Tip[]> {
    const base = await this.base.load();
    if (!this.extra) return base;
    try {
      return mergeTips(base, await this.extra.load());
    } catch {
      return base;
    }
  }
}

export interface TipsProviderOptions {
  /** Якщо задано — спочатку пробуємо інтернет-стрічку, а вбудований набір лишається запасним. */
  remote?: { url: string; store: KeyValueStore; fetchImpl?: FetchLike };
}

/** Провайдер інтернет-стрічки; null, якщо в середовищі немає `fetch`. */
export function createRemoteTipsProvider(remote: NonNullable<TipsProviderOptions['remote']>): TipsProvider | null {
  const fetchImpl = remote.fetchImpl ?? (globalThis.fetch as unknown as FetchLike | undefined);
  return fetchImpl ? new RemoteTipsProvider({ url: remote.url, store: remote.store, fetchImpl }) : null;
}

export function createTipsProvider(options: TipsProviderOptions = {}): TipsProvider {
  const providers: TipsProvider[] = [];
  if (options.remote) {
    const remote = createRemoteTipsProvider(options.remote);
    if (remote) providers.push(remote);
  }
  providers.push(new LocalTipsProvider());
  return new FallbackTipsProvider(providers);
}
