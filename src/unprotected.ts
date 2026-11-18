import { dOff, localISO, type CycleDayMap } from './cycle'

export type EmergencyKey = 'unp.lng' | 'unp.upa' | 'unp.iud'

/** Emergency-contraception windows, counted from the time of intercourse (WHO). */
const windows: Array<[EmergencyKey, number]> = [
  ['unp.lng', 3],
  ['unp.upa', 5],
  ['unp.iud', 5],
]

/** A test from 21 days after intercourse reliably detects a resulting pregnancy (NHS). */
export const testAfterDays = 21

const plus = (date: string, days: number) => localISO(dOff(new Date(`${date}T00:00:00`), days))
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)

export function unprotectedPlan(date: string, today: string, dayMap: CycleDayMap, nextPeriodDate?: string | null) {
  const info = dayMap[date]
  return {
    risk: !info ? 'unknown' : info.isFertileWindow ? 'high' : 'low',
    elapsed: daysBetween(date, today),
    methods: windows.map(([key, days]) => {
      const until = plus(date, days)
      return { key, until, state: today > until ? 'expired' : today === until ? 'last' : 'open' }
    }),
    emergencyOpen: today <= plus(date, 5),
    testDate: plus(date, testAfterDays),
    periodDate: nextPeriodDate && nextPeriodDate > date ? nextPeriodDate : null,
  } as const
}

/** The newest record stays on the home screen until a week past its test date. */
export function activeUnprotected(dates: readonly string[], today: string) {
  const latest = dates[0]
  return latest && daysBetween(latest, today) <= testAfterDays + 7 ? latest : null
}
