<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { audienceAdvice, purposeCopy, type AudienceMode } from '../audience'
import { formatNumber, localizedDate, t } from '../i18n'
import type { DayInfo } from '../cycle'
import type { useCycle } from '../useCycle'
import { activeUnprotected, unprotectedPlan } from '../unprotected'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ cycle: ReturnType<typeof useCycle>; audience: AudienceMode }>()
const emit = defineEmits<{ setup: []; temperature: [date?: string]; period: [date?: string]; unprotected: [date?: string]; share: [] }>()
const { calcParams, selectedDate, selectedDay, calendarCells, calMonth, calYear, overview, bbtAnalysis, dayMap, today, unprotected } = props.cycle
const details = ref<HTMLElement | null>(null)
const showDetails = ref(false)
const modeCopy = computed(() => purposeCopy(props.audience))
const weekdays = Array.from({ length: 7 }, (_, day) => new Date(2026, 0, 4 + day))
const toDate = (date: string) => new Date(date + 'T00:00:00')
const dateLabel = (date: string) => localizedDate(toDate(date))
const monthTitle = computed(() => localizedDate(new Date(calYear.value, calMonth.value, 1), { year: 'numeric', month: 'long' }))
const todayLabel = computed(() => localizedDate(toDate(today.value), { month: 'long', day: 'numeric', weekday: 'short' }))
const todayInfo = computed(() => dayMap.value[today.value])

function phaseOf(day?: DayInfo) {
  if (!day) return 'none'
  if (day.status === 'period') return 'period'
  if (day.isOvDay) return 'ovulation'
  if (day.isFertileWindow) return 'fertile'
  return 'safe'
}

function dayLabel(day: DayInfo) {
  if (day.isRecordedStart) return t('phase.recorded')
  return day.status === 'safe' ? modeCopy.value.low : t('phase.' + day.status)
}

function signalOf(day?: DayInfo) {
  if (!day) return null
  if (day.status === 'period') return { caption: day.isRecordedStart ? 'recorded' : 'bleedingEstimate', value: 'short.period' }
  if (day.isOvDay) return { caption: 'estimated', value: 'short.ovulation' }
  if (day.isFertileWindow) return { caption: 'estimated', value: 'short.fertile' }
  return props.audience === 'contraception'
    ? { caption: 'risk', value: 'short.lower' }
    : { caption: 'estimated', value: 'short.outside' }
}

const signal = computed(() => signalOf(todayInfo.value))
const ring = computed(() => {
  const length = calcParams.value?.cLen ?? 28
  const day = todayInfo.value?.dayNum ?? 0
  const circumference = 2 * Math.PI * 64
  return { circumference, offset: circumference * (1 - Math.min(day / length, 1)) }
})

const nextPeriod = computed(() => {
  const value = overview.value
  if (!value) return t('setupFirst')
  const key = value.daysUntilNext > 0 ? 'dueIn' : value.daysUntilNext === 0 ? 'dueToday' : 'pastDue'
  return t(key, { n: formatNumber(Math.abs(value.daysUntilNext)) })
})

const bbtSummary = computed(() => {
  const result = bbtAnalysis.value
  return result?.highTempStartDate ? t('bbt.rise', { n: formatNumber(result.consecutiveHighDays) }) : t('bbt.quick')
})

const summary = computed(() => {
  const value = overview.value
  if (!value) return []
  return [
    { phase: 'period', label: t('phase.next'), value: dateLabel(value.nextPeriodDate) },
    { phase: 'ovulation', label: t('phase.ovulation'), value: value.ovulationDate ? dateLabel(value.ovulationDate) : t('setup.irregular') },
    { phase: 'fertile', label: t('phase.fertile'), value: dateLabel(value.fertileStartDate) + ' – ' + dateLabel(value.fertileEndDate) },
    { phase: 'safe', label: modeCopy.value.low, value: t('fromDate', { date: dateLabel(value.lowStartDate) }) },
  ]
})

const selectedIsPast = computed(() => selectedDate.value <= today.value)

// The unprotected-sex entry is prominent only in contraception mode; other purposes get a quiet
// link, so anyone can reach it in an emergency. Records the user made always show.
const contraception = computed(() => props.audience === 'contraception')
const unprotectedDates = computed(() => new Set(unprotected.value))
const reminder = computed(() => {
  const date = activeUnprotected(unprotected.value, today.value)
  return date ? { date, ...unprotectedPlan(date, today.value, dayMap.value) } : null
})

function moveMonth(offset: number) {
  props.cycle.moveMonth(offset)
  showDetails.value = false
}

function goToday() {
  props.cycle.goToday()
  showDetails.value = false
}

async function showDay(date: string) {
  props.cycle.selectDate(date)
  showDetails.value = true
  await nextTick()
  details.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function cellLabel(date: string, day: DayInfo | undefined, isToday: boolean) {
  const longDate = localizedDate(toDate(date), { year: 'numeric', month: 'long', day: 'numeric' })
  return [
    longDate,
    ...(isToday ? [t('today')] : []),
    day ? dayLabel(day) : t('noData'),
    ...(unprotectedDates.value.has(date) ? [t('unp.legend')] : []),
  ].join(' · ')
}

function cellClass(day?: DayInfo) {
  if (!day) return undefined
  return [day.status, { 'bbt-hi': day.isBBTHi, 'bbt-ov': day.isBBTOv }]
}

defineExpose({ hideDetails: () => { showDetails.value = false } })
</script>

<template>
  <div class="home">
    <div class="home-main">
      <div v-if="!calcParams" id="startCard" class="hero start-card">
        <div class="start-art" aria-hidden="true">
          <span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>
          <AppIcon name="sparkle" :size="36" />
        </div>
        <h2>{{ t('setup.title') }}</h2>
        <p>{{ t('setup.intro') }}</p>
        <button type="button" class="btn btn-primary btn-lg" data-control="control-9" @click="emit('setup')">{{ t('setup.start') }}</button>
      </div>

      <div v-else id="stmCard" class="hero" :class="'is-' + phaseOf(todayInfo)" aria-live="polite">
        <div class="hero-top">
          <span class="hero-eyebrow">{{ t('hero.title') }}</span>
          <span id="stmDate" class="hero-date">{{ todayLabel }}</span>
        </div>
        <div class="hero-body">
          <div class="ring" aria-hidden="true">
            <svg viewBox="0 0 150 150">
              <circle class="ring-track" cx="75" cy="75" r="64" />
              <circle
                class="ring-bar"
                cx="75"
                cy="75"
                r="64"
                :stroke-dasharray="ring.circumference"
                :stroke-dashoffset="ring.offset"
              />
            </svg>
            <div class="ring-center">
              <strong>{{ todayInfo ? t('day', { n: formatNumber(todayInfo.dayNum) }) : '—' }}</strong>
            </div>
          </div>
          <div class="hero-copy">
            <span id="signalLabel" class="phase-pill">
              <template v-if="signal">
                <span class="pill-dot"></span>{{ t(signal.value) }}<span class="pill-caption">· {{ t(signal.caption) }}</span>
              </template>
              <template v-else>{{ t('noData') }}</template>
            </span>
            <p id="stmTitle" class="hero-title">{{ todayInfo ? dayLabel(todayInfo) : t('outsideCycle') }}</p>
            <p id="stmRows" class="hero-advice">{{ todayInfo ? audienceAdvice(audience, todayInfo) : '' }}</p>
          </div>
        </div>
        <div class="hero-foot">
          <AppIcon name="drop" :size="16" />
          <span class="foot-label">{{ t('phase.next') }}<strong v-if="overview">{{ dateLabel(overview.nextPeriodDate) }}</strong></span>
          <span id="scNextPeriodSub" class="foot-sub">{{ nextPeriod }}</span>
        </div>
      </div>

      <div class="quick-actions">
        <button type="button" class="action-card action-period" data-control="control-14" @click="emit('period')">
          <span class="action-icon"><AppIcon name="drop" :size="24" /></span>
          <span class="action-copy">
            <strong>{{ t('action.period') }}</strong>
            <small>{{ t('action.periodSub') }}</small>
          </span>
        </button>
        <button type="button" class="action-card action-temp quick-bbt" data-control="control-15" @click="emit('temperature')">
          <span class="action-icon"><AppIcon name="thermometer" :size="24" /></span>
          <span class="action-copy">
            <strong>{{ t('nav.bbt') }}</strong>
            <small id="scBBT">{{ bbtSummary }}</small>
          </span>
        </button>
      </div>

      <button v-if="contraception" type="button" class="action-row" data-control="control-34" @click="emit('unprotected')">
        <span class="action-row-icon"><AppIcon name="shield" :size="20" /></span>
        <span class="action-copy">
          <strong>{{ t('unp.action') }}</strong>
          <small>{{ t('unp.actionSub') }}</small>
        </span>
        <AppIcon class="row-arrow" name="right" :size="18" />
      </button>

      <button v-if="reminder" id="unpReminder" type="button" class="reminder-card" :class="{ urgent: reminder.emergencyOpen }" @click="emit('unprotected', reminder.date)">
        <span class="reminder-head">{{ t('unp.card', { n: formatNumber(reminder.elapsed) }) }}</span>
        <span class="reminder-body">{{ reminder.emergencyOpen ? t('unp.cardEc') : t('unp.cardTest', { date: dateLabel(reminder.testDate) }) }}</span>
      </button>

      <div v-if="summary.length" class="summary">
        <h2 class="block-title">{{ t('summary') }}</h2>
        <div id="statusCards" class="summary-grid">
          <div v-for="item in summary" :key="item.phase" class="summary-tile" :class="'is-' + item.phase">
            <span class="tile-label"><span class="swatch"></span>{{ item.label }}</span>
            <span class="tile-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="home-side">
      <div class="card calendar-card">
        <div class="cal-nav">
          <button type="button" class="icon-btn" :aria-label="t('prevMonth')" data-control="control-11" @click="moveMonth(-1)"><AppIcon name="left" /></button>
          <div id="calMonthTitle" class="cal-month">{{ monthTitle }}</div>
          <button type="button" class="icon-btn" :aria-label="t('nextMonth')" data-control="control-12" @click="moveMonth(1)"><AppIcon name="right" /></button>
          <button type="button" class="chip today-btn" data-control="control-13" @click="goToday">{{ t('today') }}</button>
        </div>
        <div class="cal-wds" aria-hidden="true">
          <div v-for="weekday in weekdays" :key="weekday.getDay()" class="cal-wd">{{ localizedDate(weekday, { weekday: 'narrow' }) }}</div>
        </div>
        <div id="calGrid" class="cal-grid">
          <template v-for="cell in calendarCells" :key="cell.iso">
            <button
              v-if="cell.isCurrentMonth"
              type="button"
              class="cal-cell"
              :class="[cellClass(cell.info), { today: cell.isToday, sel: showDetails && cell.iso === selectedDate }]"
              :data-date="cell.iso"
              :aria-label="cellLabel(cell.iso, cell.info, cell.isToday)"
              :aria-current="cell.isToday ? 'date' : undefined"
              :aria-pressed="cell.iso === selectedDate"
              @click="showDay(cell.iso)"
            >
              <span class="cell-num">{{ formatNumber(cell.day) }}</span>
              <span v-if="cell.info?.bbtTemp != null" class="cell-bbt-dot"></span>
              <span v-if="unprotectedDates.has(cell.iso)" class="cell-unp"></span>
            </button>
            <div v-else class="cal-cell other" aria-hidden="true"><span class="cell-num">{{ formatNumber(cell.day) }}</span></div>
          </template>
        </div>
        <div class="legend">
          <span class="leg-item is-period"><span class="swatch"></span>{{ t('short.period') }}</span>
          <span class="leg-item is-fertile"><span class="swatch"></span>{{ t('short.fertile') }}</span>
          <span class="leg-item is-ovulation"><span class="swatch"></span>{{ t('short.ovulation') }}</span>
          <span class="leg-item is-safe"><span class="swatch"></span><span id="lowRiskLegend">{{ modeCopy.low }}</span></span>
          <span class="leg-item is-bbt"><span class="swatch dot"></span>{{ t('bbt.legend') }}</span>
          <span v-if="unprotectedDates.size" class="leg-item"><span class="swatch unp"></span>{{ t('unp.legend') }}</span>
        </div>

        <div
          id="detailPanel"
          ref="details"
          class="day-detail"
          :class="[{ hidden: !showDetails }, 'is-' + phaseOf(selectedDay)]"
          aria-live="polite"
        >
          <template v-if="selectedDay">
            <div class="detail-head">
              <strong>{{ dateLabel(selectedDate) }}</strong>
              <span class="detail-tag">{{ t('day', { n: formatNumber(selectedDay.dayNum) }) }} · {{ dayLabel(selectedDay) }}</span>
            </div>
            <p class="audience-advice">{{ audienceAdvice(audience, selectedDay) }}</p>
            <p v-if="selectedDay.bbtTemp != null" class="detail-temp">
              <AppIcon name="thermometer" :size="15" />{{ formatNumber(selectedDay.bbtTemp, 2) }}°C
            </p>
          </template>
          <p v-else>{{ t('outsideCycle') }}</p>
          <div v-if="selectedIsPast" class="detail-actions">
            <button type="button" class="btn btn-soft" @click="emit('period', selectedDate)"><AppIcon name="drop" :size="16" />{{ t('action.periodDay') }}</button>
            <button type="button" class="btn btn-ghost" @click="emit('temperature', selectedDate)"><AppIcon name="thermometer" :size="16" />{{ t('action.tempDay') }}</button>
          </div>
        </div>
      </div>

      <div class="home-links">
        <button type="button" class="btn btn-ghost setup-btn" data-control="control-10" @click="emit('setup')"><AppIcon name="edit" :size="17" />{{ t('setup.open') }}</button>
        <button id="shareCycleBtn" type="button" class="btn btn-ghost share-entry" :class="{ hidden: !calcParams }" @click="emit('share')"><AppIcon name="share" :size="17" />{{ t('share.open') }}</button>
        <button v-if="!contraception" id="unpLink" type="button" class="btn btn-ghost" @click="emit('unprotected')"><AppIcon name="shield" :size="17" />{{ t('unp.action') }}</button>
      </div>
      <p id="purposeNote" class="fine-print">{{ modeCopy.note }}</p>
    </div>
  </div>
</template>
