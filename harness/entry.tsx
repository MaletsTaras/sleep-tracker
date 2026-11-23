import { createRoot } from 'react-dom/client';

import { MemorySleepRepository } from '../sleep-tracker/src/data/memoryRepository';
import { generateDemoSet } from '../sleep-tracker/src/domain/demo';
import { todayISO } from '../sleep-tracker/src/domain/dates';
import { Root } from '../sleep-tracker/src/screens/Root';
import { AppProvider, useApp } from '../sleep-tracker/src/state/AppContext';
import { ThemeProvider, useTheme } from '../sleep-tracker/src/theme/ThemeProvider';
import { ErrorBoundary } from '../sleep-tracker/src/ui/ErrorBoundary';
import { ToastProvider } from '../sleep-tracker/src/ui/Toast';
import { SafeAreaProvider } from './shim/misc';

declare const window: any;
const params = new URLSearchParams(window.location.search);
window.__scheme = params.get('scheme') ?? 'light';
window.__reduceMotion = params.get('reduce') === '1';

class SeededRepository extends MemorySleepRepository {
  async init() {
    if (params.get('seed') === 'demo') await this.upsertMany(generateDemoSet(todayISO()));
  }
}
const createRepository = () => new SeededRepository();

function Shell() {
  const { settings, status } = useApp();
  return (
    <ThemeProvider preference={settings.theme}>
      <Gate ready={status !== 'loading'} />
    </ThemeProvider>
  );
}
function Gate({ ready }: { ready: boolean }) {
  const { colors } = useTheme();
  if (!ready) return null;
  document.body.style.background = colors.background;
  return (
    <ToastProvider>
      <Root />
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <SafeAreaProvider>
      <AppProvider createRepository={createRepository}>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  </ErrorBoundary>,
);
