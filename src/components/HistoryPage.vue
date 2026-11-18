<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { localISO } from '../cycle'
import { formatNumber, localizedDate, t } from '../i18n'
import type { useCycle } from '../useCycle'
import type { AudienceMode } from '../audience'
import AppIcon from './AppIcon.vue'
import EntryField from './EntryField.vue'

const props = defineProps<{ cycle: ReturnType<typeof useCycle>; audience: AudienceMode }>()
const emit = defineEmits<{ notice: [message: string]; changed: [] }>()
const { history, historyStats } = props.cycle
const date = ref(localISO(new Date()))
const errorKey = ref<string>()
const dateLabel = (day: string) => localizedDate(new Date(day + 'T00:00:00'), { year: 'numeric', month: 'short', day: 'numeric' })

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
  <div class="page-head">
    <h2 class="section-title"><span class="title-icon"><AppIcon name="notebook" /></span>{{ t('nav.history') }}</h2>
    <p class="page-intro">{{ t('history.intro') }} {{ t(audience + '.history') }}</p>
  </div>

  <div class="page-columns">
    <div>
      <form class="card entry-card" novalidate @submit.prevent="add">
        <EntryField id="hDate" v-model="date" type="date" :label="t('history.date')" :error="errorKey ? t(errorKey) : undefined" @update:model-value="errorKey = undefined" />
        <button type="submit" class="btn btn-primary btn-lg" data-control="control-18"><AppIcon name="plus" :size="18" />{{ t('history.add') }}</button>
      </form>

      <div v-if="historyStats" id="histStats" class="status-banner is-good">
        <strong>{{ t('history.stats', { records: formatNumber(history.length), cycles: formatNumber(historyStats.cycles) }) }}</strong>
        <span>{{ t('history.range', { avg: formatNumber(historyStats.avg, 1), min: formatNumber(historyStats.min), max: formatNumber(historyStats.max) }) }}</span>
      </div>
      <div id="histAdvice" class="note-card" :class="{ hidden: !history.length }">
        <AppIcon name="sparkle" :size="16" />
        <span>{{ t(!historyStats ? 'history.wait' : historyStats.cycles === 1 ? 'history.one' : 'history.check') }}</span>
      </div>
    </div>

    <div>
      <div id="histListCard" class="card list-card" :class="{ hidden: !history.length }">
        <ul id="histList" class="record-list timeline">
          <li v-for="entry in history" :key="entry.date" class="record">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="record-main">
              <span class="record-date">{{ dateLabel(entry.date) }}</span>
              <span class="record-sub">{{ entry.cycle != null && entry.nextDate ? t('history.interval', { date: dateLabel(entry.nextDate), n: formatNumber(entry.cycle) }) : t('history.wait') }}</span>
            </span>
            <button type="button" class="icon-btn btn-del" :aria-label="t('delete')" @click="remove(entry.date)"><AppIcon name="close" :size="18" /></button>
          </li>
        </ul>
      </div>
      <div id="histEmpty" class="empty-state" :class="{ hidden: history.length }">
        <span class="empty-icon"><AppIcon name="drop" :size="28" /></span>{{ t('history.empty') }}
      </div>
    </div>
  </div>
</template>
