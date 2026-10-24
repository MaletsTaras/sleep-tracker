import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayISO } from '../domain/dates';
import type { DateISO } from '../domain/types';

/**
 * Сьогоднішня дата. Оновлюється сама: опівночі та коли застосунок повертається на екран
 * (щоб ранковий запис завжди потрапляв на правильний день, навіть якщо застосунок висів у пам'яті).
 */
export function useToday(): DateISO {
  const [today, setToday] = useState<DateISO>(() => todayISO());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => setToday((previous) => {
      const next = todayISO();
      return next === previous ? previous : next;
    });

    const schedule = () => {
      if (timer) clearTimeout(timer);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };

    schedule();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        schedule();
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
