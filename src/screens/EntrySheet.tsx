import { useMemo, useState } from 'react';
import { Alert, ScrollView, View, useWindowDimensions } from 'react-native';

import { addDays, diffDays } from '../domain/dates';
import { formatClock, formatDelta, formatDuration, relativeDayLong } from '../domain/format';
import type { DateISO } from '../domain/types';
import { useApp } from '../state/AppContext';
import { recordFor, suggestMinutes } from '../state/selectors';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Duration } from '../ui/Duration';
import { DurationPicker } from '../ui/DurationPicker';
import { successHaptic, warningHaptic } from '../ui/haptics';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { Tap } from '../ui/Tap';
import { Text } from '../ui/Text';
import { useToast } from '../ui/Toast';

const QUICK_VALUES = [360, 390, 420, 450, 480, 510, 540] as const;

export interface EntrySheetProps {
  visible: boolean;
  /** Дата, з якої починаємо (за замовчуванням — сьогодні). */
  initialDate: DateISO;
  onClose: () => void;
}

export function EntrySheet({ visible, initialDate, onClose }: EntrySheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Запис сну">
      <EntryForm initialDate={initialDate} onClose={onClose} />
    </Sheet>
  );
}

/** Форма монтується разом з аркушем, тому початкові значення беруться свіжими під час кожного відкриття. */
function EntryForm({ initialDate, onClose }: { initialDate: DateISO; onClose: () => void }) {
  const { colors } = useTheme();
  const toast = useToast();
  const { height: windowHeight } = useWindowDimensions();
  const { records, settings, today, saveSleep, deleteSleep } = useApp();

  const startRecord = recordFor(records, initialDate);
  const [date, setDate] = useState<DateISO>(initialDate);
  const [minutes, setMinutes] = useState<number>(startRecord ? startRecord.minutes : suggestMinutes(records));
  const [busy, setBusy] = useState(false);

  const existing = useMemo(() => recordFor(records, date), [records, date]);
  const goal = settings.goalMinutes;
  const compact = windowHeight < 720;

  const changeDate = (delta: number) => {
    const next = addDays(date, delta);
    if (next > today) return;
    setDate(next);
    const found = recordFor(records, next);
    setMinutes(found ? found.minutes : minutes);
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveSleep({ date, minutes, source: 'manual' });
      successHaptic();
      onClose();
      toast.show(`Збережено: ${formatDuration(minutes)}`);
    } catch (failure) {
      setBusy(false);
      toast.show(failure instanceof Error ? failure.message : 'Не вдалося зберегти', 'info');
    }
  };

  const remove = () => {
    warningHaptic();
    Alert.alert('Видалити запис?', `Запис за ${relativeDayLong(date, today, diffDays).toLowerCase()} буде видалено.`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSleep({ date, source: 'manual' });
            onClose();
            toast.show('Запис видалено');
          } catch (failure) {
            toast.show(failure instanceof Error ? failure.message : 'Не вдалося видалити', 'info');
          }
        },
      },
    ]);
  };

  const reached = minutes >= goal;
  const canGoNext = addDays(date, 1) <= today;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 4 }}>
        <Tap
          onPress={() => changeDate(-1)}
          haptic="selection"
          accessibilityLabel="Попередній день"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevronLeft" size={22} color={colors.tint} strokeWidth={2.2} />
        </Tap>
        <Text variant="headline" align="center" style={{ flex: 1 }} accessibilityLiveRegion="polite">
          {relativeDayLong(date, today, diffDays)}
        </Text>
        <Tap
          onPress={() => changeDate(1)}
          disabled={!canGoNext}
          haptic="selection"
          accessibilityLabel="Наступний день"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevronRight" size={22} color={colors.tint} strokeWidth={2.2} />
        </Tap>
      </View>

      <View style={{ alignItems: 'center', marginTop: compact ? 0 : 6, marginBottom: compact ? 6 : 12 }}>
        <Duration minutes={minutes} variant="metricL" />
        <Text variant="footnote" color={reached ? 'positive' : 'secondaryLabel'} style={{ marginTop: 2 }}>
          {reached ? 'Ціль досягнуто' : `${formatDelta(minutes - goal)} до цілі ${formatDuration(goal)}`}
        </Text>
      </View>

      <DurationPicker minutes={minutes} onChange={setMinutes} itemHeight={compact ? 38 : 44} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: compact ? 10 : 16 }}
      >
        {QUICK_VALUES.map((value) => (
          <View key={value} style={{ marginRight: 8 }}>
            <Chip label={formatClock(value)} selected={minutes === value} onPress={() => setMinutes(value)} accessibilityLabel={formatDuration(value)} />
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 20 }}>
        <Button title={existing ? 'Оновити запис' : 'Зберегти'} onPress={save} disabled={busy} />
        {existing ? (
          <Button title="Видалити запис" variant="plain" onPress={remove} disabled={busy} style={{ marginTop: 4 }} />
        ) : null}
      </View>
    </View>
  );
}
