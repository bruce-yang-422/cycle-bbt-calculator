<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { NButton } from 'naive-ui'
import { t } from '../i18n'
import type { useCycle } from '../useCycle'
import EntryField from './EntryField.vue'

const props = defineProps<{ cycle: ReturnType<typeof useCycle> }>()
const emit = defineEmits<{ notice: [message: string]; applied: [] }>()
const { draft, history } = props.cycle
const dialog = ref<HTMLDialogElement | null>(null)
const isOpen = ref(false)
const error = ref<{ field: string; key: string; values?: Record<string, string | number> }>()
let trigger: HTMLElement | null = null

async function open() {
  if (!dialog.value || dialog.value.open) return
  trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  error.value = undefined
  isOpen.value = true
  await nextTick()
  dialog.value.showModal()
  document.getElementById('lastPeriod')?.focus()
}

function close() {
  dialog.value?.close()
}

async function restoreFocus() {
  isOpen.value = false
  await nextTick()
  if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus()
  else document.querySelector<HTMLElement>('.setup-btn')?.focus()
}

function clearError(field: string) {
  if (error.value?.field === field) error.value = undefined
}

function fieldError(field: string) {
  return error.value?.field === field ? t(error.value.key, error.value.values) : undefined
}

async function apply() {
  error.value = undefined
  const result = props.cycle.applySettings()
  if (!result.ok && result.field) {
    error.value = { field: result.field, key: result.key, values: result.values }
    await nextTick()
    document.getElementById(result.field)?.focus()
    return
  }
  if (result.key) emit('notice', t(result.key))
  if (result.ok) {
    emit('applied')
    close()
  }
}

function autoFill() {
  error.value = undefined
  const result = props.cycle.autoFill()
  if (result.key) emit('notice', t(result.key))
}

defineExpose({ open })
</script>

<template>
  <dialog
    id="overlay"
    ref="dialog"
    class="overlay"
    :class="{ open: isOpen }"
    aria-labelledby="sheetTitle"
    data-control="control-25"
    @click.self="close"
    @close="restoreFocus"
  >
    <form class="sheet" novalidate @submit.prevent="apply">
      <NButton class="sheet-close" text :aria-label="t('close')" data-control="control-26" @click="close">×</NButton>
      <div class="sheet-handle" aria-hidden="true"></div>
      <h2 id="sheetTitle" class="sheet-title">{{ t('setup.title') }}</h2>
      <div id="sheetHint" class="hist-hint" :class="{ hidden: history.length < 2 }">
        {{ t('setup.history') }}
        <br>
        <NButton size="small" class="btn-sm-green" data-control="control-27" @click="autoFill">{{ t('setup.autofill') }}</NButton>
      </div>

      <fieldset class="form-group cycle-types" @change="error = undefined">
        <legend class="field-label">{{ t('setup.type') }}</legend>
        <div class="radio-group">
          <label id="rp-regular" class="radio-pill" :class="{ on: draft.type === 'regular' }" data-control="control-28">
            <input v-model="draft.type" type="radio" name="ctype" value="regular">
            {{ t('setup.regular') }}
          </label>
          <label id="rp-irregular" class="radio-pill" :class="{ on: draft.type === 'irregular' }" data-control="control-29">
            <input v-model="draft.type" type="radio" name="ctype" value="irregular">
            {{ t('setup.irregular') }}
          </label>
        </div>
      </fieldset>

      <EntryField id="lastPeriod" v-model="draft.lastPeriod" class="form-group" type="date" :label="t('setup.date')" :error="fieldError('lastPeriod')" @update:model-value="clearError('lastPeriod')" />
      <div id="inp-regular" class="form-group" :class="{ hidden: draft.type !== 'regular' }">
        <EntryField id="cycleLength" v-model="draft.cycleLength" type="number" min="20" max="45" :label="t('setup.length')" :error="fieldError('cycleLength')" @update:model-value="clearError('cycleLength')" />
      </div>
      <div id="inp-irregular" class="form-group two-col" :class="{ hidden: draft.type !== 'irregular' }">
        <EntryField id="minLength" v-model="draft.minLength" type="number" min="18" max="45" :label="t('setup.min')" :error="fieldError('minLength')" @update:model-value="clearError('minLength')" />
        <EntryField id="maxLength" v-model="draft.maxLength" type="number" min="20" max="50" :label="t('setup.max')" :error="fieldError('maxLength')" @update:model-value="clearError('maxLength')" />
      </div>
      <EntryField id="periodLength" v-model="draft.periodLength" class="form-group" type="number" min="2" max="10" :label="t('setup.bleeding')" :error="fieldError('periodLength')" @update:model-value="clearError('periodLength')" />
      <NButton attr-type="submit" class="btn-primary" type="primary" block data-control="control-30">{{ t('setup.calculate') }}</NButton>
    </form>
  </dialog>
</template>
