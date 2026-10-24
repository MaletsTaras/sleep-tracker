import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BACKUP_APP, BACKUP_VERSION, createBackup, parseBackup } from '../src/domain/backup';
import { generateDemoRecords } from '../src/domain/demo';
import { clampGoal, parseSettings, serializeSettings } from '../src/domain/settings';
import { DEFAULT_SETTINGS, isDemoRecord, type SleepRecord } from '../src/domain/types';
import { addDays, isValidISODate } from '../src/domain/dates';

function rec(date: string, minutes: number, extra: Partial<SleepRecord> = {}): SleepRecord {
  return { date, minutes, source: 'manual', meta: null, createdAt: 1, updatedAt: 1, ...extra };
}

const NOW = new Date('2026-10-03T16:00:00.000Z');

test('копія: створення й відновлення без втрат', () => {
  const records = [rec('2026-10-03', 450), rec('2026-10-01', 400), rec('2026-10-02', 0, { source: 'watch', minutes: 410 })];
  const text = createBackup(records, { ...DEFAULT_SETTINGS, goalMinutes: 450 }, NOW);
  const parsed = parseBackup(text);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.skipped, 0);
  assert.equal(parsed.exportedAt, NOW.toISOString());
  assert.deepEqual(parsed.records, [
    { date: '2026-10-01', minutes: 400, source: 'manual' },
    { date: '2026-10-02', minutes: 410, source: 'watch' },
    { date: '2026-10-03', minutes: 450, source: 'manual' },
  ]);
  assert.equal(parsed.settings?.goalMinutes, 450);
  assert.equal(parsed.settings?.theme, 'system');
});

test('демо-записи не потрапляють у копію', () => {
  const records = [rec('2026-10-03', 450), rec('2026-10-02', 400, { meta: { demo: true } })];
  const text = createBackup(records, DEFAULT_SETTINGS, NOW);
  const parsed = parseBackup(text);
  assert.equal(parsed.ok && parsed.records.length, 1);
});

test('копія розбирається, навіть якщо її обгорнули в зайвий текст', () => {
  const text = createBackup([rec('2026-10-03', 450)], DEFAULT_SETTINGS, NOW);
  const wrapped = `Ось копія:\n\`\`\`json\n${text}\n\`\`\`\nДякую!`;
  const parsed = parseBackup(wrapped);
  assert.equal(parsed.ok, true);
});

test('некоректні записи пропускаються й підраховуються', () => {
  const text = JSON.stringify({
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    records: [
      { date: '2026-10-03', minutes: 450 },
      { date: '2026-02-30', minutes: 450 },
      { date: '2026-10-02', minutes: -5 },
      { date: '2026-10-01', minutes: 1441 },
      { date: '2026-09-30', minutes: 400.5 },
      { date: '2026-09-29', minutes: 400, source: 'fridge' },
      null,
      { date: '2026-09-28', minutes: 1440 },
    ],
  });
  const parsed = parseBackup(text);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.skipped, 6);
  assert.deepEqual(
    parsed.records.map((r) => r.date).sort(),
    ['2026-09-28', '2026-10-03'],
  );
  assert.equal(parsed.records[0].source, 'manual'); // джерело за замовчуванням
  assert.equal(parsed.settings, null);
});

test('помилки зрозумілі користувачу', () => {
  const bad = (text: string) => {
    const r = parseBackup(text);
    assert.equal(r.ok, false);
    return r.ok ? '' : r.error;
  };
  assert.match(bad(''), /немає резервної копії/);
  assert.match(bad('привіт'), /немає резервної копії/);
  assert.match(bad('{"app":"sleep-tracker","version":1,'), /немає резервної копії|пошкоджений/);
  assert.match(bad('{"foo":1}'), /не резервна копія/);
  assert.match(bad(JSON.stringify({ app: BACKUP_APP, version: 99, records: [] })), /новішою версією/);
  assert.match(bad(JSON.stringify({ app: BACKUP_APP, version: 1 })), /немає списку записів/);
  assert.match(
    bad(JSON.stringify({ app: BACKUP_APP, version: 1, records: [{ date: 'x', minutes: 1 }] })),
    /жодного коректного запису/,
  );
});

test('порожня, але правильна копія — це успіх', () => {
  const parsed = parseBackup(createBackup([], DEFAULT_SETTINGS, NOW));
  assert.equal(parsed.ok && parsed.records.length, 0);
});

test('дублікати в копії: перемагає останній', () => {
  const text = JSON.stringify({
    app: BACKUP_APP,
    version: 1,
    records: [
      { date: '2026-10-03', minutes: 400 },
      { date: '2026-10-03', minutes: 500 },
    ],
  });
  const parsed = parseBackup(text);
  assert.equal(parsed.ok && parsed.records.length, 1);
  assert.equal(parsed.ok && parsed.records[0].minutes, 500);
});

test('налаштування: допустимі значення завжди', () => {
  assert.deepEqual(parseSettings({}), DEFAULT_SETTINGS);
  assert.equal(parseSettings({ goalMinutes: '455' }).goalMinutes, 450);
  assert.equal(parseSettings({ goalMinutes: '10' }).goalMinutes, 240);
  assert.equal(parseSettings({ goalMinutes: '9999' }).goalMinutes, 720);
  assert.equal(parseSettings({ goalMinutes: 'abc' }).goalMinutes, 480);
  assert.equal(parseSettings({ theme: 'dark' }).theme, 'dark');
  assert.equal(parseSettings({ theme: 'pink' }).theme, 'system');
  assert.equal(parseSettings({ weekStartsOn: '0' }).weekStartsOn, 0);
  assert.equal(parseSettings({ weekStartsOn: '3' }).weekStartsOn, 1);
  assert.equal(parseSettings({ showTips: 'false' }).showTips, false);
  assert.equal(parseSettings({ showTips: 'maybe' }).showTips, true);
  assert.equal(clampGoal(Number.NaN), 480);
  assert.deepEqual(serializeSettings({ goalMinutes: 500, showTips: false, weekStartsOn: 0, theme: 'light' }), {
    goalMinutes: '495',
    showTips: 'false',
    weekStartsOn: '0',
    theme: 'light',
  });
  assert.deepEqual(serializeSettings({}), {});
});

test('демо-дані: детерміновані, коректні, без майбутнього', () => {
  const today = '2026-10-03';
  const a = generateDemoRecords(today, 120);
  const b = generateDemoRecords(today, 120);
  assert.deepEqual(a, b);
  assert.ok(a.length > 90 && a.length <= 120, `кількість: ${a.length}`);
  assert.equal(new Set(a.map((r) => r.date)).size, a.length);
  for (const r of a) {
    assert.ok(isValidISODate(r.date));
    assert.ok(r.date <= today);
    assert.ok(r.date >= addDays(today, -119));
    assert.ok(r.minutes >= 240 && r.minutes <= 660 && r.minutes % 5 === 0);
    assert.equal(isDemoRecord({ meta: r.meta ?? null }), true);
  }
  const different = generateDemoRecords(today, 120, 5);
  assert.notDeepEqual(a, different);
});
