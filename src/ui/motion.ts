import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Єдині налаштування пружин для всього застосунку: рух має відчуватись однаково скрізь.
 * Усі анімації йдуть на рідному потоці (native driver), тому не гальмують, навіть коли JS зайнятий.
 */
export const springs = {
  /** Відгук на дотик: швидкий, майже без відскоку. */
  press: { stiffness: 520, damping: 32, mass: 1 },
  /** М'яка поява елементів і графіків. */
  soft: { stiffness: 230, damping: 22, mass: 1 },
  /** Помітний «живий» відскок (лінза таббару). */
  bouncy: { stiffness: 320, damping: 17, mass: 1 },
  /** Аркуш знизу. */
  sheet: { stiffness: 300, damping: 30, mass: 1 },
  /** Бігунок сегментованого перемикача: ледь помітний відскок. */
  thumb: { stiffness: 380, damping: 26, mass: 1 },
} as const;

/** Чи ввімкнено в системі «Зменшити рух»: тоді замість руху міняємо стан одразу. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduce(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}
