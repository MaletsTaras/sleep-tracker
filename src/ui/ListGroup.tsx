import { Children, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { layout } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

export interface ListGroupProps {
  /** Заголовок над групою (звичайний регістр, без великих літер). */
  header?: string;
  /** Пояснення під групою. */
  footer?: string;
  children: ReactNode;
}

/** Згрупований список у стилі налаштувань iOS: одна картка, рядки розділені тонкою лінією. */
export function ListGroup({ header, footer, children }: ListGroupProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ marginTop: layout.sectionGap - 6 }}>
      {header ? (
        <Text variant="footnote" color="secondaryLabel" style={{ marginBottom: 8, paddingHorizontal: 8, fontFamily: fontFamilies.semibold }}>
          {header}
        </Text>
      ) : null}
      <View style={{ backgroundColor: colors.card, borderRadius: layout.radiusCard, overflow: 'hidden' }}>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 56 }} /> : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <Text variant="footnote" color="secondaryLabel" style={{ marginTop: 8, paddingHorizontal: 8 }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export interface ListRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  /** Елемент справа: значення, перемикач, крок. */
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** Показати шеврон «>» справа. */
  chevron?: boolean;
}

export function ListRow({ icon, title, subtitle, right, onPress, destructive, chevron }: ListRowProps) {
  const { colors } = useTheme();
  const tone = destructive ? colors.danger : colors.tint;
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 10, paddingHorizontal: 14 }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: destructive ? colors.cautionSoft : colors.accentSoft,
          marginRight: 12,
        }}
      >
        <Icon name={icon} size={18} color={tone} />
      </View>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text variant="body" color={destructive ? 'danger' : 'label'} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="secondaryLabel" style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevronRight" size={18} color={colors.tertiaryLabel} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Tap onPress={onPress} pressedOpacity={0.6} accessibilityLabel={title}>
      {content}
    </Tap>
  );
}
