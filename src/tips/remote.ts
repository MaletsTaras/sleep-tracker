/**
 * Заготовка для порад з інтернету (поки вимкнена, див. src/config/features.ts).
 *
 * Як це працюватиме: у вас є простий JSON-файл за посиланням (наприклад, на GitHub Pages).
 * Застосунок раз на добу завантажує його, перевіряє, кладе в кеш у базі й далі працює з кешем —
 * тому поради доступні й без інтернету. Якщо стрічка недоступна, показується вбудований набір.
 *
 * Формат стрічки:
 *   { "version": 1, "tips": [ { "id": "t-001", "kind": "tip" | "fact", "text": "…" } ] }
 */

import type { KeyValueStore, Tip, TipKind, TipsProvider } from './types';

const MAX_TIPS = 20_000;
const MIN_TEXT = 10;
const MAX_TEXT = 400;
const CACHE_KEY = 'tips.remote.cache.v1';

export interface ParsedFeed {
  tips: Tip[];
  skipped: number;
}

function isKind(value: unknown): value is TipKind {
  return value === 'tip' || value === 'fact';
}

/** Перевіряє стрічку й відкидає некоректні записи. Повертає null, якщо формат узагалі не той. */
export function parseTipsFeed(data: unknown): ParsedFeed | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if (obj.version !== 1 || !Array.isArray(obj.tips)) return null;

  const byId = new Map<string, Tip>();
  let skipped = 0;
  for (const item of obj.tips.slice(0, MAX_TIPS)) {
    const t = item as Record<string, unknown> | null;
    if (
      !t ||
      typeof t.id !== 'string' ||
      t.id.length === 0 ||
      t.id.length > 64 ||
      !isKind(t.kind) ||
      typeof t.text !== 'string'
    ) {
      skipped += 1;
      continue;
    }
    const text = t.text.trim();
    if (text.length < MIN_TEXT || text.length > MAX_TEXT) {
      skipped += 1;
      continue;
    }
    byId.set(t.id, { id: t.id, kind: t.kind, text });
  }
  return { tips: [...byId.values()], skipped };
}

/** Те, що потрібно від `fetch`; справжній `fetch` цьому відповідає. */
export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface RemoteTipsDeps {
  url: string;
  fetchImpl: FetchLike;
  store: KeyValueStore;
  now?: () => number;
  /** Як довго кеш вважається свіжим. За замовчуванням — доба. */
  maxAgeMs?: number;
  timeoutMs?: number;
}

interface CacheEntry {
  fetchedAt: number;
  tips: Tip[];
}

export class RemoteTipsProvider implements TipsProvider {
  readonly id = 'remote';

  constructor(private readonly deps: RemoteTipsDeps) {}

  private async readCache(): Promise<CacheEntry | null> {
    try {
      const raw = await this.deps.store.get(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheEntry;
      const feed = parseTipsFeed({ version: 1, tips: parsed.tips });
      if (!feed || typeof parsed.fetchedAt !== 'number') return null;
      return { fetchedAt: parsed.fetchedAt, tips: feed.tips };
    } catch {
      return null;
    }
  }

  async load(): Promise<Tip[]> {
    const now = (this.deps.now ?? Date.now)();
    const maxAge = this.deps.maxAgeMs ?? 24 * 3_600_000;
    const cached = await this.readCache();
    if (cached && cached.tips.length > 0 && now - cached.fetchedAt < maxAge) return cached.tips;

    try {
      const controller = typeof AbortController === 'undefined' ? null : new AbortController();
      const timer = controller ? setTimeout(() => controller.abort(), this.deps.timeoutMs ?? 8_000) : null;
      try {
        const response = await this.deps.fetchImpl(this.deps.url, controller ? { signal: controller.signal } : undefined);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const feed = parseTipsFeed(await response.json());
        if (!feed || feed.tips.length === 0) throw new Error('Порожня або некоректна стрічка');
        await this.deps.store.set(CACHE_KEY, JSON.stringify({ fetchedAt: now, tips: feed.tips } satisfies CacheEntry));
        return feed.tips;
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch {
      // Немає інтернету чи стрічка зламана — працюємо зі старим кешем, якщо він є.
      return cached?.tips ?? [];
    }
  }
}
