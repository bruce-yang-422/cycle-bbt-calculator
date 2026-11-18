<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { NButton, NCard } from 'naive-ui'
import { localISO } from '../cycle'
import { formatNumber, localizedDate, t } from '../i18n'
import type { useCycle } from '../useCycle'
import type { AudienceMode } from '../audience'
import EntryField from './EntryField.vue'

const props = defineProps<{ cycle: ReturnType<typeof useCycle>; audience: AudienceMode }>()
const emit = defineEmits<{ notice: [message: string]; changed: [] }>()
const { history, historyStats } = props.cycle
const date = ref(localISO(new Date()))
const errorKey = ref<string>()
const dateLabel = (day: string) => localizedDate(new Date(day + 'T00:00:00'))

async function add() {
  errorKey.value = undefined
  const result = props.cycle.addHistory(date.value)
  if (!result.ok && result.field) {
    errorKey.value = result.key
    await nextTick()
    document.getElementById(result.field)?.focus()
    return
  }
  if (result.ok) emit('changed')
  if (result.key) emit('notice', t(result.key))
}

function remove(day: string) {
  const result = props.cycle.deleteHistory(day)
  if (result.ok) emit('changed')
  if (result.key) emit('notice', t(result.key))
}
</script>

<template>
  <div class="section-title"><span aria-hidden="true">📋</span>{{ t('nav.history') }}</div>
  <p class="page-intro">{{ t('history.intro') }} {{ t(audience + '.history') }}</p>
  <NCard class="layout-11 card" :bordered="false" :content-style="{ padding: 0 }">
    <form novalidate @submit.prevent="add">
      <EntryField id="hDate" v-model="date" type="date" :label="t('history.date')" :error="errorKey ? t(errorKey) : undefined" @update:model-value="errorKey = undefined" />
      <NButton class="layout-17 btn-primary" attr-type="submit" type="primary" block data-control="control-18">{{ t('history.add') }}</NButton>
    </form>
  </NCard>

  <div id="histStats" class="hist-stats" :class="{ hidden: !historyStats }">
    <template v-if="historyStats">
      {{ t('history.stats', { records: formatNumber(history.length), cycles: formatNumber(historyStats.cycles) }) }} ·
      {{ t('history.range', { avg: formatNumber(historyStats.avg, 1), min: formatNumber(historyStats.min), max: formatNumber(historyStats.max) }) }}
    </template>
  </div>
  <div id="histAdvice" class="hist-advice" :class="{ hidden: !history.length }">
    {{ t(!historyStats ? 'history.wait' : historyStats.cycles === 1 ? 'history.one' : 'history.check') }}
  </div>

  <NCard id="histListCard" class="layout-15 card" :class="{ hidden: !history.length }" :bordered="false" :content-style="{ padding: 0 }">
    <ul id="histList" class="hist-list">
      <li v-for="entry in history" :key="entry.date" class="hist-item">
        <div>
          <div class="hd">{{ dateLabel(entry.date) }}</div>
          <div class="hc">{{ entry.cycle != null && entry.nextDate ? t('history.interval', { date: dateLabel(entry.nextDate), n: formatNumber(entry.cycle) }) : t('history.wait') }}</div>
        </div>
        <NButton class="btn-del" text :aria-label="t('delete')" @click="remove(entry.date)">×</NButton>
      </li>
    </ul>
  </NCard>
  <div id="histEmpty" class="empty-state" :class="{ hidden: history.length }">{{ t('history.empty') }}</div>
</template>
