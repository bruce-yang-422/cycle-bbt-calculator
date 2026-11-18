import { isISODate } from './cycle'
import type { CycleSettings } from './storage'

/**
 * Backup file: UTF-8 CSV with one `record,key,value` row per item, readable in any spreadsheet.
 * Column names and record types are fixed English identifiers, so a file exported in one language
 * imports in any other.
 */
export const backupFormat = 'cycle-bbt-backup'
export const backupVersion = 1

const settingFields = ['lastPeriod', 'cycleLength', 'minLength', 'maxLength', 'periodLength'] as const
const preferenceRules = {
  language: (value: string, languages: readonly string[]) => languages.includes(value),
  audienceMode: (value: string) => ['contraception', 'tracking', 'conception'].includes(value),
  regionPreference: (value: string) => ['auto', 'TW', 'global'].includes(value),
  theme: (value: string) => value === 'light' || value === 'dark',
} as const
type PreferenceKey = keyof typeof preferenceRules

export interface BackupData {
  settings: CycleSettings | null
  periods: string[]
  temperatures: Array<{ date: string; temp: number }>
  unprotected: string[]
  preferences: Partial<Record<PreferenceKey, string>>
}

type Reader = Pick<Storage, 'getItem'>
type Writer = Pick<Storage, 'setItem' | 'removeItem'>

function readJSON(storage: Reader, key: string): unknown {
  try {
    const raw = storage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Serialises everything worth restoring; the install-prompt flag is device-specific and left out. */
export function buildBackup(storage: Reader, meta: { exported: string; app: string }): string {
  const rows: string[][] = [
    ['meta', 'format', backupFormat],
    ['meta', 'version', String(backupVersion)],
    ['meta', 'exported', meta.exported],
    ['meta', 'app', meta.app],
  ]

  const settings = readJSON(storage, 'cycleSettings') as CycleSettings | null
  if (settings?.type && settings.values) {
    rows.push(['setting', 'type', settings.type])
    for (const key of settingFields) rows.push(['setting', key, String(settings.values[key] ?? '')])
  }
  const periods = readJSON(storage, 'periodHistory')
  if (Array.isArray(periods)) {
    for (const entry of periods) if (isISODate(entry?.date)) rows.push(['period', entry.date, ''])
  }
  const temps = readJSON(storage, 'bbtData')
  if (Array.isArray(temps)) {
    for (const entry of temps) {
      if (isISODate(entry?.date) && typeof entry.temp === 'number') rows.push(['bbt', entry.date, entry.temp.toFixed(2)])
    }
  }
  const unprotected = readJSON(storage, 'unprotectedLog')
  if (Array.isArray(unprotected)) {
    for (const date of unprotected) if (isISODate(date)) rows.push(['unprotected', date, ''])
  }
  for (const key of Object.keys(preferenceRules) as PreferenceKey[]) {
    const value = storage.getItem(key)
    if (value) rows.push(['preference', key, value])
  }

  // The BOM makes Excel open the file as UTF-8 instead of the system code page.
  return '﻿' + [['record', 'key', 'value'], ...rows].map(row => row.map(field).join(',')).join('\r\n') + '\r\n'
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(cell); cell = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (cell || row.length) rows.push([...row, cell])
  return rows.filter(cells => cells.some(value => value.trim()))
}

export type ParseResult = { ok: true; data: BackupData } | { ok: false }

/**
 * Validates the whole file before anything is written. Any malformed row rejects the file,
 * so a damaged backup can never partially overwrite good data.
 */
export function parseBackup(text: string, languages: readonly string[]): ParseResult {
  const rows = parseCSV(text.replace(/^﻿/, '')).map(cells => cells.map(value => value.trim()))
  const [header, ...body] = rows
  if (header?.join(',') !== 'record,key,value') return { ok: false }

  const meta = new Map<string, string>()
  const settingValues: Record<string, string> = {}
  const data: BackupData = { settings: null, periods: [], temperatures: [], unprotected: [], preferences: {} }

  for (const [record = '', key = '', value = ''] of body) {
    switch (record) {
      case 'meta':
        meta.set(key, value)
        break
      case 'setting':
        if (key !== 'type' && !settingFields.includes(key as (typeof settingFields)[number])) return { ok: false }
        settingValues[key] = value
        break
      case 'period':
      case 'unprotected':
        if (!isISODate(key)) return { ok: false }
        data[record === 'period' ? 'periods' : 'unprotected'].push(key)
        break
      case 'bbt': {
        const temp = Number(value)
        if (!isISODate(key) || !Number.isFinite(temp) || temp < 35 || temp > 38.5) return { ok: false }
        data.temperatures.push({ date: key, temp: Math.round(temp * 100) / 100 })
        break
      }
      case 'preference':
        if (!(key in preferenceRules) || !preferenceRules[key as PreferenceKey](value, languages)) return { ok: false }
        data.preferences[key as PreferenceKey] = value
        break
      default:
        // Rows from a newer app version are skipped rather than rejected.
        break
    }
  }

  if (meta.get('format') !== backupFormat || Number(meta.get('version')) > backupVersion) return { ok: false }
  if (Object.keys(settingValues).length) {
    const type = settingValues.type
    if ((type !== 'regular' && type !== 'irregular') || !isISODate(settingValues.lastPeriod)) return { ok: false }
    const values = Object.fromEntries(settingFields.map(key => [key, settingValues[key] ?? ''])) as CycleSettings['values']
    data.settings = { type, values }
  }
  data.periods = [...new Set(data.periods)].sort((a, b) => b.localeCompare(a))
  data.unprotected = [...new Set(data.unprotected)].sort((a, b) => b.localeCompare(a))
  const byDate = new Map(data.temperatures.map(reading => [reading.date, reading]))
  data.temperatures = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
  return { ok: true, data }
}

/** Replaces all records with the backup; preferences in the file override, others are kept. */
export function applyBackup(data: BackupData, storage: Writer): void {
  const write = (key: string, value: unknown, present: boolean) => {
    if (present) storage.setItem(key, JSON.stringify(value))
    else storage.removeItem(key)
  }
  write('cycleSettings', data.settings, Boolean(data.settings))
  write('periodHistory', data.periods.map(date => ({ date })), data.periods.length > 0)
  write('bbtData', data.temperatures, data.temperatures.length > 0)
  write('unprotectedLog', data.unprotected, data.unprotected.length > 0)
  for (const [key, value] of Object.entries(data.preferences)) storage.setItem(key, value)
}

/** e.g. `zh-TW_週期與體溫備份_2026-11-18.csv` — language first so files are easy to tell apart. */
export function backupFilename(language: string, name: string, date: string): string {
  const safe = name.replace(/[\\/:*?"<>|\s]+/g, '-')
  return `${language}_${safe}_${date}.csv`
}
