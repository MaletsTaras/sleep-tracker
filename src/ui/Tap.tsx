import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { selectionHaptic, tapHaptic } from './haptics';

export interface TapProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Вібровідгук під час натискання. */
  haptic?: 'tap' | 'selection' | false;
  /** Наскільки приглушується елемент під пальцем (0..1). */
  pressedOpacity?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'switch' | 'checkbox' | 'radio';
  accessibilityState?: { selected?: boolean; disabled?: boolean; checked?: boolean };
  children?: ReactNode;
}

/** Натискний елемент у стилі iOS: під пальцем стає напівпрозорим (без хвиль Material). */
export function Tap({
  onPress,
  onLongPress,
  disabled,
  haptic = false,
  pressedOpacity = 0.55,
  style,
  hitSlop,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  children,
}: TapProps) {
  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      onLongPress={onLongPress}
      onPress={() => {
        if (haptic === 'tap') tapHaptic();
        else if (haptic === 'selection') selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: pressedOpacity } : null, disabled ? { opacity: 0.4 } : null]}
    >
      {children}
    </Pressable>
  );
}
