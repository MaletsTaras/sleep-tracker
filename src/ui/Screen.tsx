import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, TAB_BAR_FOOTPRINT } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { Reveal } from './Reveal';
import { Text } from './Text';

/**
 * Розкладає Fragment на окремі блоки (щоб кожен виринав зі своєю затримкою) і дає кожному стабільний ключ,
 * що залежить від місця в розмітці, а не від порядкового номера: блок, який з'являється чи зникає, не зсуває решту.
 */
function flattenBlocks(nodes: ReactNode, prefix = ''): ReactNode[] {
  const out: ReactNode[] = [];
  for (const node of Children.toArray(nodes)) {
    if (!isValidElement(node)) {
      out.push(node);
    } else if (node.type === Fragment) {
      out.push(...flattenBlocks((node as ReactElement<{ children?: ReactNode }>).props.children, `${prefix}${node.key}/`));
    } else {
      out.push(prefix ? cloneElement(node, { key: `${prefix}${node.key}` }) : node);
    }
  }
  return out;
}

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
  const blocks = flattenBlocks(children);

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
      <Reveal index={0} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
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
      </Reveal>
      {/* Кожен блок виринає зі своєю затримкою, тож екран «збирається» каскадом, а не з'являється одним шматком. */}
      {blocks.map((block, index) => (
        <Reveal key={isValidElement(block) && block.key !== null ? block.key : index} index={index + 1}>
          {block}
        </Reveal>
      ))}
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
