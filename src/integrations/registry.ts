import { features } from '../config/features';
import { healthConnectSource } from './healthConnect';
import type { SleepSource } from './types';

/** Джерела, увімкнені в src/config/features.ts. */
export function getEnabledSources(): SleepSource[] {
  const sources: SleepSource[] = [];
  if (features.watchSync) sources.push(healthConnectSource);
  return sources;
}
