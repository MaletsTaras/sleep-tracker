import { useMemo, useState } from 'react';
import { Animated, View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { fontFamilies } from '../../theme/typography';
import { Text } from '../Text';
import { useGrow } from '../useGrow';

export interface HBarRow {
  key: string;
  label: string;
  count: number;
  /** Підпис значення справа: «3 дні» або «—». */
  valueText: string;
  /** Виділити рядок (наприклад, найчастіший). */
  strong?: boolean;
  a11y: string;
}

export interface HBarsProps {
  rows: readonly HBarRow[];
}

const ROW_HEIGHT = 34;
const BAR_HEIGHT = 10;

/** Горизонтальні смуги для розподілу «скільки ночей припало на кожну тривалість сну». */
export function HBars({ rows }: HBarsProps) {
  const { colors } = useTheme();
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <View>
      {rows.map((row, index) => (
        <View
          key={row.key}
          accessible
          accessibilityLabel={row.a11y}
          style={{ height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text
            variant="footnote"
            color={row.count > 0 ? 'label' : 'secondaryLabel'}
            tabular
            style={{ width: 64, fontFamily: row.strong ? fontFamilies.semibold : fontFamilies.regular }}
          >
            {row.label}
          </Text>
          {row.count > 0 ? (
            <FillBar fraction={Math.max(0.03, row.count / max)} delay={Math.min(index, 8) * 40} />
          ) : (
            <View style={{ flex: 1, height: BAR_HEIGHT, justifyContent: 'center' }}>
              <View style={{ height: 1, backgroundColor: colors.chartGrid }} />
            </View>
          )}
          <Text
            variant="footnote"
            color={row.count > 0 ? 'label' : 'tertiaryLabel'}
            align="right"
            tabular
            style={{ width: 70, fontFamily: row.strong ? fontFamilies.semibold : fontFamilies.regular }}
          >
            {row.valueText}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface FillBarProps {
  /** Частка ширини доріжки (0..1). */
  fraction: number;
  delay: number;
}

/** Смуга, що виїжджає зліва: масштабується по горизонталі, а зсув тримає лівий край на місці. */
function FillBar({ fraction, delay }: FillBarProps) {
  const { colors } = useTheme();
  const grow = useGrow(delay);
  const [trackWidth, setTrackWidth] = useState(0);
  const barWidth = trackWidth * Math.min(1, fraction);
  const slide = useMemo(() => grow.interpolate({ inputRange: [0, 1], outputRange: [-barWidth / 2, 0] }), [grow, barWidth]);
  return (
    <View
      style={{ flex: 1, height: BAR_HEIGHT, justifyContent: 'center' }}
      onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={{
          width: barWidth,
          height: BAR_HEIGHT,
          backgroundColor: colors.chartBar,
          borderTopRightRadius: 4,
          borderBottomRightRadius: 4,
          transform: [{ translateX: slide }, { scaleX: grow }],
        }}
      />
    </View>
  );
}
