import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Власний набір іконок: тонкі контурні, 24×24, закруглені кінці — у дусі SF Symbols.
 * Малюються векторно, тому однаково чіткі на будь-якому екрані й не потребують окремого шрифту.
 */

type Part =
  | { t: 'path'; d: string; fill?: boolean }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: boolean }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx: number };

const p = (d: string, fill = false): Part => ({ t: 'path', d, fill });
const c = (cx: number, cy: number, r: number, fill = false): Part => ({ t: 'circle', cx, cy, r, fill });
const r = (x: number, y: number, w: number, h: number, rx: number): Part => ({ t: 'rect', x, y, w, h, rx });

const ICONS = {
  moon: [p('M20.4 14.3A8.6 8.6 0 1 1 9.7 3.6 6.7 6.7 0 0 0 20.4 14.3z')],
  chart: [p('M6 19v-5.5 M12 19V6 M18 19v-9')],
  calendar: [r(3.5, 5, 17, 15.5, 3.8), p('M3.5 10h17 M8 3.2v3.6 M16 3.2v3.6')],
  sliders: [p('M4 7h8.5 M17.5 7H20 M4 17h2.5 M11.5 17H20'), c(15, 7, 2.5), c(9, 17, 2.5)],
  plus: [p('M12 5v14 M5 12h14')],
  chevronLeft: [p('M14.5 5.5L8 12l6.5 6.5')],
  chevronRight: [p('M9.5 5.5L16 12l-6.5 6.5')],
  chevronDown: [p('M5.5 9.5L12 16l6.5-6.5')],
  check: [p('M5 12.5l4.5 4.5L19 7')],
  close: [p('M6.5 6.5l11 11 M17.5 6.5l-11 11')],
  minus: [p('M5 12h14')],
  trash: [
    p('M4.5 7h15 M9.5 7V4.5h5V7 M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7 M10 11v5.5 M14 11v5.5'),
  ],
  bulb: [
    p('M9.2 17.5h5.6 M10 20.5h4 M12 3.5a5.7 5.7 0 0 0-3.4 10.3c.7.6 1 1.3 1 2.2h4.8c0-.9.3-1.6 1-2.2A5.7 5.7 0 0 0 12 3.5z'),
  ],
  sparkles: [
    p('M10.5 5l1.9 5.1L17.5 12l-5.1 1.9L10.5 19l-1.9-5.1L3.5 12l5.1-1.9z'),
    p('M18.5 3.5v4 M16.5 5.5h4'),
    p('M19 16.5v3 M17.5 18h3'),
  ],
  clock: [c(12, 12, 8.6), p('M12 7.5V12l3 2')],
  watch: [r(7, 6.5, 10, 11, 3.2), p('M9.2 6.5l.6-3h4.4l.6 3 M9.2 17.5l.6 3h4.4l.6-3')],
  flame: [
    p('M12 3.2c.9 3.2 5.2 5 5.2 10.1a5.2 5.2 0 0 1-10.4 0c0-2.1 1-3.4 2.1-4.5.2 1.4.8 2.2 1.7 2.4C10.2 8.6 10.8 5.8 12 3.2z'),
  ],
  target: [c(12, 12, 8.6), c(12, 12, 4.8), c(12, 12, 1.1, true)],
  copy: [r(8.5, 8.5, 11, 11, 2.6), p('M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2')],
  download: [p('M12 4v11 M7.5 10.5L12 15l4.5-4.5 M5 19.5h14')],
  upload: [p('M12 15V4 M7.5 8.5L12 4l4.5 4.5 M5 19.5h14')],
  info: [c(12, 12, 8.6), p('M12 11v5.2'), c(12, 7.9, 0.7, true)],
  trendUp: [p('M4 16.5l5.2-5.2 3.6 3.6L19.5 8 M14.5 8h5v5')],
  trendDown: [p('M4 7.5l5.2 5.2 3.6-3.6L19.5 16 M14.5 16h5v-5')],
  sun: [
    c(12, 12, 3.8),
    p('M12 2.8v2.4 M12 18.8v2.4 M2.8 12h2.4 M18.8 12h2.4 M5.5 5.5l1.7 1.7 M16.8 16.8l1.7 1.7 M18.5 5.5l-1.7 1.7 M7.2 16.8l-1.7 1.7'),
  ],
  bed: [p('M3.5 19V6 M3.5 15h17v4 M20.5 15v-2.5a3 3 0 0 0-3-3H11V15'), c(7.2, 11.2, 1.9)],
  edit: [p('M5 19l.9-3.9L16.3 4.7a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.9 18.1 5 19z')],
  shield: [p('M12 3.5l7 2.6v5.2c0 4.3-2.9 7.7-7 9.2-4.1-1.5-7-4.9-7-9.2V6.1z'), p('M9 12l2.3 2.3L15.2 10')],
  list: [p('M9 7h11 M9 12h11 M9 17h11'), c(4.8, 7, 1, true), c(4.8, 12, 1, true), c(4.8, 17, 1, true)],
} as const satisfies Record<string, readonly Part[]>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color, strokeWidth = 1.9 }: IconProps) {
  const parts: readonly Part[] = ICONS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {parts.map((part, index) => {
        const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
        switch (part.t) {
          case 'path':
            return <Path key={index} d={part.d} {...common} fill={part.fill ? color : 'none'} />;
          case 'circle':
            return (
              <Circle key={index} cx={part.cx} cy={part.cy} r={part.r} {...common} fill={part.fill ? color : 'none'} />
            );
          case 'rect':
            return <Rect key={index} x={part.x} y={part.y} width={part.w} height={part.h} rx={part.rx} {...common} fill="none" />;
        }
      })}
    </Svg>
  );
}
