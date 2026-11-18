<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { NButton, NCard } from 'naive-ui'
import { audienceAdvice, purposeCopy, type AudienceMode } from '../audience'
import { formatNumber, localizedDate, t } from '../i18n'
import type { DayInfo } from '../cycle'
import type { useCycle } from '../useCycle'

const props = defineProps<{ cycle: ReturnType<typeof useCycle>; audience: AudienceMode }>()
const emit = defineEmits<{ setup: []; temperature: []; save: []; share: [] }>()
const { calcParams, selectedDate, selectedDay, calendarCells, calMonth, calYear, overview, bbtAnalysis } = props.cycle
const details = ref<HTMLElement | null>(null)
const showDetails = ref(false)
const modeCopy = computed(() => purposeCopy(props.audience))
const weekdays = Array.from({ length: 7 }, (_, day) => new Date(2026, 0, 4 + day))
const dateLabel = (date: string) => localizedDate(new Date(date + 'T00:00:00'))
const monthTitle = computed(() => localizedDate(new Date(calYear.value, calMonth.value, 1), { year: 'numeric', month: 'long' }))

function dayLabel(day: DayInfo) {
  if (day.isRecordedStart) return t('phase.recorded')
  return day.status === 'safe' ? modeCopy.value.low : t('phase.' + day.status)
}

const signal = computed(() => {
  const day = selectedDay.value
  if (!day) return null
  if (day.status === 'period') return { color: 'period', caption: day.isRecordedStart ? 'recorded' : 'bleedingEstimate', value: 'short.period' }
  if (day.isOvDay) return { color: 'red', caption: 'estimated', value: 'short.ovulation' }
  if (day.isFertileWindow) return { color: 'orange', caption: 'estimated', value: 'short.fertile' }
  return props.audience === 'contraception'
    ? { color: 'green', caption: 'risk', value: 'short.lower' }
    : { color: 'green', caption: 'estimated', value: 'short.outside' }
})

const bbtSummary = computed(() => {
  if (!overview.value) return t('bbt.empty')
  const result = bbtAnalysis.value
  return result?.highTempStartDate ? t('bbt.rise', { n: formatNumber(result.consecutiveHighDays) }) : t('noData')
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
  details.value?.scrollIntoView({ block: 'nearest' })
}

function cellLabel(date: string, day: DayInfo | undefined, isToday: boolean) {
  const longDate = localizedDate(new Date(date + 'T00:00:00'), { year: 'numeric', month: 'long', day: 'numeric' })
  return [longDate, ...(isToday ? [t('today')] : []), day ? dayLabel(day) : t('noData')].join(' · ')
}

function statusClass(day?: DayInfo) {
  if (day?.isBBTOv) return 'bbt-ov'
  if (day?.isBBTHi) return 'bbt-hi'
  return day?.status
}

defineExpose({ hideDetails: () => { showDetails.value = false } })
</script>

<template>
  <div v-if="!calcParams" id="startCard" class="start-card">
    <h2>{{ t('setup.title') }}</h2>
    <p>{{ t('setup.intro') }}</p>
    <NButton type="primary" size="large" data-control="control-9" @click="emit('setup')">{{ t('setup.start') }}</NButton>
  </div>

  <div class="cal-desktop">
    <div>
      <div class="page-hd">
        <div class="page-hd-title">{{ t('nav.calendar') }}</div>
        <NButton class="setup-btn" secondary type="primary" data-control="control-10" @click="emit('setup')">{{ t('setup.open') }}</NButton>
      </div>

      <div id="stmCard" class="stm-card" :class="signal?.color ?? 'grey'" aria-live="polite">
        <div class="stm-signal">
          <span id="signalLabel" class="signal-label">
            <template v-if="signal">
              <span class="signal-caption">{{ t(signal.caption) }}</span>
              <strong>{{ t(signal.value) }}</strong>
            </template>
            <template v-else>{{ t(calcParams ? 'noData' : 'notSet') }}</template>
          </span>
        </div>
        <div class="stm-copy">
          <div id="stmDate" class="stm-date">
            {{ dateLabel(selectedDate) }}<template v-if="selectedDay"> · {{ t('day', { n: formatNumber(selectedDay.dayNum) }) }}</template>
          </div>
          <div class="stm-hd"><span id="stmTitle" class="stm-title">{{ selectedDay ? dayLabel(selectedDay) : t('noData') }}</span></div>
          <div id="stmRows" class="stm-rows">
            {{ selectedDay ? audienceAdvice(audience, selectedDay) : t(calcParams ? 'outsideCycle' : 'setupFirst') }}
          </div>
        </div>
      </div>

      <NCard class="layout-1 card" :bordered="false" :content-style="{ padding: 0 }">
        <div class="cal-nav">
          <NButton class="cal-nav-btn" quaternary circle :aria-label="t('prevMonth')" data-control="control-11" @click="moveMonth(-1)">‹</NButton>
          <div id="calMonthTitle" class="cal-month">{{ monthTitle }}</div>
          <NButton class="cal-nav-btn" quaternary circle :aria-label="t('nextMonth')" data-control="control-12" @click="moveMonth(1)">›</NButton>
          <NButton class="today-btn" data-control="control-13" @click="goToday">{{ t('today') }}</NButton>
        </div>
        <div class="cal-wds">
          <div v-for="weekday in weekdays" :key="weekday.getDay()" class="cal-wd">{{ localizedDate(weekday, { weekday: 'short' }) }}</div>
        </div>
        <div id="calGrid" class="cal-grid">
          <template v-for="cell in calendarCells" :key="cell.iso">
            <button
              v-if="cell.isCurrentMonth"
              type="button"
              class="cal-cell"
              :class="[statusClass(cell.info), { today: cell.isToday, sel: cell.iso === selectedDate }]"
              :data-date="cell.iso"
              :aria-label="cellLabel(cell.iso, cell.info, cell.isToday)"
              :aria-current="cell.isToday ? 'date' : undefined"
              :aria-pressed="cell.iso === selectedDate"
              @click="showDay(cell.iso)"
            >
              {{ formatNumber(cell.day) }}
              <span v-if="cell.info?.bbtTemp != null" class="cell-bbt-dot"></span>
            </button>
            <div v-else class="cal-cell other">{{ formatNumber(cell.day) }}</div>
          </template>
        </div>
        <div class="legend">
          <div class="leg-item"><span class="layout-2 leg-dot"></span>{{ t('phase.period') }}</div>
          <div class="leg-item"><span class="layout-3 leg-dot"></span>{{ t('phase.fertile') }}</div>
          <div class="leg-item"><span class="layout-4 leg-dot"></span>{{ t('phase.ovulation') }}</div>
          <div class="leg-item"><span class="layout-5 leg-dot"></span><span id="lowRiskLegend">{{ modeCopy.low }}</span></div>
          <div class="leg-item"><span class="layout-6 leg-dot"></span>{{ t('bbt.legend') }}</div>
        </div>
      </NCard>

      <div
        id="detailPanel"
        ref="details"
        class="detail-panel"
        :class="[{ hidden: !showDetails }, selectedDay ? 'is-' + (selectedDay.isBBTHi ? 'bbt' : selectedDay.status) : undefined]"
        aria-live="polite"
      >
        <template v-if="selectedDay">
          <strong>{{ dateLabel(selectedDate) }} · {{ t('day', { n: formatNumber(selectedDay.dayNum) }) }} · {{ dayLabel(selectedDay) }}</strong>
          <div>{{ t(selectedDay.isRecordedStart ? 'phase.recorded' : 'basis') }}</div>
          <div class="audience-advice">{{ audienceAdvice(audience, selectedDay) }}</div>
          <div v-if="selectedDay.bbtTemp != null">{{ t('bbt.temp') }}: {{ formatNumber(selectedDay.bbtTemp, 2) }}</div>
        </template>
        <template v-else>{{ t('outsideCycle') }}</template>
      </div>

      <NButton id="saveCycleBtn" class="btn-outline" :class="{ hidden: !calcParams }" data-control="control-14" block @click="emit('save')">{{ t('saveCycle') }}</NButton>
      <NButton id="shareCycleBtn" class="btn-outline share-entry" :class="{ hidden: !calcParams }" block @click="emit('share')">{{ t('share.open') }}</NButton>
    </div>

    <div>
      <div class="summary-title">{{ t('summary') }}</div>
      <div id="statusCards" class="status-cards">
        <div class="status-card ov">
          <div class="sc-icon" aria-hidden="true">🔮</div>
          <div class="sc-label">{{ t('phase.ovulation') }}</div>
          <div id="scOvulation" class="sc-value">{{ overview ? (overview.ovulationDate ? dateLabel(overview.ovulationDate) : t('setup.irregular')) : '—' }}</div>
          <div id="scOvulationSub" class="sc-sub">{{ t(overview ? 'basis' : 'setupFirst') }}</div>
        </div>
        <div class="status-card fer">
          <div class="sc-icon" aria-hidden="true">🔥</div>
          <div class="sc-label">{{ t('phase.fertile') }}</div>
          <div id="scFertile" class="sc-value">{{ overview ? dateLabel(overview.fertileStartDate) + ' – ' + dateLabel(overview.fertileEndDate) : '—' }}</div>
          <div id="scFertileSub" class="sc-sub">{{ t(audience === 'conception' ? 'conception.fertile' : audience === 'tracking' ? 'basis' : 'contraception.high') }}</div>
        </div>
        <div class="status-card saf">
          <div class="sc-icon" aria-hidden="true">🛡</div>
          <div class="sc-label">{{ modeCopy.low }}</div>
          <div id="scSafe" class="sc-value">{{ overview ? t('fromDate', { date: dateLabel(overview.lowStartDate) }) : '—' }}</div>
          <div id="scSafeSub" class="sc-sub">{{ t(audience === 'contraception' ? 'contraception.note' : 'basis') }}</div>
        </div>
      </div>

      <div class="layout-7 card-sm">
        <div class="layout-8" aria-hidden="true">🌡️</div>
        <div>
          <div class="sc-label">{{ t('bbt.reference') }}</div>
          <div id="scBBT" class="layout-9">{{ bbtSummary }}</div>
          <div id="scBBTSub" class="sc-sub">{{ overview ? t('bbt.count', { n: formatNumber(overview.bbtCount) }) : '' }}</div>
        </div>
      </div>

      <NButton class="btn-outline quick-bbt" block data-control="control-15" @click="emit('temperature')">{{ t('bbt.quick') }}</NButton>
      <div class="layout-7 card-sm">
        <div class="layout-8" aria-hidden="true">📅</div>
        <div>
          <div class="sc-label">{{ t('phase.next') }}</div>
          <div id="scNextPeriod" class="layout-10">{{ overview ? dateLabel(overview.nextPeriodDate) : '—' }}</div>
          <div id="scNextPeriodSub" class="sc-sub">
            {{ overview
              ? t(overview.daysUntilNext > 0 ? 'dueIn' : overview.daysUntilNext === 0 ? 'dueToday' : 'pastDue', { n: formatNumber(Math.abs(overview.daysUntilNext)) })
              : t('setupFirst') }}
          </div>
        </div>
      </div>
      <div id="purposeNote" class="disclaimer-box">{{ modeCopy.note }}</div>
    </div>
  </div>
</template>
