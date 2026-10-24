import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { layout } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface TileProps {
  label: string;
  icon?: IconName;
  /** Головне значення: зазвичай <Duration/> або <Text variant="metricM"/>. */
  value: ReactNode;
  caption?: string;
  style?: StyleProp<ViewStyle>;
}

/** Плитка з одним показником: підпис, значення й коротка примітка. */
export function Tile({ label, icon, value, caption, style }: TileProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      style={[{ backgroundColor: colors.card, borderRadius: layout.radiusTile, padding: 14, minHeight: 108 }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon ? (
          <View style={{ marginRight: 6 }}>
            <Icon name={icon} size={17} color={colors.tint} />
          </View>
        ) : null}
        <Text variant="footnote" color="secondaryLabel" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flexShrink: 1 }}>
          {label}
        </Text>
      </View>
      <View style={{ marginTop: 8 }}>{value}</View>
      {caption ? (
        <Text variant="footnote" color="secondaryLabel" numberOfLines={2} style={{ marginTop: 4 }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
