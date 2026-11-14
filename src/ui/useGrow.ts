import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { springs, useReduceMotion } from './motion';
import { usePageState } from './PageActivation';

/**
 * Значення 0 → 1 для «зростання» графіків: стовпчики підіймаються, смужки заповнюються.
 * Програється, коли сторінка стає поточною (щоразу, коли користувач на неї повертається), і коли графік з'являється.
 * `delay` дозволяє зсунути рух елементів один відносно одного. З «Зменшити рух» одразу 1.
 */
export function useGrow(delay = 0): Animated.Value {
  const reduceMotion = useReduceMotion();
  const { activations } = usePageState();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return undefined;
    }
    if (activations === 0) {
      progress.setValue(0);
      return undefined;
    }
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(progress, { toValue: 1, ...springs.soft, overshootClamping: true, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [activations, delay, reduceMotion, progress]);

  return progress;
}
