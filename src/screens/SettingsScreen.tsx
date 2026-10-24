import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Alert, Share, View } from 'react-native';

import { createBackup, parseBackup } from '../domain/backup';
import { formatDuration, formatRecords } from '../domain/format';
import {
  GOAL_MAX_MINUTES,
  GOAL_MIN_MINUTES,
  GOAL_STEP_MINUTES,
  isDemoRecord,
  type ThemePreference,
  type WeekStart,
} from '../domain/types';
import { useApp } from '../state/AppContext';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { successHaptic, warningHaptic } from '../ui/haptics';
import { ListGroup, ListRow } from '../ui/ListGroup';
import { Screen } from '../ui/Screen';
import { SegmentedControl, type SegmentOption } from '../ui/SegmentedControl';
import { Stepper } from '../ui/Stepper';
import { Text } from '../ui/Text';
import { Toggle } from '../ui/Toggle';
import { useToast } from '../ui/Toast';

const THEME_OPTIONS: readonly SegmentOption<ThemePreference>[] = [
  { value: 'system', label: 'Авто' },
  { value: 'light', label: 'Світла' },
  { value: 'dark', label: 'Темна' },
];

const WEEK_OPTIONS: readonly SegmentOption<'1' | '0'>[] = [
  { value: '1', label: 'Пн' },
  { value: '0', label: 'Нд' },
];

function SoonPill() {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text variant="caption" color="tint" style={{ fontFamily: fontFamilies.semibold }}>
        Скоро
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const toast = useToast();
  const { records, settings, hasDemo, updateSettings, loadDemoData, removeDemoData, restoreBackup, eraseEverything } = useApp();

  const realRecordCount = records.filter((record) => !isDemoRecord(record)).length;

  /** Виконує дію й показує зрозуміле повідомлення, якщо щось пішло не так. */
  const attempt = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (failure) {
      toast.show(failure instanceof Error ? failure.message : 'Не вдалося виконати дію', 'info');
    }
  };

  const changeGoal = (delta: number) =>
    attempt(() =>
      updateSettings({ goalMinutes: Math.min(GOAL_MAX_MINUTES, Math.max(GOAL_MIN_MINUTES, settings.goalMinutes + delta)) }),
    );

  const shareBackup = () =>
    attempt(async () => {
      if (realRecordCount === 0) {
        toast.show('Поки немає записів для копії', 'info');
        return;
      }
      await Share.share({ title: 'Резервна копія «Трекера сну»', message: createBackup(records, settings) });
    });

  const copyBackup = () =>
    attempt(async () => {
      if (realRecordCount === 0) {
        toast.show('Поки немає записів для копії', 'info');
        return;
      }
      await Clipboard.setStringAsync(createBackup(records, settings));
      successHaptic();
      toast.show('Копію скопійовано. Вставте її в нотатки чи месенджер.');
    });

  const restoreFromClipboard = () =>
    attempt(async () => {
      const parsed = parseBackup(await Clipboard.getStringAsync());
      if (!parsed.ok) {
        Alert.alert('Не вдалося відновити', parsed.error);
        return;
      }
      const skipped = parsed.skipped > 0 ? ` Ще ${parsed.skipped} позначено як пошкоджені й пропущено.` : '';
      Alert.alert(
        'Відновити з копії?',
        `У копії ${formatRecords(parsed.records.length)}. Записи за ті самі дати буде замінено, решту ваших записів не чіпатимемо.${skipped}`,
        [
          { text: 'Скасувати', style: 'cancel' },
          {
            text: 'Відновити',
            onPress: () =>
              attempt(async () => {
                const result = await restoreBackup(parsed.records, parsed.settings);
                successHaptic();
                toast.show(`Відновлено: нових ${result.inserted}, оновлено ${result.updated}`);
              }),
          },
        ],
      );
    });

  const toggleDemo = () =>
    attempt(async () => {
      if (hasDemo) {
        toast.show(`Прибрано ${await removeDemoData()} демонстраційних записів`);
      } else {
        toast.show(`Додано ${await loadDemoData()} демонстраційних записів`);
      }
    });

  const confirmErase = () => {
    warningHaptic();
    Alert.alert(
      'Видалити всі дані?',
      'Усі записи й налаштування буде видалено без можливості відновлення. Якщо вони ще потрібні, спершу зробіть резервну копію.',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити все',
          style: 'destructive',
          onPress: () =>
            attempt(async () => {
              await eraseEverything();
              toast.show('Усі дані видалено');
            }),
        },
      ],
    );
  };

  return (
    <Screen title="Параметри">
      <ListGroup header="Сон" footer="Ціль враховується в кільці-місяці, на графіках і в підрахунку недосипу.">
        <ListRow
          icon="target"
          title="Ціль сну"
          subtitle={formatDuration(settings.goalMinutes)}
          right={
            <Stepper
              onDecrement={() => changeGoal(-GOAL_STEP_MINUTES)}
              onIncrement={() => changeGoal(GOAL_STEP_MINUTES)}
              canDecrement={settings.goalMinutes > GOAL_MIN_MINUTES}
              canIncrement={settings.goalMinutes < GOAL_MAX_MINUTES}
              decrementLabel="Зменшити ціль на 15 хвилин"
              incrementLabel="Збільшити ціль на 15 хвилин"
            />
          }
        />
        <ListRow
          icon="calendar"
          title="Початок тижня"
          right={
            <SegmentedControl
              style={{ width: 120 }}
              options={WEEK_OPTIONS}
              value={String(settings.weekStartsOn) as '1' | '0'}
              onChange={(value) => attempt(() => updateSettings({ weekStartsOn: Number(value) as WeekStart }))}
            />
          }
        />
      </ListGroup>

      <ListGroup header="Вигляд">
        <ListRow
          icon="moon"
          title="Тема"
          right={
            <SegmentedControl
              style={{ width: 204 }}
              options={THEME_OPTIONS}
              value={settings.theme}
              onChange={(value) => attempt(() => updateSettings({ theme: value }))}
            />
          }
        />
        <ListRow
          icon="bulb"
          title="Поради на головній"
          subtitle="Нова порада чи факт кожні 2 години"
          right={
            <Toggle
              value={settings.showTips}
              onValueChange={(value) => attempt(() => updateSettings({ showTips: value }))}
              accessibilityLabel="Показувати поради на головній"
            />
          }
        />
      </ListGroup>

      <ListGroup header="Підключення" footer="Ці можливості вже закладені в код застосунку й з’являться в наступних оновленнях.">
        <ListRow icon="watch" title="Годинник" subtitle="Da Fit → Health Connect" right={<SoonPill />} />
        <ListRow icon="sparkles" title="Поради з інтернету" subtitle="Нові поради й факти з мережі" right={<SoonPill />} />
      </ListGroup>

      <ListGroup
        header="Дані"
        footer="Копія — це звичайний текст. Надішліть його собі в нотатки чи месенджер, а на новому телефоні скопіюйте й оберіть «Відновити». Демонстраційні записи в копію не потрапляють."
      >
        <ListRow icon="upload" title="Надіслати копію" subtitle={formatRecords(realRecordCount)} onPress={shareBackup} chevron />
        <ListRow icon="copy" title="Скопіювати копію" onPress={copyBackup} chevron />
        <ListRow icon="download" title="Відновити з буфера обміну" onPress={restoreFromClipboard} chevron />
        <ListRow
          icon="sparkles"
          title={hasDemo ? 'Прибрати демонстраційні дані' : 'Заповнити демонстраційними даними'}
          subtitle={hasDemo ? undefined : '90 днів для прикладу, їх можна прибрати однією кнопкою'}
          onPress={toggleDemo}
        />
      </ListGroup>

      <ListGroup>
        <ListRow icon="trash" title="Видалити всі дані" destructive onPress={confirmErase} />
      </ListGroup>

      <ListGroup header="Про застосунок">
        <ListRow
          icon="info"
          title="Версія"
          right={
            <Text variant="body" color="secondaryLabel">
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          }
        />
        <ListRow icon="shield" title="Приватність" subtitle="Усі записи зберігаються лише на цьому телефоні й нікуди не надсилаються." />
      </ListGroup>
    </Screen>
  );
}
