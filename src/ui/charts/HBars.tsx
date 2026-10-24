import { View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { fontFamilies } from '../../theme/typography';
import { Text } from '../Text';

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
      {rows.map((row) => (
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
          <View style={{ flex: 1, height: BAR_HEIGHT, justifyContent: 'center' }}>
            {row.count > 0 ? (
              <View
                style={{
                  width: `${Math.max(3, (row.count / max) * 100)}%`,
                  height: BAR_HEIGHT,
                  backgroundColor: colors.chartBar,
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                }}
              />
            ) : (
              <View style={{ height: 1, backgroundColor: colors.chartGrid }} />
            )}
          </View>
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
