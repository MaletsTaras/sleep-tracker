import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { springs, useReduceMotion } from './motion';
import { usePageState } from './PageActivation';

const STEP_MS = 45;
const MAX_STAGGER = 6;
const LIFT = 18;

export interface RevealProps {
  /** Порядковий номер блока на екрані: від нього залежить затримка, тож блоки з'являються каскадом. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Блок плавно виринає знизу, коли сторінку вперше видно; повторно не програється. */
export function Reveal({ index = 0, style, children }: RevealProps) {
  const reduceMotion = useReduceMotion();
  const { seen } = usePageState();
  const progress = useRef(new Animated.Value(0)).current;
  const played = useRef(false);
  const running = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => () => running.current?.stop(), []);

  useEffect(() => {
    if (!reduceMotion) return;
    // «Зменшити рух» увімкнули (чи воно ввімкнено від початку): показуємо блок одразу, без руху.
    running.current?.stop();
    running.current = null;
    played.current = true;
    progress.setValue(1);
  }, [reduceMotion, progress]);

  useEffect(() => {
    if (played.current || !seen) return;
    played.current = true;
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.sequence([
      Animated.delay(Math.min(index, MAX_STAGGER) * STEP_MS),
      Animated.spring(progress, { toValue: 1, ...springs.soft, overshootClamping: true, useNativeDriver: true }),
    ]);
    running.current = animation;
    animation.start(() => {
      running.current = null;
    });
  }, [seen, reduceMotion, index, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [LIFT, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
