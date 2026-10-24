import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { selectionHaptic } from './haptics';
import { Text } from './Text';

const ROWS = 5;

export interface DurationPickerProps {
  /** Тривалість у хвилинах (0..1439). */
  minutes: number;
  onChange: (minutes: number) => void;
  itemHeight?: number;
}

/** Два барабани, як у годиннику iOS: години (0–23) і хвилини (0–59). Кожна зупинка дає легку вібрацію. */
export function DurationPicker({ minutes, onChange, itemHeight = 44 }: DurationPickerProps) {
  const { colors } = useTheme();
  const clamped = Math.min(1439, Math.max(0, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const padY = (itemHeight * (ROWS - 1)) / 2;

  return (
    <View style={{ height: itemHeight * ROWS, marginHorizontal: 20 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: padY,
          height: itemHeight,
          borderRadius: 14,
          backgroundColor: colors.fill,
        }}
      />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Wheel
          count={24}
          value={hours}
          unit="год"
          label="Години"
          itemHeight={itemHeight}
          onChange={(h) => onChange(h * 60 + mins)}
        />
        <Wheel
          count={60}
          value={mins}
          unit="хв"
          label="Хвилини"
          pad
          itemHeight={itemHeight}
          onChange={(m) => onChange(hours * 60 + m)}
        />
      </View>
    </View>
  );
}

interface WheelProps {
  count: number;
  value: number;
  unit: string;
  label: string;
  pad?: boolean;
  itemHeight: number;
  onChange: (value: number) => void;
}

function Wheel({ count, value, unit, label, pad, itemHeight, onChange }: WheelProps) {
  const ref = useRef<ScrollView>(null);
  const ready = useRef(false);
  /** Індекс, який барабан зараз показує. */
  const shown = useRef(value);
  /** Куди барабан їде програмно (кнопки швидкого вибору, зміна дати); під час руху події прокрутки ігноруємо. */
  const travelTo = useRef<number | null>(null);
  const [active, setActive] = useState(value);
  const padY = (itemHeight * (ROWS - 1)) / 2;

  useEffect(() => {
    if (!ready.current || value === shown.current) return undefined;
    shown.current = value;
    travelTo.current = value;
    setActive(value);
    ref.current?.scrollTo({ y: value * itemHeight, animated: true });
    const release = setTimeout(() => {
      if (travelTo.current === value) travelTo.current = null;
    }, 700);
    return () => clearTimeout(release);
  }, [value, itemHeight]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!ready.current) return;
    const index = Math.min(count - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.y / itemHeight)));
    if (travelTo.current !== null) {
      if (index === travelTo.current) travelTo.current = null;
      return;
    }
    if (index !== shown.current) {
      shown.current = index;
      setActive(index);
      selectionHaptic();
      onChange(index);
    }
  };

  const step = (delta: number) => {
    const next = Math.min(count - 1, Math.max(0, shown.current + delta));
    if (next !== shown.current) onChange(next);
  };

  return (
    <View
      style={{ flex: 1 }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${value} ${unit}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        decelerationRate="fast"
        snapToInterval={itemHeight}
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onContentSizeChange={() => {
          if (ready.current) return;
          ready.current = true;
          ref.current?.scrollTo({ y: shown.current * itemHeight, animated: false });
        }}
        contentContainerStyle={{ paddingVertical: padY }}
      >
        {Array.from({ length: count }, (_, index) => {
          const distance = Math.abs(index - active);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.55 : distance === 2 ? 0.28 : 0.14;
          return (
            <View
              key={index}
              style={{ height: itemHeight, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 52 }}
            >
              <Text
                variant="title2"
                tabular
                style={{ opacity, fontFamily: distance === 0 ? fontFamilies.bold : fontFamilies.medium }}
              >
                {pad ? String(index).padStart(2, '0') : String(index)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: 10, top: padY, height: itemHeight, width: 34, justifyContent: 'center' }}
      >
        <Text variant="callout" color="secondaryLabel" style={{ fontFamily: fontFamilies.medium }}>
          {unit}
        </Text>
      </View>
    </View>
  );
}
