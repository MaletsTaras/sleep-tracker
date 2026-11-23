import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { features, TIPS_FEED_URL } from '../config/features';
import { LOCAL_TIPS } from '../tips/localTips';
import { createRemoteTipsProvider, mergeTips } from '../tips/provider';
import { nextSlotStart, pickBySlot, slotIndex } from '../tips/rotation';
import type { KeyValueStore, Tip } from '../tips/types';

export interface CurrentTip {
  tip: Tip | null;
  /** Коли поточна порада зміниться сама (мс від епохи). */
  nextAt: number;
  /** Показати наступну пораду просто зараз, не чекаючи кінця двогодинного слота. */
  another: () => void;
}

/**
 * Порада для головної: змінюється кожні 2 години за місцевим часом.
 * Вбудований набір доступний одразу; якщо ввімкнено інтернет-стрічку, її поради додаються до нього
 * (стрічка кешується на добу, тож працює й без мережі). Порада, що вже показана в поточному слоті, не «стрибає»,
 * коли стрічка дозавантажилась, — новий набір починає діяти з наступного слота.
 */
export function useCurrentTip(enabled: boolean, store: KeyValueStore, remoteEnabled = true): CurrentTip {
  const [remote, setRemote] = useState<readonly Tip[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [skipped, setSkipped] = useState({ slot: -1, count: 0 });
  const pinned = useRef<{ slot: number; count: number; tip: Tip } | null>(null);

  const useRemote = remoteEnabled && features.remoteTips && TIPS_FEED_URL.length > 0;

  useEffect(() => {
    if (!enabled || !useRemote) {
      setRemote([]);
      return undefined;
    }
    const provider = createRemoteTipsProvider({ url: TIPS_FEED_URL, store });
    if (!provider) return undefined;
    let cancelled = false;
    const refresh = () => {
      provider
        .load()
        .then((list) => {
          if (!cancelled && list.length > 0) setRemote(list);
        })
        .catch(() => undefined);
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [enabled, useRemote, store]);

  useEffect(() => {
    if (!enabled) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const arm = () => {
      if (timer) clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      const until = nextSlotStart(current, new Date(current).getTimezoneOffset()) - current;
      timer = setTimeout(arm, Math.max(1000, until + 500));
    };

    arm();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') arm();
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [enabled]);

  const pool = useMemo<readonly Tip[]>(() => (remote.length > 0 ? mergeTips(LOCAL_TIPS, remote) : LOCAL_TIPS), [remote]);

  const offset = new Date(now).getTimezoneOffset();
  const slot = slotIndex(now, offset);
  const count = skipped.slot === slot ? skipped.count : 0;

  let tip: Tip | null;
  const pin = pinned.current;
  if (pin && pin.slot === slot && pin.count === count) {
    tip = pin.tip;
  } else {
    tip = pickBySlot(pool, slot + count);
    pinned.current = tip ? { slot, count, tip } : null;
  }

  const another = useCallback(() => {
    setSkipped((previous) => ({ slot, count: (previous.slot === slot ? previous.count : 0) + 1 }));
  }, [slot]);

  return { tip: enabled ? tip : null, nextAt: nextSlotStart(now, offset), another };
}
