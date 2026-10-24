import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { features, TIPS_FEED_URL } from '../config/features';
import { createTipsProvider } from '../tips/provider';
import { nextSlotStart, pickBySlot, slotIndex } from '../tips/rotation';
import type { KeyValueStore, Tip } from '../tips/types';

export interface CurrentTip {
  tip: Tip | null;
  /** Коли поточна порада зміниться (мс від епохи). */
  nextAt: number;
}

/**
 * Порада для головної: змінюється кожні 2 години за місцевим часом.
 * Список порад береться з вбудованого набору (а коли ввімкнено — з інтернет-стрічки з кешем).
 */
export function useCurrentTip(enabled: boolean, store: KeyValueStore): CurrentTip {
  const [tips, setTips] = useState<Tip[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const useRemote = features.remoteTips && TIPS_FEED_URL.length > 0;
    const provider = createTipsProvider(useRemote ? { remote: { url: TIPS_FEED_URL, store } } : {});
    provider
      .load()
      .then((list) => {
        if (!cancelled) setTips(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, store]);

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

  return useMemo(() => {
    const offset = new Date(now).getTimezoneOffset();
    return {
      tip: pickBySlot(tips, slotIndex(now, offset)),
      nextAt: nextSlotStart(now, offset),
    };
  }, [tips, now]);
}
