import { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';

import type { DateISO } from '../domain/types';
import { useApp } from '../state/AppContext';
import { useTheme } from '../theme/ThemeProvider';
import { Pager, usePager } from '../ui/Pager';
import { TABS, TabBar } from '../ui/TabBar';
import { EntrySheet } from './EntrySheet';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { StatsScreen } from './StatsScreen';
import { TodayScreen } from './TodayScreen';

interface SheetState {
  open: boolean;
  date: DateISO;
}

const STATS_PAGE = 1;

/**
 * Головний каркас: чотири екрани в одному горизонтальному «листку» (їх можна гортати пальцем),
 * плаваюча панель вкладок із «скляною» лінзою й аркуш запису сну.
 */
export function Root() {
  const { colors } = useTheme();
  const { today } = useApp();
  const pager = usePager(TABS.length, 0);
  const { current, goTo } = pager;
  const [sheet, setSheet] = useState<SheetState>({ open: false, date: today });

  const openEntry = useCallback((date?: DateISO) => setSheet({ open: true, date: date ?? today }), [today]);
  const closeEntry = useCallback(() => setSheet((state) => ({ ...state, open: false })), []);
  const openStats = useCallback(() => goTo(STATS_PAGE), [goTo]);

  // Кнопка «Назад» на Android: спершу закриваємо аркуш, потім повертаємось на «Сьогодні», і лише тоді виходимо.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet.open) {
        closeEntry();
        return true;
      }
      if (current !== 0) {
        goTo(0);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [sheet.open, current, goTo, closeEntry]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Pager pager={pager}>
        <TodayScreen onAdd={openEntry} onOpenStats={openStats} />
        <StatsScreen onAdd={openEntry} />
        <HistoryScreen onEdit={openEntry} onAdd={() => openEntry()} />
        <SettingsScreen />
      </Pager>

      <TabBar pager={pager} onAdd={() => openEntry()} />
      <EntrySheet visible={sheet.open} initialDate={sheet.date} onClose={closeEntry} />
    </View>
  );
}
