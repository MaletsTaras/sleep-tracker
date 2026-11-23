import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { selectionHaptic, tapHaptic } from './haptics';
import { springs, useReduceMotion } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TapProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Вібровідгук під час натискання. */
  haptic?: 'tap' | 'selection' | false;
  /** Наскільки приглушується елемент під пальцем (0..1). */
  pressedOpacity?: number;
  /** До якого розміру «стискається» елемент під пальцем (1 — не стискається, для рядків списку). */
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'switch' | 'checkbox' | 'radio';
  accessibilityState?: { selected?: boolean; disabled?: boolean; checked?: boolean };
  children?: ReactNode;
}

/**
 * Натискний елемент у стилі iOS: під пальцем легко стискається й тьмяніє, а відпущений — пружно повертається.
 * Рух іде на рідному потоці, тому реагує миттєво.
 */
export function Tap({
  onPress,
  onLongPress,
  disabled,
  haptic = false,
  pressedOpacity = 0.7,
  pressedScale = 0.97,
  style,
  hitSlop,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  children,
}: TapProps) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const dim = useRef(new Animated.Value(1)).current;

  const animate = (down: boolean) => {
    const shrink = down && !reduceMotion ? pressedScale : 1;
    Animated.parallel([
      Animated.spring(scale, { toValue: shrink, ...springs.press, useNativeDriver: true }),
      Animated.timing(dim, { toValue: down ? pressedOpacity : 1, duration: down ? 70 : 200, useNativeDriver: true }),
    ]).start();
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      onPressIn={() => animate(true)}
      onPressOut={() => animate(false)}
      onLongPress={onLongPress}
      onPress={() => {
        if (haptic === 'tap') tapHaptic();
        else if (haptic === 'selection') selectionHaptic();
        onPress?.();
      }}
      style={[style, { opacity: disabled ? 0.4 : dim, transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
