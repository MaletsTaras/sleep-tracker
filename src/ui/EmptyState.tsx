import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  /** Кнопки під текстом. */
  children?: ReactNode;
}

/** Порожній стан: що тут буде і що зробити, щоб воно з'явилось. */
export function EmptyState({ icon, title, message, children }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <Card padding={24} style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        <Icon name={icon} size={28} color={colors.tint} />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      <Text variant="subhead" color="secondaryLabel" align="center" style={{ marginTop: 6 }}>
        {message}
      </Text>
      {children ? <View style={{ alignSelf: 'stretch', marginTop: 18 }}>{children}</View> : null}
    </Card>
  );
}
