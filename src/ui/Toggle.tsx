import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { selectionHaptic } from './haptics';

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
  const x = useRef(new Animated.Value(value ? TRAVEL : 0)).current;

  useEffect(() => {
    Animated.timing(x, { toValue: value ? TRAVEL : 0, duration: 180, useNativeDriver: true }).start();
  }, [value, x]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
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
          transform: [{ translateX: x }],
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
