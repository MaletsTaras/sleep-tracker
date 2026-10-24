import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { dayOf, diffDays, weekdayMon0 } from '../domain/dates';
import { formatDelta, formatDuration, formatRecords, relativeDayLabel, WEEKDAYS_SHORT } from '../domain/format';
import { SOURCE_LABELS, isDemoRecord, type DateISO, type SleepRecord, type SourceId } from '../domain/types';
import { useApp } from '../state/AppContext';
import { groupByMonth, hasSource, qualityOf, type Quality } from '../state/selectors';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Duration } from '../ui/Duration';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Screen';
import { SegmentedControl, type SegmentOption } from '../ui/SegmentedControl';
import { Tap } from '../ui/Tap';
import { Text } from '../ui/Text';
import { useToast } from '../ui/Toast';

const PAGE = 60;

const SOURCE_OPTIONS: readonly SegmentOption<SourceId>[] = [
  { value: 'manual', label: SOURCE_LABELS.manual },
  { value: 'watch', label: SOURCE_LABELS.watch },
];

export interface HistoryScreenProps {
  onEdit: (date: DateISO) => void;
  onAdd: () => void;
}

export function HistoryScreen({ onEdit, onAdd }: HistoryScreenProps) {
  const { colors } = useTheme();
  const { records, settings, today } = useApp();
  const toast = useToast();
  const [source, setSource] = useState<SourceId>('manual');
  const [limit, setLimit] = useState(PAGE);

  const showSourceSwitch = hasSource(records, 'watch');
  const activeSource: SourceId = showSourceSwitch ? source : 'manual';

  const list = useMemo(() => records.filter((record) => record.source === activeSource), [records, activeSource]);
  const visible = useMemo(() => list.slice(0, limit), [list, limit]);
  const groups = useMemo(() => groupByMonth(visible), [visible]);

  return (
    <Screen title="Історія" subtitle={list.length > 0 ? formatRecords(list.length) : undefined}>
      {showSourceSwitch ? (
        <SegmentedControl
          style={{ marginBottom: 16 }}
          options={SOURCE_OPTIONS}
          value={source}
          onChange={(next) => {
            setSource(next);
            setLimit(PAGE);
          }}
        />
      ) : null}

      {list.length === 0 ? (
        <EmptyState icon="calendar" title="Записів поки немає" message="Тут з’явиться список усіх ваших ночей — з можливістю виправити будь-який запис.">
          {activeSource === 'manual' ? <Button title="Додати запис" icon="plus" onPress={onAdd} /> : null}
        </EmptyState>
      ) : (
        <>
          {groups.map((group) => (
            <View key={group.key} style={{ marginBottom: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 8 }}>
                <Text variant="title3" accessibilityRole="header">
                  {group.label}
                </Text>
                <Text variant="footnote" color="secondaryLabel">
                  {`середнє ${formatDuration(group.averageMinutes)}`}
                </Text>
              </View>
              <Card padding={0} style={{ overflow: 'hidden' }}>
                {group.records.map((record, index) => (
                  <View key={`${record.date}-${record.source}`}>
                    {index > 0 ? <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 68 }} /> : null}
                    <HistoryRow
                      record={record}
                      goal={settings.goalMinutes}
                      today={today}
                      onPress={() => {
                        if (record.source === 'manual') onEdit(record.date);
                        else toast.show('Дані годинника змінити не можна', 'info');
                      }}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ))}
          {list.length > visible.length ? (
            <Button title="Показати ще" variant="tinted" onPress={() => setLimit(limit + PAGE)} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

interface HistoryRowProps {
  record: SleepRecord;
  goal: number;
  today: DateISO;
  onPress: () => void;
}

function HistoryRow({ record, goal, today, onPress }: HistoryRowProps) {
  const { colors } = useTheme();
  const quality: Quality = qualityOf(record.minutes, goal);
  const tone = quality === 'good' ? colors.positive : quality === 'near' ? colors.caution : colors.danger;
  const fill = Math.min(1, record.minutes / goal);
  const demo = isDemoRecord(record);
  const weekday = WEEKDAYS_SHORT[weekdayMon0(record.date)];

  return (
    <Tap
      onPress={onPress}
      pressedOpacity={0.6}
      accessibilityLabel={`${relativeDayLabel(record.date, today, diffDays)}: ${formatDuration(record.minutes)}${demo ? ', демо' : ''}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
        <View style={{ width: 44, alignItems: 'center', marginRight: 10 }}>
          <Text variant="metricS" tabular>
            {dayOf(record.date)}
          </Text>
          <Text variant="caption" color="secondaryLabel">
            {weekday}
          </Text>
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Duration minutes={record.minutes} variant="headline" unitScale={0.8} />
            {demo ? (
              <View style={{ marginLeft: 8, backgroundColor: colors.fill, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text variant="caption" color="secondaryLabel" style={{ fontSize: 10, lineHeight: 14 }}>
                  демо
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.fill, marginTop: 8, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(4, fill * 100)}%`, height: 6, borderRadius: 3, backgroundColor: tone }} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', width: 98 }}>
          {quality === 'good' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="check" size={16} color={colors.positive} strokeWidth={2.4} />
              <Text variant="footnote" color="positive" style={{ marginLeft: 4, fontFamily: fontFamilies.semibold }}>
                Ціль
              </Text>
            </View>
          ) : (
            <Text
              variant="footnote"
              color={quality === 'near' ? 'caution' : 'danger'}
              tabular
              numberOfLines={1}
              style={{ fontFamily: fontFamilies.semibold }}
            >
              {formatDelta(record.minutes - goal)}
            </Text>
          )}
        </View>
        <Icon name="chevronRight" size={16} color={colors.tertiaryLabel} />
      </View>
    </Tap>
  );
}
