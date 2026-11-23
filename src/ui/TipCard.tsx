import { View } from 'react-native';

import { clockTimeLabel } from '../state/selectors';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { TIP_KIND_LABELS, type Tip } from '../tips/types';
import { Card } from './Card';
import { CrossFade } from './CrossFade';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

export interface TipCardProps {
  tip: Tip;
  /** Коли порада зміниться (мс від епохи). */
  nextAt: number;
  /** Показати іншу пораду просто зараз. */
  onAnother?: () => void;
}

/** Порада або цікавий факт; змінюється кожні дві години. */
export function TipCard({ tip, nextAt, onAnother }: TipCardProps) {
  const { colors } = useTheme();
  const isFact = tip.kind === 'fact';
  return (
    <Card padding={18}>
      <CrossFade id={tip.id}>
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
      </CrossFade>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Text variant="footnote" color="secondaryLabel" style={{ flex: 1 }}>
          {`Наступна — о ${clockTimeLabel(nextAt)}`}
        </Text>
        {onAnother ? (
          <Tap onPress={onAnother} haptic="selection" hitSlop={10} accessibilityLabel="Показати іншу пораду" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="footnote" color="tint" style={{ fontFamily: fontFamilies.semibold }}>
              Ще одна
            </Text>
            <Icon name="chevronRight" size={14} color={colors.tint} strokeWidth={2.4} />
          </Tap>
        ) : null}
      </View>
    </Card>
  );
}
