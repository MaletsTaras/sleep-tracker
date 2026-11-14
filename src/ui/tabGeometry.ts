/**
 * Геометрія нижньої панелі: де стоїть кожна вкладка й як перетворити положення пальця на «номер сторінки».
 * Чисті функції без UI, щоб рух лінзи можна було перевірити тестами.
 */

export interface TabLayoutOptions {
  /** Повна ширина панелі, dp. */
  barWidth: number;
  /** Товщина рамки панелі. */
  border: number;
  /** Внутрішній відступ панелі зліва й справа. */
  pad: number;
  /** Скільки місця займає центральна кнопка «+» разом із полями. */
  plusSlot: number;
  /** Кількість вкладок. */
  count: number;
  /** Після якої за порядком вкладки стоїть кнопка «+» (для 4 вкладок — після другої). */
  plusAfter: number;
}

export interface TabLayout {
  /** Ширина слота однієї вкладки. */
  slot: number;
  /** Лівий край слота кожної вкладки (від внутрішнього краю рамки). */
  lefts: number[];
  /** Центри слотів. */
  centers: number[];
}

export function tabLayout({ barWidth, border, pad, plusSlot, count, plusAfter }: TabLayoutOptions): TabLayout {
  const slot = Math.max(0, (barWidth - border * 2 - pad * 2 - plusSlot) / count);
  const lefts: number[] = [];
  for (let i = 0; i < count; i += 1) lefts.push(pad + i * slot + (i >= plusAfter ? plusSlot : 0));
  return { slot, lefts, centers: lefts.map((left) => left + slot / 2) };
}

/** Горизонтальна координата центра лінзи для дробового положення (1.5 — посередині між другою й третьою вкладками). */
export function positionToX(position: number, centers: readonly number[]): number {
  const last = centers.length - 1;
  if (last < 0) return 0;
  const p = Math.min(last, Math.max(0, position));
  const i = Math.min(last - 1, Math.floor(p));
  if (last === 0) return centers[0];
  return centers[i] + (centers[i + 1] - centers[i]) * (p - i);
}

/** Обернена до `positionToX`: за координатою пальця повертає дробове положення, обмежене першою й останньою вкладкою. */
export function xToPosition(x: number, centers: readonly number[]): number {
  const last = centers.length - 1;
  if (last <= 0) return 0;
  if (x <= centers[0]) return 0;
  if (x >= centers[last]) return last;
  for (let i = 0; i < last; i += 1) {
    if (x <= centers[i + 1]) return i + (x - centers[i]) / (centers[i + 1] - centers[i]);
  }
  return last;
}

/**
 * Куди «доїде» лінза після відпускання пальця: враховуємо швидкість (вкладок за мілісекунду),
 * але один змах гортає не більш ніж на одну вкладку від положення, у якому палець відпустили.
 */
export function settleTarget(position: number, velocity: number, last: number, lookaheadMs = 160): number {
  const reach = Math.min(1, Math.max(-1, velocity * lookaheadMs));
  return Math.min(last, Math.max(0, Math.round(position + reach)));
}
