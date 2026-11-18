<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { formatNumber, language, localizedDate, t } from '../i18n'
import { localISO } from '../cycle'
import { drawBBTChart } from '../chart'
import type { useCycle } from '../useCycle'
import type { AudienceMode } from '../audience'
import AppIcon from './AppIcon.vue'
import EntryField from './EntryField.vue'

const props = defineProps<{ cycle: ReturnType<typeof useCycle>; audience: AudienceMode; active: boolean }>()
const emit = defineEmits<{ notice: [message: string]; changed: [] }>()
const { bbt, bbtAnalysis } = props.cycle
const date = ref(localISO(new Date()))
const temperature = ref('')
const chart = ref<HTMLCanvasElement | null>(null)
const errorField = ref<string>()
const errorKey = ref<string>()
const recordList = computed(() => bbt.value.slice(0, 30))
// The stepper starts from the latest reading, so a typical day needs one or two taps.
const startingPoint = computed(() => (bbt.value[0]?.temp ?? 36.5).toFixed(2))
const dateLabel = (day: string) => localizedDate(new Date(day + 'T00:00:00'))

function draw() {
  if (props.active && chart.value && bbt.value.length) {
    drawBBTChart(chart.value, bbt.value, bbtAnalysis.value, formatNumber, localizedDate)
  }
}

watch([() => props.active, bbt, bbtAnalysis, language], draw, { flush: 'post' })
watch(chart, (canvas, _, onCleanup) => {
  if (!canvas) return
  const observer = new ResizeObserver(draw)
  if (canvas.parentElement) observer.observe(canvas.parentElement)
  onCleanup(() => observer.disconnect())
  draw()
}, { flush: 'post' })

function clearError(field: string) {
  if (errorField.value === field) {
    errorField.value = undefined
    errorKey.value = undefined
  }
}

async function add() {
  errorField.value = undefined
  errorKey.value = undefined
  const result = props.cycle.addBBT(date.value, temperature.value)
  if (!result.ok && result.field) {
    errorField.value = result.field
    errorKey.value = result.key
    await nextTick()
    document.getElementById(result.field)?.focus()
    return
  }
  if (result.ok) {
    temperature.value = ''
    emit('changed')
  }
  if (result.key) emit('notice', t(result.key))
}

function remove(day?: string) {
  if (!day && !window.confirm(t('bbt.confirm'))) return
  const result = day ? props.cycle.deleteBBT(day) : props.cycle.clearBBT()
  if (result.ok) emit('changed')
  if (result.key) emit('notice', t(result.key))
}

defineExpose({
  prefill(day: string) {
    date.value = day
    temperature.value = bbt.value.find(reading => reading.date === day)?.temp.toFixed(2) ?? ''
  },
})
</script>

<template>
  <div class="page-head">
    <h2 class="section-title"><span class="title-icon"><AppIcon name="thermometer" /></span>{{ t('bbt.title') }}</h2>
    <p class="page-intro">{{ t(audience + '.bbt') }} {{ t('bbt.intro') }}</p>
  </div>

  <div class="page-columns">
    <div>
      <form class="card entry-card bbt-entry" novalidate @submit.prevent="add">
        <EntryField
          id="bbtTemp"
          v-model="temperature"
          type="number"
          min="35"
          max="38.5"
          step="0.01"
          unit="°C"
          large
          :step-by="0.05"
          :placeholder="startingPoint"
          :label="t('bbt.temp')"
          :error="errorField === 'bbtTemp' && errorKey ? t(errorKey) : undefined"
          @update:model-value="clearError('bbtTemp')"
        />
        <EntryField id="bbtDate" v-model="date" class="date-field" type="date" :label="t('bbt.date')" :error="errorField === 'bbtDate' && errorKey ? t(errorKey) : undefined" @update:model-value="clearError('bbtDate')" />
        <button type="submit" class="btn btn-primary btn-lg" data-control="control-16">{{ t('bbt.add') }}</button>
      </form>

      <div class="note-card bbt-tip"><AppIcon name="sparkle" :size="16" /><span>{{ t('bbt.tip') }}</span></div>
    </div>

    <div>
      <div id="bbtAnalysis" class="status-banner" :class="[bbtAnalysis?.highTempStartDate ? 'is-good' : 'is-wait', { hidden: !bbt.length }]">
        {{ bbtAnalysis?.highTempStartDate && bbtAnalysis.coverLine != null
          ? [t('bbt.rise', { n: formatNumber(bbtAnalysis.consecutiveHighDays) }), t('bbt.line', { n: formatNumber(bbtAnalysis.coverLine, 2) }), t(audience + '.bbt')].join(' · ')
          : t('bbt.insufficient') }}
      </div>

      <div id="bbtChartCard" class="card chart-card" :class="{ hidden: !bbt.length }">
        <h3 class="card-title">{{ t('bbt.chart') }}</h3>
        <canvas id="bbtCanvas" ref="chart" height="200" role="img" :aria-label="t('bbt.chartAlt')"></canvas>
      </div>

      <div id="bbtListCard" class="card list-card" :class="{ hidden: !bbt.length }">
        <ul id="bbtList" class="record-list">
          <li v-for="reading in recordList" :key="reading.date" class="record">
            <span class="record-date">{{ dateLabel(reading.date) }}</span>
            <span class="record-value">{{ formatNumber(reading.temp, 2) }}°C</span>
            <button type="button" class="icon-btn btn-del" :aria-label="t('delete')" @click="remove(reading.date)"><AppIcon name="close" :size="18" /></button>
          </li>
        </ul>
      </div>
      <div id="bbtEmpty" class="empty-state" :class="{ hidden: bbt.length }">
        <span class="empty-icon"><AppIcon name="thermometer" :size="28" /></span>{{ t('bbt.empty') }}
      </div>
      <button id="bbtClearBtn" type="button" class="btn btn-danger-ghost" :class="{ hidden: !bbt.length }" data-control="control-17" @click="remove()">
        <AppIcon name="trash" :size="17" />{{ t('bbt.clear') }}
      </button>
    </div>
  </div>
</template>
