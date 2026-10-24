import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { niceScale, roundedTopBarPath } from '../../domain/chartScale';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamilies } from '../../theme/typography';
import { Text } from '../Text';

export interface BarDatum {
  key: string;
  /** Підпис під стовпчиком; порожній рядок — без підпису. */
  label: string;
  /** Хвилини сну або null, якщо запису немає. */
  value: number | null;
  /** Дата ще не настала: ні стовпчика, ні позначки пропуску. */
  future?: boolean;
  /** Текст для зчитувача екрана: «сб, 3 жовт.: 9 год». */
  a11y: string;
}

export interface BarChartProps {
  data: readonly BarDatum[];
  /** Ціль сну в хвилинах: малюється пунктирною лінією. */
  goal?: number | null;
  plotHeight?: number;
  selectedIndex?: number | null;
  onSelect?: (index: number | null) => void;
  showYAxis?: boolean;
  minTopHours?: number;
}

const TOP_PAD = 8;
const LABEL_BAND = 26;
const AXIS_W = 46;
const MAX_BAR = 22;
const BAR_RADIUS = 4;

/**
 * Стовпчиковий графік тривалості сну.
 * Тонкі стовпчики одного кольору, рідка суцільна сітка, пунктирна лінія цілі; дотик вибирає стовпчик,
 * решта тьмяніє. Значення читається у написі над графіком, а також у зчитувачі екрана.
 */
export function BarChart({
  data,
  goal = null,
  plotHeight = 156,
  selectedIndex = null,
  onSelect,
  showYAxis = true,
  minTopHours = 8,
}: BarChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const axisWidth = showYAxis ? AXIS_W : 0;
  const plotWidth = Math.max(0, width - axisWidth);
  const count = data.length;
  const slot = count > 0 ? plotWidth / count : 0;
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot * 0.64, slot - 2));
  const totalHeight = TOP_PAD + plotHeight + LABEL_BAND;

  let maxValue = goal ?? 0;
  for (const d of data) if (d.value !== null && d.value > maxValue) maxValue = d.value;
  const scale = niceScale(maxValue, minTopHours);

  const yOf = (minutes: number) => TOP_PAD + plotHeight * (1 - Math.min(minutes, scale.top) / scale.top);
  const baseline = yOf(0);
  const hasSelection = selectedIndex !== null;

  return (
    <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={{ height: totalHeight }}>
      {width > 0 ? (
        <>
          <Svg width={width} height={totalHeight} style={{ position: 'absolute', left: 0, top: 0 }}>
            {scale.ticks.map((tick) => (
              <Line
                key={tick}
                x1={0}
                x2={plotWidth}
                y1={yOf(tick)}
                y2={yOf(tick)}
                stroke={colors.chartGrid}
                strokeWidth={1}
              />
            ))}

            {data.map((d, i) => {
              if (d.future) return null;
              const cx = slot * (i + 0.5);
              if (d.value === null) {
                return <Circle key={d.key} cx={cx} cy={baseline - 3} r={1.6} fill={colors.tertiaryLabel} />;
              }
              const height = Math.max(2, baseline - yOf(d.value));
              const dim = hasSelection && selectedIndex !== i;
              return (
                <Path
                  key={d.key}
                  d={roundedTopBarPath(cx - barWidth / 2, baseline, barWidth, height, BAR_RADIUS)}
                  fill={dim ? colors.chartBarDim : colors.chartBar}
                />
              );
            })}

            {goal !== null && goal > 0 ? (
              <Line
                x1={0}
                x2={plotWidth}
                y1={yOf(goal)}
                y2={yOf(goal)}
                stroke={colors.chartGoal}
                strokeWidth={1.5}
                strokeDasharray="5,4"
              />
            ) : null}
          </Svg>

          {showYAxis
            ? scale.ticks.map((tick, i) => (
                <Text
                  key={tick}
                  variant="caption"
                  color="secondaryLabel"
                  tabular
                  numberOfLines={1}
                  style={{ position: 'absolute', left: plotWidth + 8, top: yOf(tick) - 8, fontSize: 11, lineHeight: 16 }}
                >
                  {i === scale.ticks.length - 1 ? `${tick / 60} год` : String(tick / 60)}
                </Text>
              ))
            : null}

          {data.map((d, i) => {
            if (!d.label) return null;
            const labelWidth = Math.max(18, d.label.length * 8 + 6);
            const left = Math.min(Math.max(slot * (i + 0.5) - labelWidth / 2, 0), Math.max(0, plotWidth - labelWidth));
            const selected = selectedIndex === i;
            return (
              <Text
                key={`l${d.key}`}
                variant="caption"
                color={selected ? 'label' : 'secondaryLabel'}
                align="center"
                numberOfLines={1}
                importantForAccessibility="no"
                style={{
                  position: 'absolute',
                  left,
                  width: labelWidth,
                  top: TOP_PAD + plotHeight + 7,
                  fontSize: 11,
                  lineHeight: 15,
                  fontFamily: selected ? fontFamilies.semibold : fontFamilies.medium,
                }}
              >
                {d.label}
              </Text>
            );
          })}

          {onSelect ? (
            <View style={{ position: 'absolute', left: 0, top: 0, width: plotWidth, height: totalHeight, flexDirection: 'row' }}>
              {data.map((d, i) => (
                <Pressable
                  key={`h${d.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={d.a11y}
                  accessibilityState={{ selected: selectedIndex === i }}
                  disabled={d.future}
                  onPress={() => onSelect(selectedIndex === i ? null : i)}
                  style={{ width: slot, height: totalHeight }}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
