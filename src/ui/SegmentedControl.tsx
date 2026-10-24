import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { selectionHaptic } from './haptics';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

const PAD = 2;
const HEIGHT = 36;

/** Сегментований перемикач у стилі iOS із плавним бігунком. */
export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segmentWidth = options.length > 0 ? (width - PAD * 2) / options.length : 0;

  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (segmentWidth <= 0) return;
    const target = index * segmentWidth;
    if (!placed.current) {
      x.setValue(target);
      placed.current = true;
      return;
    }
    Animated.spring(x, { toValue: target, tension: 260, friction: 26, useNativeDriver: true }).start();
  }, [index, segmentWidth, x]);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={[{ height: HEIGHT, borderRadius: HEIGHT / 2, backgroundColor: colors.fill, padding: PAD }, style]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: PAD,
            top: PAD,
            width: segmentWidth,
            height: HEIGHT - PAD * 2,
            borderRadius: (HEIGHT - PAD * 2) / 2,
            backgroundColor: colors.thumb,
            transform: [{ translateX: x }],
            shadowColor: '#000000',
            shadowOpacity: colors.isDark ? 0 : 0.12,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: colors.isDark ? 0 : 2,
          }}
        />
      ) : null}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                selectionHaptic();
                onChange(option.value);
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                variant="footnote"
                color="label"
                numberOfLines={1}
                style={{ fontFamily: selected ? fontFamilies.semibold : fontFamilies.medium, fontSize: 14, letterSpacing: -0.2 }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
