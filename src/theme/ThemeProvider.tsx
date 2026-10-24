import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemePreference } from '../domain/types';
import { darkColors, lightColors, type Palette } from './colors';

export interface Theme {
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: Palette;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ preference, children }: { preference: ThemePreference; children: ReactNode }) {
  const system = useColorScheme();
  const scheme: 'light' | 'dark' = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const theme = useMemo<Theme>(
    () => ({ scheme, isDark: scheme === 'dark', colors: scheme === 'dark' ? darkColors : lightColors }),
    [scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme потрібно викликати всередині ThemeProvider');
  return theme;
}
