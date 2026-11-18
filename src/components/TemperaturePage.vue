<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { NButton, NCard } from 'naive-ui'
import { formatNumber, language, localizedDate, t } from '../i18n'
import { localISO } from '../cycle'
import { drawBBTChart } from '../chart'
import type { useCycle } from '../useCycle'
import type { AudienceMode } from '../audience'
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
</script>

<template>
  <div class="section-title"><span aria-hidden="true">🌡️</span>{{ t('bbt.title') }}</div>
  <p class="page-intro">{{ t(audience + '.bbt') }} {{ t('bbt.intro') }}</p>

  <NCard class="layout-11 card" :bordered="false" :content-style="{ padding: 0 }">
    <form class="layout-12 bbt-entry" novalidate @submit.prevent="add">
      <EntryField id="bbtDate" v-model="date" class="layout-13" type="date" :label="t('bbt.date')" :error="errorField === 'bbtDate' && errorKey ? t(errorKey) : undefined" @update:model-value="clearError('bbtDate')" />
      <EntryField id="bbtTemp" v-model="temperature" class="layout-13" type="number" min="35" max="38.5" step="0.01" placeholder="36.50" :label="t('bbt.temp')" :error="errorField === 'bbtTemp' && errorKey ? t(errorKey) : undefined" @update:model-value="clearError('bbtTemp')" />
      <div>
        <NButton attr-type="submit" type="primary" class="layout-14 btn-primary" data-control="control-16">{{ t('bbt.add') }}</NButton>
      </div>
    </form>
  </NCard>

  <div id="bbtAnalysis" class="bbt-analysis" :class="[bbtAnalysis?.highTempStartDate ? 'confirmed' : 'warning', { hidden: !bbt.length }]">
    {{ bbtAnalysis?.highTempStartDate && bbtAnalysis.coverLine != null
      ? [t('bbt.rise', { n: formatNumber(bbtAnalysis.consecutiveHighDays) }), t('bbt.line', { n: formatNumber(bbtAnalysis.coverLine, 2) }), t(audience + '.bbt')].join(' · ')
      : t('bbt.insufficient') }}
  </div>

  <NCard id="bbtChartCard" class="card" :class="{ hidden: !bbt.length }" :bordered="false" :content-style="{ padding: 0 }">
    <div class="bbt-chart-title">{{ t('bbt.chart') }}</div>
    <canvas id="bbtCanvas" ref="chart" height="200" role="img" :aria-label="t('bbt.chartAlt')"></canvas>
  </NCard>

  <div class="bbt-tip">{{ t('bbt.tip') }}</div>

  <NCard id="bbtListCard" class="layout-15 card" :class="{ hidden: !bbt.length }" :bordered="false" :content-style="{ padding: 0 }">
    <ul id="bbtList" class="bbt-list">
      <li v-for="reading in recordList" :key="reading.date" class="bbt-item">
        <div class="d">{{ dateLabel(reading.date) }}</div>
        <div class="tv">{{ formatNumber(reading.temp, 2) }}°C</div>
        <NButton text class="btn-del" :aria-label="t('delete')" @click="remove(reading.date)">×</NButton>
      </li>
    </ul>
  </NCard>
  <div id="bbtEmpty" class="empty-state" :class="{ hidden: bbt.length }">{{ t('bbt.empty') }}</div>
  <NButton id="bbtClearBtn" class="layout-16 btn-outline" :class="{ hidden: !bbt.length }" block data-control="control-17" @click="remove()">{{ t('bbt.clear') }}</NButton>
</template>
