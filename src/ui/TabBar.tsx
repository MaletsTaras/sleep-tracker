import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { selectionHaptic } from './haptics';
import { Icon, type IconName } from './Icon';
import { springs, useReduceMotion } from './motion';
import type { PagerController } from './Pager';
import { settleTarget, tabLayout, xToPosition } from './tabGeometry';
import { Tap } from './Tap';
import { Text } from './Text';

export type TabKey = 'today' | 'stats' | 'history' | 'settings';

export const TABS: readonly { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'today', label: 'Сьогодні', icon: 'moon' },
  { key: 'stats', label: 'Статистика', icon: 'chart' },
  { key: 'history', label: 'Історія', icon: 'calendar' },
  { key: 'settings', label: 'Параметри', icon: 'sliders' },
];

/** Кнопка «+» стоїть посередині: після другої вкладки. */
const PLUS_AFTER = 2;
const BORDER = 1;
const PAD = 6;
const PLUS_SIZE = 54;
const PLUS_MARGIN = 4;
/** Відступ «скла» від верхнього й нижнього краю панелі та від країв слота вкладки. */
const LENS_INSET_Y = 5;
const LENS_GAP = 3;
/** Наскільки лінза «розтягується» посеред переходу між вкладками й «надувається» під пальцем. */
const LENS_STRETCH = 1.14;
const LENS_GRAB = 1.1;
/** Скільки пальцю треба пройти по горизонталі, щоб жест став перетягуванням лінзи, а не дотиком. */
const DRAG_START = 10;
/** Яку частку відстані до пальця лінза долає за кадр: невелике відставання робить рух «рідким». */
const FOLLOW = 0.34;

export interface TabBarProps {
  pager: PagerController;
  onAdd: () => void;
}

/**
 * Плаваюча панель вкладок із великою кнопкою «+» посередині: запис сну — головна дія застосунку.
 * Під активною вкладкою лежить «скляна» лінза. Вона рухається разом зі сторінками (положення бере з `pager.position`),
 * тож однаково слухається свайпу, дотику й перетягування пальцем.
 */
export function TabBar({ pager, onAdd }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  // На вузьких екранах (360 dp і менше) панель трохи ширша, щоб підписи вкладок не стискались.
  const sideMargin = width < 380 ? 10 : layout.tabBarSideMargin;
  const inner = layout.tabBarHeight - BORDER * 2;

  const geometry = useMemo(
    () =>
      tabLayout({
        barWidth: width - sideMargin * 2,
        border: BORDER,
        pad: PAD,
        plusSlot: PLUS_SIZE + PLUS_MARGIN * 2,
        count: TABS.length,
        plusAfter: PLUS_AFTER,
      }),
    [width, sideMargin],
  );
  const lensWidth = Math.max(0, geometry.slot - LENS_GAP * 2);
  const lensHeight = inner - LENS_INSET_Y * 2;

  const { position } = pager;
  const grab = useRef(new Animated.Value(0)).current;

  const lensX = useMemo(
    () =>
      position.interpolate({
        inputRange: TABS.map((_, index) => index),
        outputRange: geometry.lefts.map((left) => left + LENS_GAP),
        extrapolate: 'clamp',
      }),
    [position, geometry],
  );
  // Посеред переходу між двома вкладками лінза найширша, на вкладці — звичайна.
  const lensStretch = useMemo(() => {
    const steps = (TABS.length - 1) * 2 + 1;
    return position.interpolate({
      inputRange: Array.from({ length: steps }, (_, i) => i / 2),
      outputRange: Array.from({ length: steps }, (_, i) => (i % 2 === 1 ? LENS_STRETCH : 1)),
      extrapolate: 'clamp',
    });
  }, [position]);
  const lensGrab = useMemo(() => grab.interpolate({ inputRange: [0, 1], outputRange: [1, LENS_GRAB] }), [grab]);

  // Обробники жесту живуть довго, тож свіжі значення беруть із цього «живого» об'єкта.
  const live = useRef({ sideMargin, centers: geometry.centers, slot: geometry.slot, pager, reduceMotion });
  live.current = { sideMargin, centers: geometry.centers, slot: geometry.slot, pager, reduceMotion };
  const drag = useRef({ active: false, target: 0, cur: 0, near: 0, raf: 0 }).current;

  useEffect(
    () => () => {
      drag.active = false;
      if (drag.raf) cancelAnimationFrame(drag.raf);
    },
    [drag],
  );

  const responder = useMemo(() => {
    const spring = (value: number) => {
      if (live.current.reduceMotion) return;
      Animated.spring(grab, { toValue: value, ...springs.bouncy, useNativeDriver: true }).start();
    };
    const fingerPosition = (moveX: number) => xToPosition(moveX - live.current.sideMargin - BORDER, live.current.centers);

    const frame = () => {
      drag.raf = 0;
      if (!drag.active) return;
      const delta = drag.target - drag.cur;
      if (delta !== 0) {
        drag.cur = Math.abs(delta) < 0.004 ? drag.target : drag.cur + delta * FOLLOW;
        live.current.pager.scrubTo(drag.cur);
        const nearest = Math.round(drag.cur);
        if (nearest !== drag.near) {
          drag.near = nearest;
          selectionHaptic();
        }
      }
      drag.raf = requestAnimationFrame(frame);
    };

    const finish = (velocity: number) => {
      if (!drag.active) return;
      drag.active = false;
      if (drag.raf) cancelAnimationFrame(drag.raf);
      drag.raf = 0;
      spring(0);
      const { slot, pager: current } = live.current;
      // Швидкість у dp за мс переводимо у «вкладки за мс»; один змах гортає не більш ніж на одну вкладку.
      current.goTo(settleTarget(drag.target, slot > 0 ? velocity / slot : 0, TABS.length - 1));
    };

    return PanResponder.create({
      // Дотики віддаємо вкладкам; перехоплюємо лише коли палець явно поїхав убік.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dx) > DRAG_START && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_event, gesture) => {
        drag.active = true;
        drag.cur = live.current.pager.getPosition();
        drag.near = Math.round(drag.cur);
        drag.target = fingerPosition(gesture.moveX);
        spring(1);
        if (!drag.raf) drag.raf = requestAnimationFrame(frame);
      },
      onPanResponderMove: (_event, gesture) => {
        drag.target = fingerPosition(gesture.moveX);
      },
      onPanResponderRelease: (_event, gesture) => finish(gesture.vx),
      onPanResponderTerminate: () => finish(0),
    });
  }, [grab, drag]);

  const active = pager.current;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + layout.tabBarMargin }}>
      <View
        accessibilityRole="tablist"
        {...responder.panHandlers}
        style={{
          marginHorizontal: sideMargin,
          height: layout.tabBarHeight,
          borderRadius: layout.tabBarHeight / 2,
          backgroundColor: colors.tabBar,
          borderWidth: BORDER,
          borderColor: colors.tabBarBorder,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: PAD,
          shadowColor: colors.shadow,
          shadowOpacity: colors.isDark ? 0.5 : 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 14,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: LENS_INSET_Y,
            width: lensWidth,
            height: lensHeight,
            borderRadius: lensHeight / 2,
            overflow: 'hidden',
            backgroundColor: colors.lens,
            borderWidth: 1,
            borderColor: colors.lensBorder,
            transform: reduceMotion
              ? [{ translateX: lensX }]
              : [{ translateX: lensX }, { scaleX: lensStretch }, { scale: lensGrab }],
          }}
        >
          {/* Блик зверху: світла смуга, що тане до середини, як на склі. */}
          <LinearGradient
            colors={colors.lensSheen}
            locations={[0, 0.7]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {TABS.slice(0, PLUS_AFTER).map((tab, index) => (
          <TabItem key={tab.key} tab={tab} index={index} selected={active === index} pager={pager} height={inner} />
        ))}
        <Tap
          onPress={onAdd}
          haptic="tap"
          pressedOpacity={0.75}
          pressedScale={0.9}
          accessibilityLabel="Додати запис сну"
          style={{
            width: PLUS_SIZE,
            height: PLUS_SIZE,
            borderRadius: PLUS_SIZE / 2,
            marginHorizontal: PLUS_MARGIN,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={28} color={colors.onAccent} strokeWidth={2.4} />
        </Tap>
        {TABS.slice(PLUS_AFTER).map((tab, offset) => (
          <TabItem
            key={tab.key}
            tab={tab}
            index={PLUS_AFTER + offset}
            selected={active === PLUS_AFTER + offset}
            pager={pager}
            height={inner}
          />
        ))}
      </View>
    </View>
  );
}

interface TabItemProps {
  tab: { key: TabKey; label: string; icon: IconName };
  index: number;
  selected: boolean;
  pager: PagerController;
  height: number;
}

/**
 * Одна вкладка. Іконка й підпис малюються двічі: сірий шар і кольоровий шар.
 * Коли лінза пропливає повз, шари плавно перетікають один в одного, а іконка трохи «підстрибує».
 */
function TabItem({ tab, index, selected, pager, height }: TabItemProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const { position } = pager;

  const { on, off, lift } = useMemo(() => {
    const inputRange = [index - 1, index, index + 1];
    return {
      on: position.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
      off: position.interpolate({ inputRange, outputRange: [1, 0, 1], extrapolate: 'clamp' }),
      lift: position.interpolate({ inputRange, outputRange: [1, reduceMotion ? 1 : 1.1, 1], extrapolate: 'clamp' }),
    };
  }, [position, index, reduceMotion]);

  const face = (color: string) => (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: lift }] }}>
        <Icon name={tab.icon} size={24} color={color} strokeWidth={2} />
      </Animated.View>
      <Text
        variant="caption"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{ marginTop: 3, fontSize: 11, lineHeight: 14, fontFamily: fontFamilies.semibold, color }}
      >
        {tab.label}
      </Text>
    </View>
  );

  return (
    <Tap
      onPress={() => (selected ? undefined : pager.goTo(index))}
      haptic="selection"
      pressedOpacity={0.6}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected }}
      style={{ flex: 1, height, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={{ opacity: off }}>{face(colors.secondaryLabel)}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: on, alignItems: 'center', justifyContent: 'center' }]}>
        {face(colors.tint)}
      </Animated.View>
    </Tap>
  );
}
