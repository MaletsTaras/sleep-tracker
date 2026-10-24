import { fontFamilies, textVariants, type TextVariant } from '../theme/typography';
import { Text, type TextColor } from './Text';

export interface MetricProps {
  value: string;
  unit?: string;
  variant?: TextVariant;
  color?: TextColor;
  unitColor?: TextColor;
  unitScale?: number;
}

/** Число з дрібною одиницею поруч: «12 днів», «5 з 6». Один рядок тексту, тому добре читається зчитувачами екрана. */
export function Metric({ value, unit, variant = 'metricM', color = 'label', unitColor = 'secondaryLabel', unitScale = 0.5 }: MetricProps) {
  const spec = textVariants[variant];
  return (
    <Text variant={variant} color={color} numberOfLines={1}>
      {value}
      {unit ? (
        <Text
          variant={variant}
          color={unitColor}
          style={{ fontFamily: fontFamilies.medium, fontSize: Math.max(12, Math.round(spec.fontSize * unitScale)), letterSpacing: 0 }}
        >
          {`\u00A0${unit}`}
        </Text>
      ) : null}
    </Text>
  );
}
