const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyBackup, backupFilename, buildBackup, parseBackup } = require('../../src/backup.ts');
const { getBBT, getHistory, getUnprotected, readCycleSettings } = require('../../src/storage.ts');

const languages = ['zh-TW', 'en', 'ja', 'ko', 'es', 'de', 'th', 'vi'];

function memoryStorage(entries = {}) {
  const data = new Map(Object.entries(entries));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const saved = {
  cycleSettings: JSON.stringify({ type: 'regular', values: { lastPeriod: '2026-11-05', cycleLength: '28', minLength: '25', maxLength: '32', periodLength: '5' } }),
  periodHistory: JSON.stringify([{ date: '2026-10-08' }, { date: '2026-11-05' }]),
  bbtData: JSON.stringify([{ date: '2026-11-18', temp: 36.68 }, { date: '2026-11-17', temp: 36.7 }]),
  unprotectedLog: JSON.stringify(['2026-11-16']),
  language: 'zh-TW',
  audienceMode: 'contraception',
  regionPreference: 'TW',
  theme: 'dark',
  installBannerDismissed: '1',
};

test('a backup round-trips every record and preference', () => {
  const csv = buildBackup(memoryStorage(saved), { exported: '2026-11-18', app: '2.0.0' });
  assert(csv.startsWith('﻿record,key,value\r\n'));
  const parsed = parseBackup(csv, languages);
  assert(parsed.ok);

  const target = memoryStorage({ periodHistory: JSON.stringify([{ date: '2020-01-01' }]), installBannerDismissed: '1' });
  applyBackup(parsed.data, target);
  assert.deepEqual(readCycleSettings(target), JSON.parse(saved.cycleSettings));
  assert.deepEqual(getHistory(target).map((entry) => entry.date), ['2026-11-05', '2026-10-08']);
  assert.deepEqual(getBBT(target), [{ date: '2026-11-18', temp: 36.68 }, { date: '2026-11-17', temp: 36.7 }]);
  assert.deepEqual(getUnprotected(target), ['2026-11-16']);
  for (const key of ['language', 'audienceMode', 'regionPreference', 'theme']) assert.equal(target.getItem(key), saved[key]);
  assert.equal(target.getItem('installBannerDismissed'), '1');
});

test('restoring an empty backup clears records but keeps unrelated preferences', () => {
  const csv = buildBackup(memoryStorage({}), { exported: '2026-11-18', app: '2.0.0' });
  const parsed = parseBackup(csv, languages);
  assert(parsed.ok);
  const target = memoryStorage(saved);
  applyBackup(parsed.data, target);
  for (const key of ['cycleSettings', 'periodHistory', 'bbtData', 'unprotectedLog']) assert.equal(target.getItem(key), null, key);
  assert.equal(target.getItem('language'), 'zh-TW');
});

test('spreadsheet edits are tolerated: LF line endings, quotes, spaces and no BOM', () => {
  const csv = 'record,key,value\nmeta,format,cycle-bbt-backup\nmeta,version,1\n"bbt", 2026-11-18 ,"36.5"\nperiod,2026-11-01,\n\n';
  const parsed = parseBackup(csv, languages);
  assert(parsed.ok);
  assert.deepEqual(parsed.data.temperatures, [{ date: '2026-11-18', temp: 36.5 }]);
  assert.deepEqual(parsed.data.periods, ['2026-11-01']);
});

test('invalid or foreign files are rejected as a whole', () => {
  const base = 'record,key,value\nmeta,format,cycle-bbt-backup\nmeta,version,1\n';
  for (const [label, csv] of [
    ['not a backup', 'date,temp\n2026-11-18,36.5\n'],
    ['missing format', 'record,key,value\nperiod,2026-11-01,\n'],
    ['newer version', 'record,key,value\nmeta,format,cycle-bbt-backup\nmeta,version,2\n'],
    ['bad date', base + 'period,2026-13-01,\n'],
    ['temperature out of range', base + 'bbt,2026-11-18,42\n'],
    ['unknown language', base + 'preference,language,fr\n'],
    ['bad setting type', base + 'setting,type,weekly\nsetting,lastPeriod,2026-11-01\n'],
  ]) {
    assert.equal(parseBackup(csv, languages).ok, false, label);
  }
});

test('file names start with the chosen language', () => {
  assert.equal(backupFilename('zh-TW', '週期與體溫備份', '2026-11-18'), 'zh-TW_週期與體溫備份_2026-11-18.csv');
  assert.equal(backupFilename('en', 'Cycle temperature backup', '2026-11-18'), 'en_Cycle-temperature-backup_2026-11-18.csv');
});
