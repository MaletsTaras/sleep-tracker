/**
 * Типографіка за мотивами iOS (Large Title, Headline, Body…).
 * Шрифт — Inter (SF Pro недоступний на Android), чотири накреслення. Файли лежать в assets/fonts
 * і завантажуються в App.tsx. Власну вагу (fontWeight) не вказуємо: кожне накреслення — окремий файл.
 *
 * Великі числа — звичайні (пропорційні) цифри; табличні цифри лише там, де числа стоять стовпчиком.
 */

export const fontFamilies = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export type TextVariant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'metricXL'
  | 'metricL'
  | 'metricM'
  | 'metricS';

export interface TextSpec {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export const textVariants: Record<TextVariant, TextSpec> = {
  largeTitle: { fontFamily: fontFamilies.bold, fontSize: 34, lineHeight: 41, letterSpacing: -0.9 },
  title1: { fontFamily: fontFamilies.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.7 },
  title2: { fontFamily: fontFamilies.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.45 },
  title3: { fontFamily: fontFamilies.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.4 },
  headline: { fontFamily: fontFamilies.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.35 },
  body: { fontFamily: fontFamilies.regular, fontSize: 17, lineHeight: 23, letterSpacing: -0.3 },
  callout: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 22, letterSpacing: -0.25 },
  subhead: { fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.2 },
  footnote: { fontFamily: fontFamilies.regular, fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  caption: { fontFamily: fontFamilies.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  metricXL: { fontFamily: fontFamilies.bold, fontSize: 56, lineHeight: 60, letterSpacing: -2.2 },
  metricL: { fontFamily: fontFamilies.bold, fontSize: 40, lineHeight: 46, letterSpacing: -1.5 },
  metricM: { fontFamily: fontFamilies.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.9 },
  metricS: { fontFamily: fontFamilies.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5 },
};

/** Файли шрифтів для expo-font. Ключі збігаються з fontFamilies. */
export const fontAssets = {
  [fontFamilies.regular]: require('../../assets/fonts/Inter-Regular.otf'),
  [fontFamilies.medium]: require('../../assets/fonts/Inter-Medium.otf'),
  [fontFamilies.semibold]: require('../../assets/fonts/Inter-SemiBold.otf'),
  [fontFamilies.bold]: require('../../assets/fonts/Inter-Bold.otf'),
} as const;
