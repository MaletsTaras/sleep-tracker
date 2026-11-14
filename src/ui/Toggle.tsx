import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { selectionHaptic } from './haptics';
import { springs, useReduceMotion } from './motion';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}

const TRACK_W = 51;
const TRACK_H = 31;
const THUMB = 27;
const TRAVEL = TRACK_W - THUMB - 4;

/** Перемикач у стилі iOS. */
export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const x = useRef(new Animated.Value(value ? TRAVEL : 0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      x.setValue(value ? TRAVEL : 0);
      return;
    }
    Animated.spring(x, { toValue: value ? TRAVEL : 0, ...springs.thumb, useNativeDriver: true }).start();
  }, [value, x, reduceMotion]);

  const stretch = useMemo(() => press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }), [press]);

  const squeeze = (down: boolean) => {
    if (reduceMotion) return;
    Animated.spring(press, { toValue: down ? 1 : 0, ...springs.press, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPressIn={() => squeeze(true)}
      onPressOut={() => squeeze(false)}
      onPress={() => {
        selectionHaptic();
        onValueChange(!value);
      }}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        padding: 2,
        backgroundColor: value ? colors.accent : colors.fillStrong,
      }}
    >
      <Animated.View
        style={{
          width: THUMB,
          height: THUMB,
          borderRadius: THUMB / 2,
          backgroundColor: '#FFFFFF',
          // Під пальцем бігунок трохи витягується в довжину, як у iOS.
          transform: [{ translateX: x }, { scaleX: stretch }],
          shadowColor: '#000000',
          shadowOpacity: 0.25,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
}
