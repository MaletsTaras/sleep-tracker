import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MONTHS_TINY, WEEKDAYS_SHORT, formatDayMedium, formatDuration, plural } from '../../domain/format';
import { HEAT_LABELS, HEAT_LEVELS, cellAt, type HeatCell, type Heatmap } from '../../domain/heatmap';
import type { WeekStart } from '../../domain/types';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamilies } from '../../theme/typography';
import { selectionHaptic } from '../haptics';
import { springs, useReduceMotion } from '../motion';
import { Text } from '../Text';
import { useGrow } from '../useGrow';

/** Ширина колонки з підписами днів тижня. */
const LABEL_W = 26;
/** Висота смуги з назвами місяців над сіткою. */
const MONTH_BAND = 16;
/** Проміжок між крапками. */
const GAP = 1.6;
const MIN_DOT = 2;
/** Підписуємо лише кожен другий рядок (як на GitHub): пн, ср, пт. */
const LABELED_ROWS = [0, 2, 4] as const;

export interface YearHeatmapProps {
  heatmap: Heatmap;
  weekStartsOn: WeekStart;
}

interface DotPaths {
  levels: string[];
  empty: string;
  future: string;
}

function circle(cx: number, cy: number, r: number): string {
  const d = r * 2;
  return `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${d.toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-d).toFixed(2)} 0z`;
}

/** Усі крапки одного кольору зібрано в один контур: сотні елементів малюються як кілька. */
function buildPaths(heatmap: Heatmap, pitch: number, dot: number): DotPaths {
  const levels: string[] = Array.from({ length: HEAT_LEVELS }, () => '');
  let empty = '';
  let future = '';
  if (pitch <= 0) return { levels, empty, future };
  const radius = dot / 2;
  for (const cell of heatmap.cells) {
    const shape = circle((cell.col + 0.5) * pitch, (cell.row + 0.5) * pitch, radius);
    if (cell.future) future += shape;
    else if (cell.level === null) empty += shape;
    else levels[cell.level] += shape;
  }
  return { levels, empty, future };
}

/** Позначка під рядком списку-легенди й біля вибраної ночі. */
function Dot({ color, size = 9 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/**
 * «Рік у крапках»: кожна ніч року — одна крапка. Рядки — дні тижня, стовпці — тижні, колір — тривалість сну.
 * Торкніться крапки (або проведіть пальцем по сітці), щоб побачити дату й тривалість.
 */
export function YearHeatmap({ heatmap, weekStartsOn }: YearHeatmapProps) {
  const { colors } = useTheme();
  const grow = useGrow(80);
  const [gridWidth, setGridWidth] = useState(0);
  const [selected, setSelected] = useState<HeatCell | null>(null);

  const pitch = gridWidth > 0 ? gridWidth / heatmap.weeks : 0;
  const dot = Math.max(MIN_DOT, pitch - GAP);
  const gridHeight = pitch * 7;
  const ringSize = Math.max(10, dot + 5);

  // Нові дані (інший рік чи джерело) — починаємо без вибраної ночі.
  useEffect(() => setSelected(null), [heatmap]);

  const paths = useMemo(() => buildPaths(heatmap, pitch, dot), [heatmap, pitch, dot]);
  const lift = useMemo(() => grow.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }), [grow]);

  // Обробники жесту живуть довго, тож свіжі значення беруть звідси.
  const live = useRef({ heatmap, pitch, selected: null as HeatCell | null });
  live.current.heatmap = heatmap;
  live.current.pitch = pitch;
  live.current.selected = selected;

  const responder = useMemo(() => {
    const pick = (event: GestureResponderEvent) => {
      const { heatmap: current, pitch: step } = live.current;
      if (step <= 0) return;
      const { locationX, locationY } = event.nativeEvent;
      const cell = cellAt(current, Math.floor(locationX / step), Math.floor(locationY / step));
      if (!cell || live.current.selected?.date === cell.date) return;
      live.current.selected = cell;
      selectionHaptic();
      setSelected(cell);
    };
    return PanResponder.create({
      // Сітка забирає жест одразу: проведення пальцем по крапках не гортає сторінку.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => pick(event),
      onPanResponderMove: (event) => pick(event),
    });
  }, []);

  const weekdayLabel = (row: number) => WEEKDAYS_SHORT[(row + (weekStartsOn === 0 ? 6 : 0)) % 7];

  const readout = (() => {
    if (!selected) return 'Торкніться крапки, щоб побачити ніч';
    const value =
      selected.minutes !== null ? formatDuration(selected.minutes) : selected.future ? 'ще не настав' : 'немає запису';
    return `${formatDayMedium(selected.date)} · ${value}`;
  })();
  const readoutColor =
    selected && selected.level !== null ? colors.heat[selected.level] : selected ? colors.fill : 'transparent';

  const nightsWord = plural(heatmap.nights, 'ніч', 'ночі', 'ночей');
  const summary = HEAT_LABELS.map((label, level) => `${label} год — ${heatmap.levelCounts[level]}`).join('; ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Рік у крапках, ${heatmap.year}. Записано ${heatmap.nights} ${nightsWord}. ${summary}.`}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text variant="metricL" tabular>
          {String(heatmap.year)}
        </Text>
        <Text variant="subhead" color="secondaryLabel" style={{ marginBottom: 6 }}>
          {`${heatmap.nights} ${nightsWord}`}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <View style={{ width: LABEL_W, marginTop: MONTH_BAND }} pointerEvents="none">
          {pitch > 0
            ? LABELED_ROWS.map((row) => (
                <Text
                  key={row}
                  variant="caption"
                  color="secondaryLabel"
                  numberOfLines={1}
                  style={{ position: 'absolute', left: 0, top: row * pitch + pitch / 2 - 7, fontSize: 10, lineHeight: 14 }}
                >
                  {weekdayLabel(row)}
                </Text>
              ))
            : null}
        </View>

        <View style={{ flex: 1 }} onLayout={(event: LayoutChangeEvent) => setGridWidth(event.nativeEvent.layout.width)}>
          <View style={{ height: MONTH_BAND }} pointerEvents="none">
            {pitch > 0
              ? heatmap.months.map((item) => (
                  <Text
                    key={item.month}
                    variant="caption"
                    color="secondaryLabel"
                    numberOfLines={1}
                    style={{ position: 'absolute', left: item.col * pitch, top: 0, fontSize: 10, lineHeight: 14 }}
                  >
                    {MONTHS_TINY[item.month - 1]}
                  </Text>
                ))
              : null}
          </View>

          {pitch > 0 ? (
            <>
              <Animated.View pointerEvents="none" style={{ height: gridHeight, opacity: grow, transform: [{ scale: lift }] }}>
                <Svg width={gridWidth} height={gridHeight}>
                  {paths.future ? <Path d={paths.future} fill={colors.fill} opacity={0.45} /> : null}
                  {paths.empty ? <Path d={paths.empty} fill={colors.fill} /> : null}
                  {paths.levels.map((d, level) => (d ? <Path key={level} d={d} fill={colors.heat[level]} /> : null))}
                </Svg>
              </Animated.View>
              <SelectionRing cell={selected} pitch={pitch} size={ringSize} top={MONTH_BAND} color={colors.label} />
              {/* Прозорий шар зверху ловить дотики й проведення пальцем; крапки під ним не інтерактивні. */}
              <View
                {...responder.panHandlers}
                style={{ position: 'absolute', left: 0, top: MONTH_BAND, width: gridWidth, height: gridHeight }}
              />
            </>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, minHeight: 20 }}>
        <View style={{ marginRight: 8, opacity: selected ? 1 : 0 }}>
          <Dot color={readoutColor} size={10} />
        </View>
        <Text variant="subhead" color={selected ? 'label' : 'secondaryLabel'} numberOfLines={1} style={{ flex: 1, fontFamily: selected ? fontFamilies.semibold : fontFamilies.regular }}>
          {readout}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        {HEAT_LABELS.map((label, level) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
            <Dot color={colors.heat[level]} />
            <Text variant="caption" color="secondaryLabel" tabular style={{ marginLeft: 5, fontSize: 11 }}>
              {label}
            </Text>
          </View>
        ))}
        <Text variant="caption" color="secondaryLabel" style={{ fontSize: 11 }}>
          год
        </Text>
      </View>
    </View>
  );
}

interface SelectionRingProps {
  cell: HeatCell | null;
  pitch: number;
  size: number;
  /** Відступ сітки від верху контейнера. */
  top: number;
  color: string;
}

/** Кільце навколо вибраної крапки: пружно перелітає від одної до іншої, а не стрибає. */
function SelectionRing({ cell, pitch, size, top, color }: SelectionRingProps) {
  const reduceMotion = useReduceMotion();
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const show = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (!cell) {
      Animated.timing(show, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
        placed.current = false;
      });
      return;
    }
    const tx = (cell.col + 0.5) * pitch - size / 2;
    const ty = top + (cell.row + 0.5) * pitch - size / 2;
    if (!placed.current || reduceMotion) {
      x.setValue(tx);
      y.setValue(ty);
      placed.current = true;
    } else {
      Animated.parallel([
        Animated.spring(x, { toValue: tx, ...springs.press, useNativeDriver: true }),
        Animated.spring(y, { toValue: ty, ...springs.press, useNativeDriver: true }),
      ]).start();
    }
    Animated.spring(show, { toValue: 1, ...springs.press, useNativeDriver: true }).start();
  }, [cell, pitch, size, top, reduceMotion, x, y, show]);

  const scale = useMemo(() => show.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), [show]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity: show,
        transform: [{ translateX: x }, { translateY: y }, { scale }],
      }}
    />
  );
}
