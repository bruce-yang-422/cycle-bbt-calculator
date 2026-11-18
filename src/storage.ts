import { deriveHistory, isISODate, type BBTReading, type CycleType, type HistoryEntry, type HistoryRecord } from './cycle';

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

export const appStorageKeys = [
  'periodHistory', 'bbtData', 'cycleSettings', 'audienceMode', 'language',
  'regionPreference', 'installBannerDismissed',
] as const;

export type CycleField = 'lastPeriod' | 'cycleLength' | 'minLength' | 'maxLength' | 'periodLength';

export interface CycleSettings {
  type: CycleType;
  values: Record<CycleField, string>;
}

const cycleFields = ['lastPeriod', 'cycleLength', 'minLength', 'maxLength', 'periodLength'] as const;

function readJSON(key: string, storage?: StorageReader): unknown {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getHistory(storage?: StorageReader): HistoryEntry[] {
  return deriveHistory(readJSON('periodHistory', storage));
}

export function saveHistoryData(records: readonly HistoryRecord[], storage?: StorageWriter): void {
  (storage ?? globalThis.localStorage).setItem('periodHistory', JSON.stringify(records.map(({ date }) => ({ date }))));
}

export function getBBT(storage?: StorageReader): BBTReading[] {
  const entries = readJSON('bbtData', storage);
  if (!Array.isArray(entries)) return [];

  const readings: BBTReading[] = [];
  for (const entry of entries) {
    const date: unknown = entry?.date;
    const temp: unknown = entry?.temp;
    if (isISODate(date) && typeof temp === 'number' && Number.isFinite(temp)) readings.push({ date, temp });
  }
  return readings.sort((a, b) => b.date.localeCompare(a.date));
}

export function saveBBT(readings: readonly BBTReading[], storage?: StorageWriter): void {
  (storage ?? globalThis.localStorage).setItem('bbtData', JSON.stringify(readings));
}

export function readCycleSettings(storage?: StorageReader): CycleSettings | null {
  const stored = readJSON('cycleSettings', storage);
  if (!stored || typeof stored !== 'object' || !('type' in stored) || !('values' in stored)) return null;
  const { type, values } = stored;
  if ((type !== 'regular' && type !== 'irregular') || !values || typeof values !== 'object') return null;

  const form: CycleSettings['values'] = { lastPeriod: '', cycleLength: '', minLength: '', maxLength: '', periodLength: '' };
  for (const id of cycleFields) {
    const value: unknown = (values as Record<string, unknown>)[id];
    if (typeof value === 'string' || typeof value === 'number') form[id] = String(value);
  }
  return { type, values: form };
}

export function saveCycleSettings(settings: CycleSettings, storage?: StorageWriter): void {
  (storage ?? globalThis.localStorage).setItem('cycleSettings', JSON.stringify(settings));
}

export interface ResetOptions {
  confirm(message: string): boolean;
  storage?: Pick<Storage, 'removeItem'>;
  location: { href: string; replace(url: string): void };
  notify(message: string): void;
  translate?(key: 'reset.confirm' | 'reset.failed'): string;
}

export function resetAllData({ confirm, storage, location, notify, translate = key => key }: ResetOptions): 'reset' | 'cancelled' | 'failed' {
  if (!confirm(translate('reset.confirm'))) return 'cancelled';

  try {
    const target = storage ?? globalThis.localStorage;
    for (const key of appStorageKeys) target.removeItem(key);
  } catch {
    notify(translate('reset.failed'));
    return 'failed';
  }

  const url = new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url.href);
  return 'reset';
}
