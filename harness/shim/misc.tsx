import * as React from 'react';

declare const window: any;

/* react-native-safe-area-context */
export const SafeAreaProvider = ({ children }: any) => <>{children}</>;
export const useSafeAreaInsets = () => ({ top: 28, bottom: 16, left: 0, right: 0 });

/* expo-linear-gradient */
export function LinearGradient({ colors, start, end, locations, style, children }: any) {
  const s = start ?? { x: 0.5, y: 0 };
  const e = end ?? { x: 0.5, y: 1 };
  const angle = (Math.atan2(e.x - s.x, -(e.y - s.y)) * 180) / Math.PI;
  const stops = colors.map((c: string, i: number) => `${c}${locations ? ` ${locations[i] * 100}%` : ''}`).join(', ');
  const css = require('./rn').toCss(style);
  return <div style={{ position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: 0, ...css, background: `linear-gradient(${angle}deg, ${stops})` }}>{children}</div>;
}

/* expo-font, splash, status bar, system ui, haptics, constants, clipboard */
export const useFonts = () => [true, null];
export const preventAutoHideAsync = async () => undefined;
export const hideAsync = async () => undefined;
export const StatusBar = () => null;
export const setBackgroundColorAsync = async () => undefined;
export const impactAsync = async () => undefined;
export const selectionAsync = async () => undefined;
export const notificationAsync = async () => undefined;
export const ImpactFeedbackStyle = { Light: 'light' };
export const NotificationFeedbackType = { Success: 'success', Warning: 'warning' };
let clip = '';
export const setStringAsync = async (v: string) => { clip = v; };
export const getStringAsync = async () => clip;
export default { expoConfig: { version: '1.0.0' }, nativeApplicationVersion: '1.0.0' };
