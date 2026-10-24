import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { features } from '../config/features';
import type { RecordKey, SleepRepository } from '../data/repository';
import { generateDemoRecords } from '../domain/demo';
import { parseSettings, serializeSettings } from '../domain/settings';
import { computeStreaks, type StreakInfo } from '../domain/streaks';
import { DEFAULT_SETTINGS, isDemoRecord, type DateISO, type Settings, type SleepInput, type SleepRecord } from '../domain/types';
import { getEnabledSources } from '../integrations/registry';
import { syncSource, type SyncResult } from '../integrations/sync';
import type { KeyValueStore } from '../tips/types';
import { useToday } from './useToday';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface AppContextValue {
  status: LoadStatus;
  error: string | null;
  records: readonly SleepRecord[];
  settings: Settings;
  today: DateISO;
  /** Серії рахуються за ручними записами. */
  streaks: StreakInfo;
  /** Є хоча б один демонстраційний запис. */
  hasDemo: boolean;
  /** Сховище «ключ — значення» для кешу порад з інтернету. */
  tipsStore: KeyValueStore;
  saveSleep(input: SleepInput): Promise<void>;
  deleteSleep(key: RecordKey): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  /** Додає демонстраційні записи лише там, де справжніх немає. Повертає кількість доданих. */
  loadDemoData(): Promise<number>;
  removeDemoData(): Promise<number>;
  restoreBackup(records: readonly SleepInput[], settings: Partial<Settings> | null): Promise<{ inserted: number; updated: number }>;
  eraseEverything(): Promise<void>;
  /** Забирає свіжі дані з увімкнених зовнішніх джерел (годинник). Без увімкнених джерел нічого не робить. */
  syncExternal(): Promise<SyncResult[]>;
  retry(): void;
}

const AppContext = createContext<AppContextValue | null>(null);

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Невідома помилка';
}

export interface AppProviderProps {
  /** Створює сховище. Має бути стабільною функцією (оголошеною поза компонентом). */
  createRepository: () => SleepRepository;
  children: ReactNode;
}

export function AppProvider({ createRepository, children }: AppProviderProps) {
  const repoRef = useRef<SleepRepository | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const today = useToday();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('loading');
        const repo = createRepository();
        await repo.init();
        const list = await repo.listRecords();
        const raw = await repo.getAllSettings();
        if (cancelled) return;
        repoRef.current = repo;
        setRecords(list);
        setSettings(parseSettings(raw));
        setError(null);
        setStatus('ready');
      } catch (failure) {
        if (cancelled) return;
        setError(messageOf(failure));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, createRepository]);

  const repo = useCallback((): SleepRepository => {
    const current = repoRef.current;
    if (!current) throw new Error('База даних ще не готова');
    return current;
  }, []);

  const reload = useCallback(async () => {
    setRecords(await repo().listRecords());
  }, [repo]);

  const saveSleep = useCallback(
    async (input: SleepInput) => {
      await repo().upsertRecord(input);
      await reload();
    },
    [repo, reload],
  );

  const deleteSleep = useCallback(
    async (key: RecordKey) => {
      await repo().deleteRecord(key);
      await reload();
    },
    [repo, reload],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const serialized = serializeSettings(patch);
      const previous = settingsRef.current;
      setSettings(parseSettings({ ...serializeSettings(previous), ...serialized }));
      try {
        await repo().setSettings(serialized);
      } catch (failure) {
        setSettings(previous);
        throw failure;
      }
    },
    [repo],
  );

  const loadDemoData = useCallback(async () => {
    const { inserted } = await repo().upsertMany(generateDemoRecords(today, 90), { onlyMissing: true });
    await reload();
    return inserted;
  }, [repo, reload, today]);

  const removeDemoData = useCallback(async () => {
    const keys = (await repo().listRecords()).filter(isDemoRecord).map((record): RecordKey => ({ date: record.date, source: record.source }));
    const removed = await repo().deleteMany(keys);
    await reload();
    return removed;
  }, [repo, reload]);

  const restoreBackup = useCallback(
    async (incoming: readonly SleepInput[], incomingSettings: Partial<Settings> | null) => {
      const result = await repo().upsertMany(incoming);
      if (incomingSettings && Object.keys(incomingSettings).length > 0) {
        const serialized = serializeSettings(incomingSettings);
        await repo().setSettings(serialized);
        setSettings(parseSettings({ ...serializeSettings(settingsRef.current), ...serialized }));
      }
      await reload();
      return result;
    },
    [repo, reload],
  );

  const eraseEverything = useCallback(async () => {
    await repo().deleteEverything();
    setRecords([]);
    setSettings(DEFAULT_SETTINGS);
  }, [repo]);

  const syncExternal = useCallback(async (): Promise<SyncResult[]> => {
    const results: SyncResult[] = [];
    for (const source of getEnabledSources()) {
      try {
        results.push(await syncSource(source, repo(), { today }));
      } catch {
        // Джерело недоступне зараз (годинник далеко, немає дозволу) — це не помилка застосунку.
      }
    }
    if (results.some((result) => result.upserted > 0 || result.removed > 0)) await reload();
    return results;
  }, [repo, reload, today]);

  // Синхронізація при старті й коли застосунок повертається на екран (не частіше, ніж раз на 5 хвилин).
  useEffect(() => {
    if (status !== 'ready' || !features.watchSync) return undefined;
    let last = 0;
    const run = () => {
      const now = Date.now();
      if (now - last < 5 * 60_000) return;
      last = now;
      syncExternal().catch(() => undefined);
    };
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => subscription.remove();
  }, [status, syncExternal]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const tipsStore = useMemo<KeyValueStore>(
    () => ({
      get: async (key) => (repoRef.current ? repoRef.current.getSetting(key) : null),
      set: async (key, value) => {
        if (repoRef.current) await repoRef.current.setSetting(key, value);
      },
    }),
    [],
  );

  const streaks = useMemo(
    () => computeStreaks(records.filter((record) => record.source === 'manual').map((record) => record.date), today),
    [records, today],
  );
  const hasDemo = useMemo(() => records.some(isDemoRecord), [records]);

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      error,
      records,
      settings,
      today,
      streaks,
      hasDemo,
      tipsStore,
      saveSleep,
      deleteSleep,
      updateSettings,
      loadDemoData,
      removeDemoData,
      restoreBackup,
      eraseEverything,
      syncExternal,
      retry,
    }),
    [
      status,
      error,
      records,
      settings,
      today,
      streaks,
      hasDemo,
      tipsStore,
      saveSleep,
      deleteSleep,
      updateSettings,
      loadDemoData,
      removeDemoData,
      restoreBackup,
      eraseEverything,
      syncExternal,
      retry,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp потрібно викликати всередині AppProvider');
  return value;
}
