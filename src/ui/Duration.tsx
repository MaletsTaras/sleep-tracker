import { StyleSheet } from 'react-native';

import { splitHM } from '../domain/format';
import { fontFamilies, textVariants, type TextVariant } from '../theme/typography';
import { Text, type TextColor } from './Text';

export interface DurationProps {
  minutes: number;
  variant?: TextVariant;
  color?: TextColor;
  unitColor?: TextColor;
  /** Розмір одиниць виміру відносно цифр. */
  unitScale?: number;
}

const NBSP = '\u00A0'; // нерозривний пробіл: цифра не відривається від «год»/«хв»

/**
 * Тривалість із дрібними одиницями: «7 год 30 хв», де цифри великі, а «год» і «хв» — менші.
 * Це лишається одним рядком тексту, тому добре читається зчитувачами екрана.
 */
export function Duration({ minutes, variant = 'metricM', color = 'label', unitColor = 'secondaryLabel', unitScale = 0.46 }: DurationProps) {
  const { h, m } = splitHM(minutes);
  const spec = textVariants[variant];
  const unitStyle = {
    fontFamily: fontFamilies.medium,
    fontSize: Math.max(12, Math.round(spec.fontSize * unitScale)),
    letterSpacing: 0,
  };

  const showHours = h > 0 || m === 0;
  const showMinutes = m > 0;

  return (
    <Text variant={variant} color={color} style={styles.row}>
      {showHours ? (
        <>
          {h}
          <Text variant={variant} color={unitColor} style={unitStyle}>
            {`${NBSP}год`}
          </Text>
        </>
      ) : null}
      {showHours && showMinutes ? ' ' : null}
      {showMinutes ? (
        <>
          {m}
          <Text variant={variant} color={unitColor} style={unitStyle}>
            {`${NBSP}хв`}
          </Text>
        </>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexShrink: 1 },
});
