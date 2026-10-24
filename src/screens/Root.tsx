import { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';

import type { DateISO } from '../domain/types';
import { useApp } from '../state/AppContext';
import { useTheme } from '../theme/ThemeProvider';
import { TabBar, type TabKey } from '../ui/TabBar';
import { EntrySheet } from './EntrySheet';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { StatsScreen } from './StatsScreen';
import { TodayScreen } from './TodayScreen';

interface SheetState {
  open: boolean;
  date: DateISO;
}

/** Головний каркас: активна вкладка, плаваюча панель внизу й аркуш запису сну. */
export function Root() {
  const { colors } = useTheme();
  const { today } = useApp();
  const [tab, setTab] = useState<TabKey>('today');
  const [sheet, setSheet] = useState<SheetState>({ open: false, date: today });

  const openEntry = useCallback((date?: DateISO) => setSheet({ open: true, date: date ?? today }), [today]);
  const closeEntry = useCallback(() => setSheet((state) => ({ ...state, open: false })), []);

  // Кнопка «Назад» на Android: спершу закриваємо аркуш, потім повертаємось на «Сьогодні», і лише тоді виходимо.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet.open) {
        closeEntry();
        return true;
      }
      if (tab !== 'today') {
        setTab('today');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [sheet.open, tab, closeEntry]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {tab === 'today' ? <TodayScreen onAdd={openEntry} onOpenStats={() => setTab('stats')} /> : null}
      {tab === 'stats' ? <StatsScreen onAdd={openEntry} /> : null}
      {tab === 'history' ? <HistoryScreen onEdit={openEntry} onAdd={() => openEntry()} /> : null}
      {tab === 'settings' ? <SettingsScreen /> : null}

      <TabBar active={tab} onChange={setTab} onAdd={() => openEntry()} />
      <EntrySheet visible={sheet.open} initialDate={sheet.date} onClose={closeEntry} />
    </View>
  );
}
