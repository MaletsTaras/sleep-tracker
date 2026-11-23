import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { springs, useReduceMotion } from './motion';

export interface CrossFadeProps {
  /** Поки `id` той самий, вміст оновлюється як звичайно; коли `id` міняється — старий вміст згасає, новий проявляється. */
  id: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Плавна заміна вмісту (наприклад, нової поради) без різкого «стрибка». */
export function CrossFade({ id, style, children }: CrossFadeProps) {
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState<{ id: string; node: ReactNode }>({ id, node: children });
  const opacity = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const latest = useRef(children);
  latest.current = children;

  useEffect(() => {
    if (id === shown.id) return undefined;
    if (reduceMotion) {
      setShown({ id, node: latest.current });
      return undefined;
    }
    const out = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(lift, { toValue: -6, duration: 120, useNativeDriver: true }),
    ]);
    out.start(({ finished }) => {
      if (!finished) return;
      setShown({ id, node: latest.current });
      lift.setValue(8);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(lift, { toValue: 0, ...springs.soft, useNativeDriver: true }),
      ]).start();
    });
    return () => out.stop();
  }, [id, shown.id, reduceMotion, opacity, lift]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY: lift }] }]}>{shown.id === id ? children : shown.node}</Animated.View>;
}
