import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
}

/**
 * Нижній аркуш: затемнення з'являється, а сам аркуш виїжджає знизу.
 * Вміст монтується щоразу заново при відкритті, тож початкові значення форми завжди свіжі.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(windowHeight)).current;

  useEffect(() => {
    if (visible) {
      if (!mounted) {
        slide.setValue(windowHeight);
        fade.setValue(0);
        setMounted(true);
        return;
      }
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      Animated.timing(slide, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.timing(slide, { toValue: windowHeight, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        },
      );
    }
  }, [visible, mounted, fade, slide, windowHeight]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {/* Модальне вікно Android — окремий корінь, тому відступи системних панелей визначаємо всередині нього. */}
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: fade }]}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрити" />
          </Animated.View>
          <Animated.View style={{ transform: [{ translateY: slide }] }}>
            <SheetBody title={title} onClose={onClose}>
              {children}
            </SheetBody>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetBody({ title, onClose, children }: { title: string; onClose: () => void; children?: ReactNode }) {
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
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: colors.fillStrong }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
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
      {children}
    </View>
  );
}
