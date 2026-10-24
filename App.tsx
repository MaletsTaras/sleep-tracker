import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Pressable, Text as NativeText, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createSqliteRepository } from './src/data/openDatabase';
import { Root } from './src/screens/Root';
import { AppProvider, useApp } from './src/state/AppContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { fontAssets } from './src/theme/typography';
import { ErrorBoundary } from './src/ui/ErrorBoundary';
import { ToastProvider } from './src/ui/Toast';

// Заставка лишається на екрані, доки не готові шрифти й база даних.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

const createRepository = () => createSqliteRepository();

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider createRepository={createRepository}>
          <Shell />
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

/** Тема залежить від збережених налаштувань, тому підключається всередині AppProvider. */
function Shell() {
  const { settings } = useApp();
  return (
    <ThemeProvider preference={settings.theme}>
      <Gate />
    </ThemeProvider>
  );
}

function Gate() {
  const { colors, isDark } = useTheme();
  const { status, error, retry } = useApp();
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // Якщо шрифти раптом не завантажились, працюємо із системним шрифтом, а не зависаємо на заставці.
  const ready = (fontsLoaded || fontError !== null) && status !== 'loading';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  if (status === 'error') return <StartupError message={error} onRetry={retry} />;

  return (
    <ToastProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Root />
    </ToastProvider>
  );
}

function StartupError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#1C1B4B', justifyContent: 'center', padding: 24 }}>
      <StatusBar style="light" />
      <NativeText style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Не вдалося відкрити дані</NativeText>
      <NativeText style={{ color: '#FFFFFFCC', fontSize: 15, lineHeight: 22, marginBottom: 12 }}>
        Спробуйте ще раз. Якщо помилка повторюється, перезапустіть застосунок або телефон.
      </NativeText>
      {message ? (
        <NativeText selectable style={{ color: '#FFFFFF99', fontSize: 12, lineHeight: 17, marginBottom: 20 }}>
          {message}
        </NativeText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={{ backgroundColor: '#FFFFFF', borderRadius: 27, height: 54, alignItems: 'center', justifyContent: 'center' }}
      >
        <NativeText style={{ color: '#3A35C4', fontSize: 17, fontWeight: '600' }}>Спробувати знову</NativeText>
      </Pressable>
    </View>
  );
}
