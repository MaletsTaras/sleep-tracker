import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Плавно «докручує» число до нової цілі (для наповнення місяця).
 * Якщо в системі ввімкнено «Зменшити рух», значення міняється одразу.
 */
export function useTween(target: number, duration = 800, start = 0): number {
  const [value, setValue] = useState(start);
  const current = useRef(start);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    const from = current.current;

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
  }, [target, duration]);

  return value;
}
