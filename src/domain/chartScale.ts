/**
 * Геометрія графіків без прив'язки до екрана: шкала осі Y і форма освітленої частини місяця.
 */

export interface YScale {
  /** Верх осі, хвилини. */
  top: number;
  /** Мітки осі, хвилини, від 0 до `top`. */
  ticks: number[];
}

/**
 * Підбирає «круглу» шкалу в годинах: мінімум 8 год, верх кратний 2 год (до 10 год) або 4 год (вище).
 * Мітки йдуть з кроком 2 год або 4 год, щоб сітка лишалась рідкою.
 */
export function niceScale(maxMinutes: number, minTopHours = 8): YScale {
  const safeMax = Number.isFinite(maxMinutes) && maxMinutes > 0 ? maxMinutes : 0;
  let hours = Math.max(minTopHours, Math.ceil(safeMax / 120) * 2);
  if (hours > 10) hours = Math.ceil(hours / 4) * 4;
  const stepHours = hours <= 10 ? 2 : 4;
  const ticks: number[] = [];
  for (let h = 0; h <= hours; h += stepHours) ticks.push(h * 60);
  return { top: hours * 60, ticks };
}

/**
 * Контур освітленої частини місяця (SVG path) для частки `fraction` від 0 до 1.
 * 0 — нічого не видно (null), 0.5 — половина диска, 1 — повний диск.
 * Світло — з правого боку: спершу правий півколо, далі «термінатор» — еліптична дуга.
 */
export function moonLitPath(cx: number, cy: number, radius: number, fraction: number): string | null {
  if (!Number.isFinite(fraction) || fraction <= 0.004) return null;
  const R = radius;
  if (fraction >= 0.996) {
    return `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} Z`;
  }
  const rx = R * Math.abs(1 - 2 * fraction);
  const sweep = fraction < 0.5 ? 0 : 1;
  const top = cy - R;
  const bottom = cy + R;
  return `M ${cx} ${top} A ${R} ${R} 0 0 1 ${cx} ${bottom} A ${rx.toFixed(3)} ${R} 0 0 ${sweep} ${cx} ${top} Z`;
}

/** Прямокутник стовпчика із заокругленою верхівкою й прямим низом (радіус обмежується розмірами). */
export function roundedTopBarPath(x: number, baseline: number, width: number, height: number, radius = 4): string {
  const h = Math.max(0, height);
  const r = Math.max(0, Math.min(radius, width / 2, h));
  const top = baseline - h;
  if (r === 0) return `M ${x} ${baseline} V ${top} H ${x + width} V ${baseline} Z`;
  return (
    `M ${x} ${baseline} V ${top + r} A ${r} ${r} 0 0 1 ${x + r} ${top} H ${x + width - r} ` +
    `A ${r} ${r} 0 0 1 ${x + width} ${top + r} V ${baseline} Z`
  );
}
