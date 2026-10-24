import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { addDays } from '../domain/dates';
import { capitalize, formatDayLong, formatDelta, formatDuration, formatPercent, plural } from '../domain/format';
import { recentDays } from '../domain/stats';
import type { DateISO } from '../domain/types';
import { readoutFor, seriesToBars } from '../state/chartData';
import { useApp } from '../state/AppContext';
import { dayValuesFor, greetingFor, recordFor, summarizeRecent } from '../state/selectors';
import { useCurrentTip } from '../state/useTip';
import { layout } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { BarChart } from '../ui/charts/BarChart';
import { Duration } from '../ui/Duration';
import { Icon } from '../ui/Icon';
import { Metric } from '../ui/Metric';
import { MoonPhase } from '../ui/MoonPhase';
import { Screen, SectionTitle } from '../ui/Screen';
import { Tap } from '../ui/Tap';
import { Text } from '../ui/Text';
import { Tile } from '../ui/Tile';
import { TipCard } from '../ui/TipCard';
import { useToast } from '../ui/Toast';

export interface TodayScreenProps {
  onAdd: (date?: DateISO) => void;
  onOpenStats: () => void;
}

export function TodayScreen({ onAdd, onOpenStats }: TodayScreenProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const { records, settings, today, streaks, hasDemo, tipsStore, loadDemoData, removeDemoData } = useApp();
  const [selected, setSelected] = useState<number | null>(null);

  const manual = useMemo(() => dayValuesFor(records, 'manual'), [records]);
  const todayRecord = recordFor(records, today);
  const yesterday = addDays(today, -1);
  const yesterdayMissing = manual.length > 0 && !manual.some((day) => day.date === yesterday);

  const last7 = useMemo(() => recentDays(manual, today, 7), [manual, today]);
  const bars = useMemo(() => seriesToBars(last7, 'week'), [last7]);
  const recent = useMemo(() => summarizeRecent(manual, today, settings.goalMinutes), [manual, today, settings.goalMinutes]);
  const readout = selected !== null ? readoutFor(last7[selected], 'week') : null;

  const { tip, nextAt } = useCurrentTip(settings.showTips, tipsStore);

  const goal = settings.goalMinutes;
  const minutes = todayRecord?.minutes ?? 0;
  const reached = todayRecord !== undefined && minutes >= goal;

  const runDemo = async (action: () => Promise<number>, message: (n: number) => string) => {
    try {
      toast.show(message(await action()));
    } catch (failure) {
      toast.show(failure instanceof Error ? failure.message : 'Не вдалося виконати дію', 'info');
    }
  };

  return (
    <Screen title={greetingFor(new Date().getHours())} subtitle={capitalize(formatDayLong(today))}>
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: layout.radiusHero, padding: 20, overflow: 'hidden' }}
      >
        {todayRecord ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text variant="subhead" color="heroTextSecondary">
                  Сон за цю ніч
                </Text>
                <View style={{ marginTop: 4 }}>
                  <Duration minutes={minutes} variant="metricL" color="heroText" unitColor="heroTextSecondary" />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    marginTop: 12,
                    backgroundColor: colors.heroChip,
                    borderRadius: 14,
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                  }}
                >
                  <Icon name={reached ? 'check' : 'target'} size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text variant="footnote" color="heroText" style={{ marginLeft: 6, fontFamily: fontFamilies.semibold }}>
                    {reached ? 'Ціль досягнуто' : `Не вистачило ${formatDuration(goal - minutes)}`}
                  </Text>
                </View>
                <Text variant="footnote" color="heroTextSecondary" style={{ marginTop: 8 }}>
                  {`Ціль: ${formatDuration(goal)}`}
                </Text>
              </View>
              <MoonPhase
                fraction={minutes / goal}
                size={96}
                accessibilityLabel={`Ціль сну виконано на ${formatPercent(Math.min(1, minutes / goal))}`}
              />
            </View>
            <Button
              title="Змінити запис"
              icon="edit"
              variant="onHero"
              size="compact"
              onPress={() => onAdd(today)}
              style={{ marginTop: 18 }}
            />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text variant="title2" color="heroText">
                  Скільки ви спали?
                </Text>
                <Text variant="subhead" color="heroTextSecondary" style={{ marginTop: 6 }}>
                  Запишіть сон за цю ніч — це займе кілька секунд.
                </Text>
              </View>
              <MoonPhase fraction={0} size={88} accessibilityLabel="Запису за сьогодні ще немає" />
            </View>
            <Button title="Записати сон" icon="plus" variant="heroSolid" onPress={() => onAdd(today)} style={{ marginTop: 20 }} />
          </>
        )}
      </LinearGradient>

      {records.length === 0 ? (
        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <Button
            title="Подивитися на прикладі"
            variant="plain"
            size="compact"
            onPress={() => runDemo(loadDemoData, (n) => `Додано ${n} демонстраційних записів`)}
          />
        </View>
      ) : null}

      {yesterdayMissing ? (
        <Tap onPress={() => onAdd(yesterday)} accessibilityLabel="Додати запис за вчора" style={{ marginTop: layout.gap }}>
          <Card padding={14} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="clock" size={20} color={colors.caution} />
            <Text variant="subhead" style={{ flex: 1, marginLeft: 10 }}>
              Немає запису за вчора
            </Text>
            <Text variant="subhead" color="tint" style={{ fontFamily: fontFamilies.semibold }}>
              Додати
            </Text>
          </Card>
        </Tap>
      ) : null}

      <View style={{ flexDirection: 'row', marginTop: layout.gap }}>
        <Tile
          style={{ flex: 1, marginRight: layout.gap / 2 }}
          label="Серія записів"
          icon="flame"
          value={<Metric value={String(streaks.current)} unit={plural(streaks.current, 'день', 'дні', 'днів')} />}
          caption={streaks.best > 0 ? `Рекорд: ${streaks.best}` : 'Записуйте щодня'}
        />
        <Tile
          style={{ flex: 1, marginLeft: layout.gap / 2 }}
          label="Середній сон"
          icon="clock"
          value={
            recent.average !== null ? (
              <Duration minutes={recent.average} variant="metricM" />
            ) : (
              <Text variant="metricM" color="tertiaryLabel">
                —
              </Text>
            )
          }
          caption={
            recent.delta !== null
              ? `${formatDelta(recent.delta)} проти попередніх 7 днів`
              : recent.average !== null
                ? 'За останні 7 днів'
                : 'Поки що замало даних'
          }
        />
      </View>

      <SectionTitle
        title="Останні 7 днів"
        right={
          <Tap onPress={onOpenStats} accessibilityLabel="Відкрити статистику" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="subhead" color="tint">
              Статистика
            </Text>
            <Icon name="chevronRight" size={16} color={colors.tint} />
          </Tap>
        }
      />
      <Card>
        <View style={{ marginBottom: 12 }}>
          {readout ? (
            <>
              <Text variant="footnote" color="secondaryLabel">
                {readout.title}
              </Text>
              <Text variant="title3">{readout.value}</Text>
            </>
          ) : (
            <>
              <Text variant="footnote" color="secondaryLabel">
                Ціль досягнуто за 7 днів
              </Text>
              {recent.logged > 0 ? (
                <Text variant="title3">{`${recent.goalHits} з ${recent.logged} ${recent.logged === 1 ? 'записаної ночі' : 'записаних ночей'}`}</Text>
              ) : (
                <Text variant="title3" color="tertiaryLabel">
                  Немає записів
                </Text>
              )}
            </>
          )}
        </View>
        <BarChart data={bars} goal={goal} plotHeight={104} showYAxis={false} selectedIndex={selected} onSelect={setSelected} />
      </Card>

      {settings.showTips && tip ? (
        <View style={{ marginTop: layout.sectionGap }}>
          <TipCard tip={tip} nextAt={nextAt} />
        </View>
      ) : null}

      {hasDemo ? (
        <Card padding={14} style={{ marginTop: layout.gap, flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="info" size={20} color={colors.tint} />
          <Text variant="footnote" color="secondaryLabel" style={{ flex: 1, marginHorizontal: 10 }}>
            Показано демонстраційні дані.
          </Text>
          <Button
            title="Прибрати"
            variant="tinted"
            size="compact"
            onPress={() => runDemo(removeDemoData, (n) => `Прибрано ${n} демонстраційних записів`)}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
