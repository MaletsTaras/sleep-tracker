import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { layout } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';

export interface CardProps {
  children?: ReactNode;
  padding?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Світла картка на сірому тлі (у темній темі — темно-сіра на чорному). Без рамок і тіней, як у згрупованих списках iOS. */
export function Card({ children, padding = 16, radius = layout.radiusCard, style }: CardProps) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.card, borderRadius: radius, padding }, style]}>{children}</View>;
}
