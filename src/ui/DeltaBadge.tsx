import { View } from 'react-native';

import { formatDelta } from '../domain/format';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { Icon } from './Icon';
import { Text } from './Text';

export interface DeltaBadgeProps {
  /** Зміна в хвилинах: додатна — спали більше. */
  minutes: number;
  /** З чим порівнюємо: «проти минулого тижня». */
  suffix?: string;
}

/** Невелика позначка зміни. Колір завжди супроводжується стрілкою, знаком і підписом. */
export function DeltaBadge({ minutes, suffix }: DeltaBadgeProps) {
  const { colors } = useTheme();
  const rounded = Math.round(minutes);
  const flat = Math.abs(rounded) < 5;
  const up = rounded > 0;

  const background = flat ? colors.fill : up ? colors.positiveSoft : colors.cautionSoft;
  const color = flat ? 'secondaryLabel' : up ? 'positive' : 'caution';
  const iconColor = flat ? colors.secondaryLabel : up ? colors.positive : colors.caution;
  const text = flat ? 'Без змін' : formatDelta(rounded);

  return (
    <View
      accessible
      accessibilityLabel={`${flat ? 'Без змін' : formatDelta(rounded)}${suffix ? ` ${suffix}` : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: background,
        borderRadius: 14,
        paddingVertical: 5,
        paddingLeft: 8,
        paddingRight: 10,
      }}
    >
      <Icon name={flat ? 'minus' : up ? 'trendUp' : 'trendDown'} size={16} color={iconColor} strokeWidth={2.2} />
      <Text variant="footnote" color={color} style={{ marginLeft: 5, fontFamily: fontFamilies.semibold }}>
        {text}
        {suffix ? <Text variant="footnote" color={color} style={{ fontFamily: fontFamilies.regular }}>{` ${suffix}`}</Text> : null}
      </Text>
    </View>
  );
}
