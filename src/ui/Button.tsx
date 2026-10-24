import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text, type TextColor } from './Text';

export type ButtonVariant = 'primary' | 'tinted' | 'plain' | 'destructive' | 'onHero' | 'heroSolid';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `regular` — на всю ширину, `compact` — невелика пігулка. */
  size?: 'regular' | 'compact';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  disabled,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();

  let background = colors.accent;
  let textColor: TextColor = 'onAccent';
  let iconColor = colors.onAccent;
  switch (variant) {
    case 'primary':
      break;
    case 'tinted':
      background = colors.accentSoft;
      textColor = 'tint';
      iconColor = colors.tint;
      break;
    case 'plain':
      background = 'transparent';
      textColor = 'tint';
      iconColor = colors.tint;
      break;
    case 'destructive':
      background = colors.cautionSoft;
      textColor = 'danger';
      iconColor = colors.danger;
      break;
    case 'onHero':
      background = colors.heroChip;
      textColor = 'heroText';
      iconColor = colors.heroText;
      break;
    case 'heroSolid':
      background = '#FFFFFF';
      textColor = 'tint';
      iconColor = '#534FDB';
      break;
  }

  const compact = size === 'compact';
  const height = compact ? 38 : 54;

  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      haptic="tap"
      accessibilityLabel={accessibilityLabel ?? title}
      style={[
        {
          height,
          minWidth: compact ? 0 : undefined,
          paddingHorizontal: compact ? 16 : 20,
          borderRadius: height / 2,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          alignSelf: compact ? 'flex-start' : 'stretch',
        },
        style,
      ]}
    >
      {icon ? (
        <View style={{ marginRight: 8 }}>
          <Icon name={icon} size={compact ? 18 : 20} color={iconColor} />
        </View>
      ) : null}
      <Text variant={compact ? 'subhead' : 'headline'} color={textColor} style={compact ? { fontFamily: fontFamilies.semibold } : null}>
        {title}
      </Text>
    </Tap>
  );
}
