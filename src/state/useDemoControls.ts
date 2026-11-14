import { Alert } from 'react-native';

import { formatRecords } from '../domain/format';
import { useToast } from '../ui/Toast';
import { useApp } from './AppContext';

/**
 * Дії з демонстраційними даними для всіх екранів. Якщо користувач змінював демонстраційні ночі,
 * «Прибрати» питає, що з ними робити, — інакше вони лишались би мовчки й «демо не видалялось повністю».
 */
export function useDemoControls() {
  const toast = useToast();
  const { demo, loadDemoData, removeDemoData } = useApp();

  const guard = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (failure) {
      toast.show(failure instanceof Error ? failure.message : 'Не вдалося виконати дію', 'info');
    }
  };

  const load = () => guard(async () => toast.show(`Додано: ${formatRecords(await loadDemoData())}`));

  const run = (includeEdited: boolean) =>
    guard(async () => toast.show(`Прибрано: ${formatRecords(await removeDemoData({ includeEdited }))}`));

  const remove = () => {
    if (demo.edited === 0) {
      void run(false);
      return;
    }
    if (demo.pure === 0) {
      Alert.alert('Прибрати демонстраційні дані?', `Усі ${demo.edited} демонстраційних ночей ви змінили самі. Прибрати їх теж?`, [
        { text: 'Скасувати', style: 'cancel' },
        { text: `Прибрати (${demo.edited})`, style: 'destructive', onPress: () => void run(true) },
      ]);
      return;
    }
    Alert.alert('Прибрати демонстраційні дані?', `Ви змінили ${demo.edited} демонстраційних ночей. Прибрати лише ті, що не чіпали, чи й змінені теж?`, [
      { text: 'Скасувати', style: 'cancel' },
      { text: `Лише демо (${demo.pure})`, onPress: () => void run(false) },
      { text: `Разом зі зміненими (${demo.pure + demo.edited})`, style: 'destructive', onPress: () => void run(true) },
    ]);
  };

  return { counts: demo, load, remove };
}
