/**
 * Кольори у стилі системних кольорів iOS (світла й темна теми).
 *
 * Правила, які тут дотримано:
 *  - увесь текст має контраст щонайменше 4.5:1 до свого фону (перевірено розрахунком);
 *  - колір стовпчиків графіків пройшов перевірку палітри (світла: L 0.43–0.77, темна: L 0.48–0.67);
 *  - колір ніколи не несе сенс сам по собі: поряд завжди є знак «+/−», стрілка або підпис.
 */

export interface Palette {
  isDark: boolean;

  // поверхні
  background: string; // фон екрана
  card: string; // картки
  inset: string; // поля й чіпи всередині карток
  sheet: string; // нижній аркуш

  // текст
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string; // лише для неактивного й декоративного

  separator: string;
  /** Заливка доріжки сегментованого перемикача й схожих елементів. */
  fill: string;
  fillStrong: string;
  /** Рухомий «бігунок» сегментованого перемикача. */
  thumb: string;

  // акцент застосунку — індиго
  accent: string; // заливки кнопок
  tint: string; // текст і іконки акцентного кольору
  accentSoft: string; // напівпрозора заливка під акцентом
  onAccent: string;

  // графіки
  chartBar: string;
  chartBarDim: string;
  chartGrid: string;
  chartGoal: string;

  // стани (завжди разом зі знаком чи підписом)
  positive: string;
  positiveSoft: string;
  caution: string;
  cautionSoft: string;
  danger: string;

  // головна картка («нічне небо»)
  heroFrom: string;
  heroTo: string;
  heroText: string;
  heroTextSecondary: string;
  heroChip: string; // напівпрозора заливка кнопок на герої
  moonLit: string;
  moonShade: string;
  moonRim: string;

  // нижня панель вкладок, затемнення, тіні
  tabBar: string;
  tabBarBorder: string;
  shadow: string;
  overlay: string;
  toast: string;
  onToast: string;
}

export const lightColors: Palette = {
  isDark: false,

  background: '#F2F2F7',
  card: '#FFFFFF',
  inset: '#F2F2F7',
  sheet: '#FFFFFF',

  label: '#000000',
  secondaryLabel: '#6C6C70',
  tertiaryLabel: '#8E8E93',

  separator: '#E5E5EA',
  fill: '#7676801F',
  fillStrong: '#76768033',
  thumb: '#FFFFFF',

  accent: '#5856D6',
  tint: '#5856D6',
  accentSoft: '#5856D61A',
  onAccent: '#FFFFFF',

  chartBar: '#5856D6',
  chartBarDim: '#5856D62E',
  chartGrid: '#ECECF0',
  chartGoal: '#0000008C',

  positive: '#1F7A3A',
  positiveSoft: '#1F7A3A1A',
  caution: '#A84A00',
  cautionSoft: '#A84A001A',
  danger: '#D70015',

  heroFrom: '#534FDB',
  heroTo: '#7442D0',
  heroText: '#FFFFFF',
  heroTextSecondary: '#FFFFFFE6',
  heroChip: '#FFFFFF2E',
  moonLit: '#FFF1C9',
  moonShade: '#14104A59',
  moonRim: '#FFFFFF47',

  tabBar: '#FFFFFF',
  tabBarBorder: '#0000001A',
  shadow: '#1C1B4B',
  overlay: '#00000059',
  toast: '#1C1C1E',
  onToast: '#FFFFFF',
};

export const darkColors: Palette = {
  isDark: true,

  background: '#000000',
  card: '#1C1C1E',
  inset: '#2C2C2E',
  sheet: '#1C1C1E',

  label: '#FFFFFF',
  secondaryLabel: '#A1A1A6',
  tertiaryLabel: '#8E8E93',

  separator: '#38383A',
  fill: '#7676803D',
  fillStrong: '#76768059',
  thumb: '#636366',

  accent: '#5E5CE6',
  tint: '#8F8DFF',
  accentSoft: '#8F8DFF29',
  onAccent: '#FFFFFF',

  chartBar: '#7E7CF6',
  chartBarDim: '#7E7CF640',
  chartGrid: '#2C2C2E',
  chartGoal: '#FFFFFF99',

  positive: '#30D158',
  positiveSoft: '#30D15829',
  caution: '#FF9F0A',
  cautionSoft: '#FF9F0A29',
  danger: '#FF6961',

  heroFrom: '#34309E',
  heroTo: '#5B35AE',
  heroText: '#FFFFFF',
  heroTextSecondary: '#FFFFFFE6',
  heroChip: '#FFFFFF29',
  moonLit: '#FFF1C9',
  moonShade: '#0A082E73',
  moonRim: '#FFFFFF38',

  tabBar: '#1C1C1E',
  tabBarBorder: '#FFFFFF1F',
  shadow: '#000000',
  overlay: '#000000A6',
  toast: '#F2F2F7',
  onToast: '#000000',
};

/** Додає прозорість до кольору виду #RRGGBB (alpha 0..1). */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').slice(0, 6);
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `#${clean}${a}`;
}
