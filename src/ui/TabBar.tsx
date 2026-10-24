import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

export type TabKey = 'today' | 'stats' | 'history' | 'settings';

const LEFT: readonly { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'today', label: 'Сьогодні', icon: 'moon' },
  { key: 'stats', label: 'Статистика', icon: 'chart' },
];

const RIGHT: readonly { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'history', label: 'Історія', icon: 'calendar' },
  { key: 'settings', label: 'Параметри', icon: 'sliders' },
];

export interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  onAdd: () => void;
}

/** Плаваюча панель вкладок з великою кнопкою «+» посередині: запис сну — головна дія застосунку. */
export function TabBar({ active, onChange, onAdd }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // На вузьких екранах (360 dp і менше) панель трохи ширша, щоб підписи вкладок не стискались.
  const sideMargin = width < 380 ? 10 : layout.tabBarSideMargin;

  const renderTab = (tab: { key: TabKey; label: string; icon: IconName }) => {
    const selected = tab.key === active;
    return (
      <Tap
        key={tab.key}
        onPress={() => (selected ? undefined : onChange(tab.key))}
        haptic="selection"
        pressedOpacity={0.6}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected }}
        style={{ flex: 1, height: layout.tabBarHeight, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={tab.icon} size={24} color={selected ? colors.tint : colors.secondaryLabel} strokeWidth={selected ? 2.2 : 1.8} />
        <Text
          variant="caption"
          color={selected ? 'tint' : 'secondaryLabel'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={{ marginTop: 3, fontSize: 11, lineHeight: 14, fontFamily: selected ? fontFamilies.semibold : fontFamilies.medium }}
        >
          {tab.label}
        </Text>
      </Tap>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + layout.tabBarMargin }}
    >
      <View
        style={{
          marginHorizontal: sideMargin,
          height: layout.tabBarHeight,
          borderRadius: layout.tabBarHeight / 2,
          backgroundColor: colors.tabBar,
          borderWidth: 1,
          borderColor: colors.tabBarBorder,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
          shadowColor: colors.shadow,
          shadowOpacity: colors.isDark ? 0.5 : 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 14,
        }}
      >
        {LEFT.map(renderTab)}
        <Tap
          onPress={onAdd}
          haptic="tap"
          pressedOpacity={0.75}
          accessibilityLabel="Додати запис сну"
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            marginHorizontal: 4,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={28} color={colors.onAccent} strokeWidth={2.4} />
        </Tap>
        {RIGHT.map(renderTab)}
      </View>
    </View>
  );
}
