import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, TAB_BAR_FOOTPRINT } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Елемент справа від заголовка (наприклад, кнопка «+»). */
  right?: ReactNode;
  children?: ReactNode;
}

/** Каркас екрана: прокручуваний вміст, великий заголовок, відступи під рядок стану й панель вкладок. */
export function Screen({ title, subtitle, right, children }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 14,
        paddingBottom: insets.bottom + TAB_BAR_FOOTPRINT + 28,
        paddingHorizontal: layout.gutter,
      }}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text variant="largeTitle" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="subhead" color="secondaryLabel" style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export interface SectionTitleProps {
  title: string;
  right?: ReactNode;
  /** Верхній відступ; за замовчуванням — стандартний проміжок між розділами. */
  top?: number;
}

export function SectionTitle({ title, right, top = layout.sectionGap }: SectionTitleProps) {
  return (
    <View
      style={{
        marginTop: top,
        marginBottom: 10,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text variant="title3" accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}
