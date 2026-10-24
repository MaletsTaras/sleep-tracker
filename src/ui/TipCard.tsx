import { View } from 'react-native';

import { clockTimeLabel } from '../state/selectors';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { TIP_KIND_LABELS, type Tip } from '../tips/types';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';

export interface TipCardProps {
  tip: Tip;
  /** Коли порада зміниться (мс від епохи). */
  nextAt: number;
}

/** Порада або цікавий факт; змінюється кожні дві години. */
export function TipCard({ tip, nextAt }: TipCardProps) {
  const { colors } = useTheme();
  const isFact = tip.kind === 'fact';
  return (
    <Card padding={18}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Icon name={isFact ? 'sparkles' : 'bulb'} size={18} color={colors.tint} />
        </View>
        <Text variant="subhead" color="tint" style={{ fontFamily: fontFamilies.semibold }}>
          {TIP_KIND_LABELS[tip.kind]}
        </Text>
      </View>
      <Text variant="body" accessibilityLiveRegion="polite">
        {tip.text}
      </Text>
      <Text variant="footnote" color="secondaryLabel" style={{ marginTop: 12 }}>
        {`Наступна — о ${clockTimeLabel(nextAt)}`}
      </Text>
    </Card>
  );
}
