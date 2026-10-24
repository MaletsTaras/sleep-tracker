import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { formatDayMedium, formatDays, formatDuration, formatPercent, plural } from '../domain/format';
import {
  canGoNext,
  computeStats,
  getPeriod,
  isCurrentPeriod,
  periodLabel,
  shiftAnchor,
  type PeriodKind,
} from '../domain/stats';
import { SOURCE_LABELS, type DateISO, type SourceId } from '../domain/types';
import { useApp } from '../state/AppContext';
import { readoutFor, seriesToBars, weekdayBars } from '../state/chartData';
import { buildInsights, dayValuesFor, hasSource } from '../state/selectors';
import { layout } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { BarChart } from '../ui/charts/BarChart';
import { HBars, type HBarRow } from '../ui/charts/HBars';
import { DeltaBadge } from '../ui/DeltaBadge';
import { Duration } from '../ui/Duration';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { Metric } from '../ui/Metric';
import { Screen, SectionTitle } from '../ui/Screen';
import { SegmentedControl, type SegmentOption } from '../ui/SegmentedControl';
import { Tap } from '../ui/Tap';
import { Text } from '../ui/Text';
import { Tile } from '../ui/Tile';
import { useToast } from '../ui/Toast';

const KIND_OPTIONS: readonly SegmentOption<PeriodKind>[] = [
  { value: 'week', label: 'Тиждень' },
  { value: 'month', label: 'Місяць' },
  { value: 'year', label: 'Рік' },
];

const SOURCE_OPTIONS: readonly SegmentOption<SourceId>[] = [
  { value: 'manual', label: SOURCE_LABELS.manual },
  { value: 'watch', label: SOURCE_LABELS.watch },
];

const VERSUS: Record<PeriodKind, string> = {
  week: 'проти минулого тижня',
  month: 'проти минулого місяця',
  year: 'проти минулого року',
};

const CURRENT: Record<PeriodKind, string> = {
  week: 'Поточний тиждень',
  month: 'Поточний місяць',
  year: 'Поточний рік',
};

export interface StatsScreenProps {
  onAdd: (date?: DateISO) => void;
}

export function StatsScreen({ onAdd }: StatsScreenProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const { records, settings, today, loadDemoData } = useApp();

  const [kind, setKind] = useState<PeriodKind>('week');
  const [anchor, setAnchor] = useState<DateISO>(today);
  const [source, setSource] = useState<SourceId>('manual');
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => setSelected(null), [kind, anchor, source]);

  const showSourceSwitch = hasSource(records, 'watch');
  const activeSource: SourceId = showSourceSwitch ? source : 'manual';
  const days = useMemo(() => dayValuesFor(records, activeSource), [records, activeSource]);

  const period = useMemo(() => getPeriod(kind, anchor, settings.weekStartsOn), [kind, anchor, settings.weekStartsOn]);
  const stats = useMemo(
    () => computeStats(days, period, { today, goalMinutes: settings.goalMinutes }),
    [days, period, today, settings.goalMinutes],
  );

  const current = isCurrentPeriod(period, today);
  const bars = useMemo(() => seriesToBars(stats.series, kind), [stats.series, kind]);
  const weekdays = useMemo(() => weekdayBars(stats.weekdayAverages, settings.weekStartsOn), [stats.weekdayAverages, settings.weekStartsOn]);
  const insights = useMemo(() => buildInsights(stats), [stats]);
  const readout = selected !== null ? readoutFor(stats.series[selected], kind) : null;

  const maxBucket = Math.max(0, ...stats.buckets.map((bucket) => bucket.count));
  const bucketRows: HBarRow[] = stats.buckets.map((bucket) => ({
    key: bucket.key,
    label: `${bucket.label} год`,
    count: bucket.count,
    valueText: bucket.count > 0 ? formatDays(bucket.count) : '—',
    strong: bucket.count > 0 && bucket.count === maxBucket,
    a11y: `${bucket.label} годин сну: ${formatDays(bucket.count)}`,
  }));

  const changeKind = (next: PeriodKind) => {
    setKind(next);
    setAnchor(today);
  };

  const runDemo = async () => {
    try {
      toast.show(`Додано ${await loadDemoData()} демонстраційних записів`);
    } catch (failure) {
      toast.show(failure instanceof Error ? failure.message : 'Не вдалося додати демо-дані', 'info');
    }
  };

  const hasAnyRecords = days.length > 0;
  const std = stats.stdDevMinutes;

  return (
    <Screen title="Статистика">
      <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={changeKind} />
      {showSourceSwitch ? <SegmentedControl style={{ marginTop: 10 }} options={SOURCE_OPTIONS} value={source} onChange={setSource} /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 14 }}>
        <Tap
          onPress={() => setAnchor(shiftAnchor(kind, anchor, -1))}
          haptic="selection"
          accessibilityLabel="Попередній період"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevronLeft" size={22} color={colors.tint} strokeWidth={2.2} />
        </Tap>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="headline" accessibilityLiveRegion="polite">
            {periodLabel(period, today)}
          </Text>
          {current ? (
            <Text variant="footnote" color="secondaryLabel">
              {CURRENT[kind]}
            </Text>
          ) : (
            <Tap onPress={() => setAnchor(today)} hitSlop={8} accessibilityLabel="Повернутися до сьогодні">
              <Text variant="footnote" color="tint" style={{ fontFamily: fontFamilies.semibold }}>
                До сьогодні
              </Text>
            </Tap>
          )}
        </View>
        <Tap
          onPress={() => setAnchor(shiftAnchor(kind, anchor, 1))}
          disabled={!canGoNext(period, today)}
          haptic="selection"
          accessibilityLabel="Наступний період"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevronRight" size={22} color={colors.tint} strokeWidth={2.2} />
        </Tap>
      </View>

      {stats.loggedDays === 0 ? (
        hasAnyRecords ? (
          <EmptyState
            icon="calendar"
            title="Немає записів за цей період"
            message="Оберіть інший період або додайте запис за потрібну дату."
          >
            <Button title="Додати запис" icon="plus" onPress={() => onAdd(stats.period.end < today ? stats.period.end : today)} />
          </EmptyState>
        ) : (
          <EmptyState
            icon="chart"
            title="Поки що немає даних"
            message="Додайте перший запис — і тут з’явиться статистика за тиждень, місяць і рік."
          >
            {activeSource === 'manual' ? (
              <>
                <Button title="Додати запис" icon="plus" onPress={() => onAdd(today)} />
                <Button title="Подивитися на прикладі" variant="plain" onPress={runDemo} style={{ marginTop: 6 }} />
              </>
            ) : null}
          </EmptyState>
        )
      ) : (
        <>
          <Card padding={20}>
            <Text variant="subhead" color="secondaryLabel">
              Середня тривалість сну
            </Text>
            <View style={{ marginTop: 6 }}>
              <Duration minutes={stats.averageMinutes ?? 0} variant="metricXL" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
              {stats.deltaMinutes !== null ? (
                <View style={{ marginRight: 10, marginBottom: 4 }}>
                  <DeltaBadge minutes={stats.deltaMinutes} suffix={VERSUS[kind]} />
                </View>
              ) : null}
              <Text variant="footnote" color="secondaryLabel" style={{ marginBottom: 4 }}>
                {`Записано ${stats.loggedDays} з ${stats.elapsedDays} ${plural(stats.elapsedDays, 'дня', 'днів', 'днів')}`}
              </Text>
            </View>
          </Card>

          <Card style={{ marginTop: layout.gap }}>
            <View style={{ marginBottom: 12 }}>
              <Text variant="footnote" color="secondaryLabel">
                {readout ? readout.title : kind === 'year' ? 'Середнє за місяцями' : 'Тривалість сну по днях'}
              </Text>
              <Text variant="title3">
                {readout ? readout.value : stats.averageMinutes !== null ? `У середньому ${formatDuration(stats.averageMinutes)}` : '—'}
              </Text>
            </View>
            <BarChart data={bars} goal={settings.goalMinutes} selectedIndex={selected} onSelect={setSelected} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Svg width={22} height={4} style={{ marginRight: 8 }}>
                <Line x1={0} x2={22} y1={2} y2={2} stroke={colors.chartGoal} strokeWidth={1.5} strokeDasharray="5,4" />
              </Svg>
              <Text variant="footnote" color="secondaryLabel">
                {`Ціль: ${formatDuration(settings.goalMinutes)}`}
              </Text>
            </View>
          </Card>

          <SectionTitle title="Підсумки" />
          <View style={{ flexDirection: 'row' }}>
            <Tile
              style={{ flex: 1, marginRight: layout.gap / 2 }}
              label="Типова ніч"
              icon="moon"
              value={stats.medianMinutes !== null ? <Duration minutes={stats.medianMinutes} /> : <Text variant="metricM">—</Text>}
              caption="Медіана"
            />
            <Tile
              style={{ flex: 1, marginLeft: layout.gap / 2 }}
              label="Найдовший сон"
              icon="sun"
              value={stats.longest ? <Duration minutes={stats.longest.minutes} /> : <Text variant="metricM">—</Text>}
              caption={stats.longest ? formatDayMedium(stats.longest.date) : undefined}
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: layout.gap }}>
            <Tile
              style={{ flex: 1, marginRight: layout.gap / 2 }}
              label="Найкоротший сон"
              icon="bed"
              value={stats.shortest ? <Duration minutes={stats.shortest.minutes} /> : <Text variant="metricM">—</Text>}
              caption={stats.shortest ? formatDayMedium(stats.shortest.date) : undefined}
            />
            <Tile
              style={{ flex: 1, marginLeft: layout.gap / 2 }}
              label="Ціль досягнуто"
              icon="target"
              value={<Metric value={String(stats.goalMetDays)} unit={`з ${stats.loggedDays}`} />}
              caption={stats.goalMetRate !== null ? `${formatPercent(stats.goalMetRate)} ночей` : undefined}
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: layout.gap }}>
            <Tile
              style={{ flex: 1, marginRight: layout.gap / 2 }}
              label="Недосип до цілі"
              icon="trendDown"
              value={<Duration minutes={stats.sleepDebtMinutes} />}
              caption="Сума нестачі за ночі"
            />
            <Tile
              style={{ flex: 1, marginLeft: layout.gap / 2 }}
              label="Регулярність"
              icon="clock"
              value={
                std !== null ? (
                  <Text variant="metricM" numberOfLines={1}>
                    {'±'}
                    <Duration minutes={std} />
                  </Text>
                ) : (
                  <Text variant="metricM" color="tertiaryLabel">
                    —
                  </Text>
                )
              }
              caption={std !== null ? 'Типове відхилення' : 'Потрібно 2+ записи'}
            />
          </View>

          <SectionTitle title="Скільки ночей по годинах" />
          <Card>
            <Text variant="footnote" color="secondaryLabel" style={{ marginBottom: 8 }}>
              Кількість днів із такою тривалістю сну
            </Text>
            <HBars rows={bucketRows} />
          </Card>

          {kind !== 'week' ? (
            <>
              <SectionTitle title="За днями тижня" />
              <Card>
                <Text variant="footnote" color="secondaryLabel" style={{ marginBottom: 12 }}>
                  Середня тривалість сну
                </Text>
                <BarChart data={weekdays} goal={settings.goalMinutes} plotHeight={120} showYAxis={false} />
              </Card>
            </>
          ) : null}

          {insights.length > 0 ? (
            <>
              <SectionTitle title="Висновки" />
              <Card>
                {insights.map((line, index) => (
                  <View key={line} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: index === 0 ? 0 : 12 }}>
                    <View style={{ marginTop: 1, marginRight: 10 }}>
                      <Icon name="sparkles" size={18} color={colors.tint} />
                    </View>
                    <Text variant="subhead" style={{ flex: 1 }}>
                      {line}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
