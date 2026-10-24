import * as Haptics from 'expo-haptics';

/** Легка вібрація-відгук. Помилки (наприклад, на пристрої без вібромотора) мовчки ігноруються. */
function safe(run: () => Promise<void>): void {
  try {
    run().catch(() => undefined);
  } catch {
    // нічого не робимо
  }
}

export function tapHaptic(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function selectionHaptic(): void {
  safe(() => Haptics.selectionAsync());
}

export function successHaptic(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
