import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';

export type ToastTone = 'success' | 'info';

interface ToastApi {
  show(message: string, tone?: ToastTone): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 2400;

/** Короткі сповіщення згори екрана («Збережено»). Зникають самі. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone });
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setToast(null);
        });
      }, VISIBLE_MS);
    },
    [opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 10, alignItems: 'center', opacity }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.toast,
              borderRadius: 22,
              paddingVertical: 11,
              paddingHorizontal: 16,
              maxWidth: '100%',
              shadowColor: '#000000',
              shadowOpacity: 0.22,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <Icon name={toast.tone === 'success' ? 'check' : 'info'} size={18} color={colors.onToast} strokeWidth={2.4} />
            <Text variant="subhead" color="onToast" numberOfLines={2} style={{ marginLeft: 8, flexShrink: 1 }}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast потрібно викликати всередині ToastProvider');
  return api;
}
