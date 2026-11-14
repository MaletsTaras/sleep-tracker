import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View, useWindowDimensions, type GestureResponderHandlers } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { springs, useReduceMotion } from './motion';
import { Tap } from './Tap';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
}

/**
 * Нижній аркуш. Він виїжджає знизу на пружині, а затемнення залежить від положення аркуша,
 * тож однаково плавно реагує і на відкриття, і на закриття, і на те, що аркуш тягнуть пальцем.
 * Потягнути за верхню частину (смужку чи заголовок) донизу — аркуш закриється; недотягнули — пружно повернеться.
 * Вміст монтується щоразу заново при відкритті, тож початкові значення форми завжди свіжі.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const slide = useRef(new Animated.Value(windowHeight)).current;

  // Обробники жесту живуть довго, тож свіжі значення беруть звідси.
  const live = useRef({ visible, onClose, sheetHeight, reduceMotion });
  live.current = { visible, onClose, sheetHeight, reduceMotion };

  /** Пружно їде до `toValue` (0 — аркуш відкритий). З «Зменшити рух» перестрибує одразу. */
  const glide = useCallback(
    (toValue: number, done?: () => void) => {
      slide.stopAnimation();
      if (live.current.reduceMotion) {
        slide.setValue(toValue);
        done?.();
        return;
      }
      Animated.spring(slide, {
        toValue,
        ...springs.sheet,
        overshootClamping: toValue !== 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) done?.();
      });
    },
    [slide],
  );

  useEffect(() => {
    if (visible) {
      if (!mounted) {
        slide.setValue(windowHeight);
        setMounted(true);
        return;
      }
      glide(0);
    } else if (mounted) {
      glide(windowHeight, () => setMounted(false));
    }
  }, [visible, mounted, slide, windowHeight, glide]);

  const fade = useMemo(
    () =>
      slide.interpolate({
        inputRange: [0, Math.max(1, sheetHeight || windowHeight * 0.6)],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [slide, sheetHeight, windowHeight],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        // Вгору аркуш майже не рухається («гумовий» опір), униз іде слідом за пальцем.
        onPanResponderMove: (_event, gesture) => slide.setValue(gesture.dy < 0 ? gesture.dy / 6 : gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          const limit = (live.current.sheetHeight || 360) * 0.3;
          if (gesture.dy > limit || gesture.vy > 0.9) {
            live.current.onClose();
            // Якщо власник не закрив аркуш, повертаємо його на місце.
            setTimeout(() => {
              if (live.current.visible) glide(0);
            }, 80);
          } else {
            glide(0);
          }
        },
        onPanResponderTerminate: () => glide(0),
      }),
    [slide, glide],
  );

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {/* Модальне вікно Android — окремий корінь, тому відступи системних панелей визначаємо всередині нього. */}
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: fade }]}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрити" />
          </Animated.View>
          <Animated.View
            onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
            style={{ transform: [{ translateY: slide }] }}
          >
            <SheetBody title={title} onClose={onClose} dragHandlers={responder.panHandlers}>
              {children}
            </SheetBody>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

interface SheetBodyProps {
  title: string;
  onClose: () => void;
  dragHandlers: GestureResponderHandlers;
  children?: ReactNode;
}

function SheetBody({ title, onClose, dragHandlers, children }: SheetBodyProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: colors.sheet,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: Math.max(insets.bottom, 12) + 12,
      }}
    >
      {/* За цю частину аркуш можна потягнути вниз, щоб закрити; вміст нижче (барабани, кнопки) жест не перехоплює. */}
      <View {...dragHandlers}>
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 2 }}>
          <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: colors.fillStrong }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
          <Text variant="title2" accessibilityRole="header">
            {title}
          </Text>
          <Tap
            onPress={onClose}
            accessibilityLabel="Закрити"
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={16} color={colors.secondaryLabel} strokeWidth={2.4} />
          </Tap>
        </View>
      </View>
      {children}
    </View>
  );
}
