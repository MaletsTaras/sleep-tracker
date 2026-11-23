import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { usePageState } from './PageActivation';

/**
 * Плавно «докручує» число до нової цілі (для наповнення місяця).
 * Коли сторінка знову стає поточною, число «докручується» з нуля ще раз.
 * Якщо в системі ввімкнено «Зменшити рух», значення міняється одразу.
 */
export function useTween(target: number, duration = 800, start = 0): number {
  const { activations } = usePageState();
  const [value, setValue] = useState(start);
  const current = useRef(start);
  const lastActivations = useRef(activations);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    const replay = lastActivations.current !== activations;
    lastActivations.current = activations;
    const from = replay ? start : current.current;

    const jump = () => {
      current.current = target;
      setValue(target);
    };

    const animate = () => {
      const startedAt = Date.now();
      const step = () => {
        if (cancelled) return;
        const t = Math.min(1, (Date.now() - startedAt) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const next = from + (target - from) * eased;
        current.current = next;
        setValue(next);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    if (from === target) {
      jump();
    } else {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((reduce) => {
          if (cancelled) return;
          if (reduce) jump();
          else animate();
        })
        .catch(() => {
          if (!cancelled) animate();
        });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [target, duration, activations, start]);

  return value;
}
