import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { textVariants, type TextVariant } from '../theme/typography';

export type TextColor =
  | 'label'
  | 'secondaryLabel'
  | 'tertiaryLabel'
  | 'tint'
  | 'positive'
  | 'caution'
  | 'danger'
  | 'onAccent'
  | 'heroText'
  | 'heroTextSecondary'
  | 'onToast';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  /** Табличні цифри — лише для чисел, що стоять стовпчиком. */
  tabular?: boolean;
  style?: StyleProp<TextStyle>;
}

/** Єдиний текстовий компонент застосунку: шрифт, розмір і колір беруться з теми. */
export function Text({ variant = 'body', color = 'label', align, tabular, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const spec = textVariants[variant];

  return (
    <RNText
      maxFontSizeMultiplier={1.25}
      {...rest}
      style={[
        {
          fontFamily: spec.fontFamily,
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          letterSpacing: spec.letterSpacing,
          color: colors[color],
          includeFontPadding: false,
        },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
