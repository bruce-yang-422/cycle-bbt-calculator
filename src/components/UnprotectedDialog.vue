<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { dOff, localISO } from '../cycle'
import { localizedDate, t } from '../i18n'
import { unprotectedPlan } from '../unprotected'
import type { useCycle } from '../useCycle'
import AppIcon from './AppIcon.vue'
import EntryField from './EntryField.vue'

const props = defineProps<{ cycle: ReturnType<typeof useCycle> }>()
const emit = defineEmits<{ notice: [message: string] }>()
const { dayMap, overview, today, unprotected } = props.cycle
const dialog = ref<HTMLDialogElement | null>(null)
const date = ref(today.value)
const errorKey = ref<string>()
const yesterday = computed(() => localISO(dOff(new Date(`${today.value}T00:00:00`), -1)))
const dateLabel = (day: string) => localizedDate(new Date(`${day}T00:00:00`))
const recorded = computed(() => unprotected.value.includes(date.value))
const plan = computed(() => date.value && date.value <= today.value
  ? unprotectedPlan(date.value, today.value, dayMap.value, overview.value?.nextPeriodDate)
  : null)
const riskKey = computed(() => plan.value && ({ high: 'unp.riskHigh', low: 'unp.riskLow', unknown: 'unp.riskUnknown' } as const)[plan.value.risk])

async function open(day?: string) {
  if (!dialog.value || dialog.value.open) return
  date.value = day ?? localISO(new Date())
  errorKey.value = undefined
  dialog.value.showModal()
  await nextTick()
  dialog.value.querySelector<HTMLElement>('.chip')?.focus()
}

function pick(day: string) {
  date.value = day
  errorKey.value = undefined
}

function save() {
  const result = props.cycle.addUnprotected(date.value)
  if (!result.ok) {
    errorKey.value = result.key
    return
  }
  if (result.key) emit('notice', t(result.key))
  dialog.value?.close()
}

function remove() {
  const result = props.cycle.deleteUnprotected(date.value)
  if (result.key) emit('notice', t(result.key))
  dialog.value?.close()
}

defineExpose({ open })
</script>

<template>
  <dialog id="unprotectedDialog" ref="dialog" class="modal unp-dialog" aria-labelledby="unpTitle" @click.self="dialog?.close()">
    <div class="unp-body">
      <div class="modal-head">
        <h2 id="unpTitle" class="modal-title">{{ t('unp.title') }}</h2>
        <button type="button" class="icon-btn" :aria-label="t('close')" @click="dialog?.close()"><AppIcon name="close" /></button>
      </div>

      <div class="unp-when">
        <div class="unp-chips" role="group" :aria-label="t('unp.when')">
          <button type="button" class="chip" :class="{ 'chip-accent': date === today }" :aria-pressed="date === today" @click="pick(today)">{{ t('today') }}</button>
          <button type="button" class="chip" :class="{ 'chip-accent': date === yesterday }" :aria-pressed="date === yesterday" @click="pick(yesterday)">{{ t('unp.yesterday') }}</button>
        </div>
        <EntryField id="uDate" v-model="date" type="date" :label="t('unp.when')" :error="errorKey ? t(errorKey) : undefined" @update:model-value="errorKey = undefined" />
      </div>

      <template v-if="plan">
        <p id="unpRisk" class="status-banner" :class="plan.risk === 'high' ? 'is-alert' : 'is-wait'">{{ t(riskKey!) }}</p>

        <section class="unp-section" aria-labelledby="unpEcTitle">
          <h3 id="unpEcTitle" class="card-title">{{ t('unp.ecTitle') }}</h3>
          <ul class="unp-methods">
            <li v-for="method in plan.methods" :key="method.key" :class="'is-' + method.state">
              <span class="unp-method">{{ t(method.key) }}</span>
              <span class="unp-deadline">
                {{ method.state === 'expired' ? t('unp.expired') : method.state === 'last' ? t('unp.lastDay') : t('unp.until', { date: dateLabel(method.until) }) }}
              </span>
            </li>
          </ul>
          <p class="fine-print">{{ t('unp.ecNote') }}</p>
        </section>

        <section class="unp-section" aria-labelledby="unpTestTitle">
          <h3 id="unpTestTitle" class="card-title">{{ t('unp.testTitle') }}</h3>
          <ul class="unp-tests">
            <li v-if="plan.periodDate">{{ t('unp.testPeriod', { date: dateLabel(plan.periodDate) }) }}</li>
            <li>{{ t('unp.test21', { date: dateLabel(plan.testDate) }) }}</li>
          </ul>
        </section>
      </template>

      <button v-if="!recorded" id="unpSave" type="button" class="btn btn-primary btn-lg" @click="save">{{ t('unp.save') }}</button>
      <button v-else id="unpRemove" type="button" class="btn btn-danger-ghost" @click="remove"><AppIcon name="trash" :size="17" />{{ t('unp.remove') }}</button>
    </div>
  </dialog>
</template>
