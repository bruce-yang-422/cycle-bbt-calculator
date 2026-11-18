import { computed, reactive, ref } from 'vue';
import {
  analyzeBBT, calculateDays, cycleBBT, deriveHistory, dOff, isISODate, localISO,
  type BBTReading, type CycleDayMap, type CycleParams, type CycleType, type DayInfo, type HistoryRecord,
} from './cycle';
import {
  getBBT, getHistory, readCycleSettings, saveBBT, saveCycleSettings, saveHistoryData,
  type CycleField, type CycleSettings,
} from './storage';

type NumericInput = string | number;
type NumberField = Exclude<CycleField, 'lastPeriod'>;

export interface CycleDraft extends Record<NumberField, string> {
  type: CycleType;
  lastPeriod: string;
}

export type ActionField = CycleField | 'hDate' | 'bbtDate' | 'bbtTemp';
type ErrorKey = 'error.date' | 'error.future' | 'error.duplicate' | 'error.range' | 'error.order'
  | 'error.temp' | 'error.storage' | 'error.unsupported' | 'setupFirst';
type SuccessKey = 'saved' | 'updated' | 'deleted' | 'error.storage';

interface ActionError {
  ok: false;
  key: ErrorKey;
  field?: ActionField;
  values?: { min: number; max: number };
}

export type ActionResult = ActionError | { ok: true; key?: SuccessKey };

export interface CalendarCell {
  iso: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  info?: DayInfo;
}

const limits = {
  cycleLength: { min: 20, max: 45 },
  minLength: { min: 18, max: 45 },
  maxLength: { min: 20, max: 50 },
  periodLength: { min: 2, max: 10 },
} satisfies Record<NumberField, { min: number; max: number }>;

function validLength(value: NumericInput, field: NumberField): boolean {
  const number = Number(value);
  const { min, max } = limits[field];
  return Number.isInteger(number) && number >= min && number <= max;
}

function prediction(values: CycleDraft): ActionError | { ok: true; params: CycleParams } {
  if (!isISODate(values.lastPeriod)) return { ok: false, key: 'error.date', field: 'lastPeriod' };

  const fields: NumberField[] = values.type === 'regular'
    ? ['cycleLength', 'periodLength']
    : ['minLength', 'maxLength', 'periodLength'];
  for (const field of fields) {
    if (!validLength(values[field], field)) return { ok: false, key: 'error.range', field, values: limits[field] };
  }

  const lpv = values.lastPeriod;
  const pd = Number(values.periodLength);
  if (values.type === 'regular') {
    const cLen = Number(values.cycleLength);
    const ovDay = cLen - 14;
    return { ok: true, params: { lpv, cLen, pd, ovDay, startD: ovDay - 5, endD: ovDay + 2 } };
  }

  const min = Number(values.minLength);
  const max = Number(values.maxLength);
  if (min >= max) return { ok: false, key: 'error.order', field: 'maxLength' };
  return { ok: true, params: { lpv, cLen: max, pd, ovDay: null, startD: min - 18, endD: max - 11 } };
}

function snapshot(draft: CycleDraft): CycleSettings {
  return {
    type: draft.type,
    values: {
      lastPeriod: draft.lastPeriod,
      cycleLength: String(draft.cycleLength),
      minLength: String(draft.minLength),
      maxLength: String(draft.maxLength),
      periodLength: String(draft.periodLength),
    },
  };
}

function validateRecordDate(date: string, today: string, field: 'bbtDate' | 'hDate'): ActionError | undefined {
  if (!isISODate(date)) return { ok: false, key: 'error.date', field };
  if (date > today) return { ok: false, key: 'error.future', field };
}

export function useCycle(storage?: Pick<Storage, 'getItem' | 'setItem'>) {
  const today = ref(localISO(new Date()));
  const defaults: CycleDraft = {
    type: 'regular', lastPeriod: today.value, cycleLength: '28', minLength: '25', maxLength: '32', periodLength: '5',
  };
  const savedSettings = readCycleSettings(storage);
  const savedDraft = savedSettings && { type: savedSettings.type, ...savedSettings.values };
  const initialPrediction = savedDraft && prediction(savedDraft);
  const draft = reactive<CycleDraft>(initialPrediction?.ok && savedDraft ? savedDraft : defaults);
  const appliedSettings = ref<CycleSettings | null>(initialPrediction?.ok ? savedSettings : null);
  const calcParams = ref<CycleParams | null>(initialPrediction?.ok ? initialPrediction.params : null);
  const history = ref(getHistory(storage));
  const bbt = ref(getBBT(storage));
  const selectedDate = ref(today.value);
  const calYear = ref(new Date(`${today.value}T00:00:00`).getFullYear());
  const calMonth = ref(new Date(`${today.value}T00:00:00`).getMonth());

  const context = computed(() => ({ calcParams: calcParams.value, history: history.value, today: today.value }));
  const bbtAnalysis = computed(() => analyzeBBT(bbt.value, today.value, context.value));
  const dayMap = computed<CycleDayMap>(() => calcParams.value
    ? calculateDays(calcParams.value, history.value, bbt.value, today.value)
    : {});
  const selectedDay = computed<DayInfo | undefined>(() => dayMap.value[selectedDate.value]);
  const calendarCells = computed<CalendarCell[]>(() => {
    const first = new Date(0);
    first.setFullYear(calYear.value, calMonth.value, 1);
    first.setHours(0, 0, 0, 0);
    const last = new Date(first);
    last.setMonth(last.getMonth() + 1, 0);
    const prefix = first.getDay();
    const size = Math.ceil((prefix + last.getDate()) / 7) * 7;

    return Array.from({ length: size }, (_, index) => {
      const date = dOff(first, index - prefix);
      const iso = localISO(date);
      const isCurrentMonth = date.getMonth() === calMonth.value;
      return { iso, day: date.getDate(), isCurrentMonth, isToday: iso === today.value, info: isCurrentMonth ? dayMap.value[iso] : undefined };
    });
  });

  const overview = computed(() => {
    const params = calcParams.value;
    if (!params) return null;
    const { lpv, cLen, ovDay, startD, endD } = params;
    const start = new Date(`${lpv}T00:00:00`);
    const nextPeriodDate = localISO(dOff(start, cLen));
    return {
      ovulationDate: ovDay === null ? null : localISO(dOff(start, ovDay - 1)),
      fertileStartDate: localISO(dOff(start, startD - 1)),
      fertileEndDate: localISO(dOff(start, endD - 1)),
      lowStartDate: localISO(dOff(start, endD)),
      nextPeriodDate,
      daysUntilNext: (Date.parse(nextPeriodDate) - Date.parse(today.value)) / 86_400_000,
      bbtCount: cycleBBT(bbt.value, today.value, context.value).length,
    };
  });

  const historyStats = computed(() => {
    const intervals = history.value.flatMap(({ cycle }) => cycle === null ? [] : [cycle]);
    if (!intervals.length) return null;
    return {
      cycles: intervals.length,
      avg: intervals.reduce((sum, days) => sum + days, 0) / intervals.length,
      min: Math.min(...intervals),
      max: Math.max(...intervals),
    };
  });

  function selectDate(iso: string): void {
    if (!isISODate(iso)) return;
    const date = new Date(`${iso}T00:00:00`);
    selectedDate.value = iso;
    calYear.value = date.getFullYear();
    calMonth.value = date.getMonth();
  }

  function moveMonth(delta: number): void {
    const date = new Date(0);
    date.setFullYear(calYear.value, calMonth.value + delta, 1);
    calYear.value = date.getFullYear();
    calMonth.value = date.getMonth();
  }

  function goToday(): void {
    today.value = localISO(new Date());
    selectDate(today.value);
  }

  function applySettings(): ActionResult {
    const result = prediction(draft);
    if (!result.ok) return result;

    today.value = localISO(new Date());
    calcParams.value = result.params;
    appliedSettings.value = snapshot(draft);
    selectDate(selectedDate.value);
    try {
      saveCycleSettings(appliedSettings.value, storage);
    } catch {
      return { ok: true, key: 'error.storage' };
    }
    return { ok: true, key: 'saved' };
  }

  function autoFill(): ActionResult {
    const latest = history.value[0];
    if (!latest) return { ok: true };
    draft.lastPeriod = latest.date;

    const stats = historyStats.value;
    if (!stats) return { ok: true };
    const { min, max } = stats;
    if (min === max && validLength(min, 'cycleLength')) {
      draft.type = 'regular';
      draft.cycleLength = String(min);
    } else if (min !== max && validLength(min, 'minLength') && validLength(max, 'maxLength')) {
      draft.type = 'irregular';
      draft.minLength = String(min);
      draft.maxLength = String(max);
    } else {
      return { ok: false, key: 'error.unsupported' };
    }
    return { ok: true };
  }

  function persistHistory(records: readonly HistoryRecord[]): ActionError | undefined {
    const derived = deriveHistory(records);
    try {
      saveHistoryData(derived, storage);
    } catch {
      return { ok: false, key: 'error.storage' };
    }
    history.value = derived;
  }

  function addHistory(date: string): ActionResult {
    today.value = localISO(new Date());
    const invalid = validateRecordDate(date, today.value, 'hDate');
    if (invalid) return invalid;
    history.value = getHistory(storage);
    if (history.value.some(record => record.date === date)) return { ok: false, key: 'error.duplicate', field: 'hDate' };

    return persistHistory([...history.value, { date }]) ?? { ok: true, key: 'saved' };
  }

  function deleteHistory(date: string): ActionResult {
    today.value = localISO(new Date());
    history.value = getHistory(storage);
    return persistHistory(history.value.filter(record => record.date !== date)) ?? { ok: true };
  }

  function saveCurrentCycle(): ActionResult {
    const params = calcParams.value;
    if (!params) return { ok: false, key: 'setupFirst' };
    const result = addHistory(params.lpv);
    return result.ok ? result : { ok: false, key: result.key };
  }

  function persistBBT(records: BBTReading[], key: 'saved' | 'updated' | 'deleted'): ActionResult {
    try {
      saveBBT(records, storage);
    } catch {
      return { ok: false, key: 'error.storage' };
    }
    bbt.value = records;
    return { ok: true, key };
  }

  function addBBT(date: string, value: NumericInput): ActionResult {
    today.value = localISO(new Date());
    const invalid = validateRecordDate(date, today.value, 'bbtDate');
    if (invalid) return invalid;

    const temp = Number(value);
    if (!Number.isFinite(temp) || temp < 35 || temp > 38.5 || Math.abs(temp * 100 - Math.round(temp * 100)) > 1e-8) {
      return { ok: false, key: 'error.temp', field: 'bbtTemp' };
    }
    bbt.value = getBBT(storage);
    const records = bbt.value.filter(record => record.date !== date);
    const updating = records.length !== bbt.value.length;
    records.push({ date, temp });
    records.sort((a, b) => b.date.localeCompare(a.date));
    return persistBBT(records, updating ? 'updated' : 'saved');
  }

  function deleteBBT(date: string): ActionResult {
    today.value = localISO(new Date());
    bbt.value = getBBT(storage);
    return persistBBT(bbt.value.filter(record => record.date !== date), 'deleted');
  }

  function clearBBT(): ActionResult {
    today.value = localISO(new Date());
    return persistBBT([], 'deleted');
  }

  return {
    draft, appliedSettings, calcParams, dayMap, selectedDate, calYear, calMonth, history, historyStats, bbt,
    bbtAnalysis, overview, selectedDay, calendarCells, applySettings, autoFill, selectDate, moveMonth, goToday,
    addHistory, deleteHistory, saveCurrentCycle, addBBT, deleteBBT, clearBBT,
  };
}
