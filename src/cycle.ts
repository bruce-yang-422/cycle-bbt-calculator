export type CycleType = 'regular' | 'irregular';
export type DayStatus = 'period' | 'fertile' | 'ovulation' | 'safe';

export interface HistoryRecord {
  date: string;
}

export interface HistoryEntry extends HistoryRecord {
  cycle: number | null;
  nextDate: string | null;
}

export interface BBTReading extends HistoryRecord {
  temp: number;
}

export interface BBTAnalysis {
  coverLine: number | null;
  ovulationDate: string | null;
  highTempStartDate: string | null;
  consecutiveHighDays: number;
  sorted: BBTReading[];
}

export interface CycleParams {
  lpv: string;
  cLen: number;
  pd: number;
  ovDay: number | null;
  startD: number;
  endD: number;
}

export interface CycleContext {
  calcParams?: Pick<CycleParams, 'lpv' | 'cLen'> | null;
  history?: readonly HistoryRecord[];
  today?: string;
}

export interface DayInfo {
  dayNum: number;
  status: DayStatus;
  isFertileWindow: boolean;
  isRecordedStart: boolean;
  isOvDay: boolean;
  isBBTOv: boolean;
  isBBTHi: boolean;
  bbtTemp?: number;
  isToday: boolean;
}

export type CycleDayMap = Record<string, DayInfo>;

export function localISO(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

export function dOff(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(base.getDate() + days);
  return result;
}

export function deriveHistory(records: unknown): HistoryEntry[] {
  if (!Array.isArray(records)) return [];

  const dates = new Set<string>();
  for (const entry of records) {
    const date: unknown = entry?.date;
    if (isISODate(date)) dates.add(date);
  }

  const ordered = [...dates].sort();
  return ordered.map((date, index) => {
    const nextDate = ordered[index + 1] ?? null;
    const cycle = nextDate ? (Date.parse(nextDate) - Date.parse(date)) / 86_400_000 : null;
    return { date, cycle, nextDate };
  }).reverse();
}

export function cycleBBT(
  data: readonly BBTReading[],
  asOf = localISO(new Date()),
  { calcParams, history = [], today = localISO(new Date()) }: CycleContext = {},
): BBTReading[] {
  const starts = history.map(({ date }) => date);
  if (calcParams) starts.push(calcParams.lpv);
  const start = starts.filter(date => date <= asOf).sort().at(-1);
  if (!start) return [];

  const configuredEnd = calcParams?.lpv === start
    ? localISO(dOff(new Date(`${start}T00:00:00`), calcParams.cLen))
    : null;

  return data.filter(({ date }) => date >= start && date <= asOf && date <= today
    && (!configuredEnd || date < configuredEnd));
}

export function analyzeBBT(
  data: readonly BBTReading[],
  asOf = localISO(new Date()),
  context: CycleContext = {},
): BBTAnalysis | null {
  const sorted = cycleBBT(data, asOf, context).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 6) return null;

  const result: BBTAnalysis = {
    coverLine: null, ovulationDate: null, highTempStartDate: null, consecutiveHighDays: 0, sorted,
  };
  if (sorted.length < 9 || sorted.at(-1)?.date !== asOf) return result;

  const consecutive = (a: BBTReading, b: BBTReading) =>
    localISO(dOff(new Date(`${a.date}T00:00:00`), 1)) === b.date;

  // A missing day or a drop ends the run. A trend must reach the query date.
  for (const [index, firstHigh] of sorted.entries()) {
    if (index < 6 || index > sorted.length - 3) continue;
    const baseline = sorted.slice(index - 6, index + 1);
    if (!baseline.every((reading, i) => i === 0 || consecutive(baseline[i - 1]!, reading))) continue;

    const coverLine = Number((Math.max(...baseline.slice(0, 6).map(reading => reading.temp)) + 0.05).toFixed(2));
    const high = sorted.slice(index);
    if (high.every((reading, i) => reading.temp >= coverLine && (i === 0 || consecutive(high[i - 1]!, reading)))) {
      return { ...result, coverLine, highTempStartDate: firstHigh.date, consecutiveHighDays: high.length };
    }
  }

  return result;
}

export function calculateDays(
  params: CycleParams,
  history: readonly HistoryRecord[],
  readings: readonly BBTReading[],
  today = localISO(new Date()),
): CycleDayMap {
  const { lpv, cLen, pd, ovDay, startD, endD } = params;
  const context = { calcParams: params, history, today };
  const start = new Date(`${lpv}T00:00:00`);
  const nextKnown = history.map(({ date }) => date).filter(date => date > lpv).sort()[0];
  const temperatures = new Map(readings.map(({ date, temp }) => [date, temp]));
  const bbtOvulationDate = analyzeBBT(readings, today, context)?.ovulationDate;
  const days: CycleDayMap = {};

  for (let dayNum = 1; dayNum <= cLen; dayNum++) {
    const iso = localISO(dOff(start, dayNum - 1));
    if (nextKnown && iso >= nextKnown) break;

    const isOvDay = dayNum === ovDay;
    const isFertileWindow = dayNum >= startD && dayNum <= endD;
    const status = dayNum <= pd ? 'period' : isOvDay ? 'ovulation' : isFertileWindow ? 'fertile' : 'safe';
    days[iso] = {
      dayNum,
      status,
      isFertileWindow,
      isRecordedStart: dayNum === 1 && iso <= today,
      isOvDay,
      isBBTOv: iso === bbtOvulationDate,
      isBBTHi: Boolean(analyzeBBT(readings, iso, context)?.highTempStartDate),
      bbtTemp: iso <= today ? temperatures.get(iso) : undefined,
      isToday: iso === today,
    };
  }

  return days;
}
