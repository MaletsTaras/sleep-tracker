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

export interface TipsProviderOptions {
  /** Якщо задано — спочатку пробуємо інтернет-стрічку, а вбудований набір лишається запасним. */
  remote?: { url: string; store: KeyValueStore; fetchImpl?: FetchLike };
}

export function createTipsProvider(options: TipsProviderOptions = {}): TipsProvider {
  const providers: TipsProvider[] = [];
  if (options.remote) {
    const fetchImpl = options.remote.fetchImpl ?? (globalThis.fetch as unknown as FetchLike | undefined);
    if (fetchImpl) {
      providers.push(new RemoteTipsProvider({ url: options.remote.url, store: options.remote.store, fetchImpl }));
    }
  }
  providers.push(new LocalTipsProvider());
  return new FallbackTipsProvider(providers);
}
