<script setup lang="ts">
import { t } from '../i18n'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  id: string
  label: string
  type: 'date' | 'number'
  min?: string | number
  max?: string | number
  step?: string
  placeholder?: string
  error?: string
  /** Shows −/+ buttons that move the value by this amount. */
  stepBy?: number
  unit?: string
  large?: boolean
}>()
const model = defineModel<string>({ required: true })

function nudge(direction: 1 | -1) {
  const by = props.stepBy ?? 1
  const digits = (String(by).split('.')[1] ?? '').length
  const base = Number(model.value || props.placeholder || props.min || 0)
  let next = Math.round((base + direction * by) / by) * by
  if (props.min != null) next = Math.max(Number(props.min), next)
  if (props.max != null) next = Math.min(Number(props.max), next)
  model.value = next.toFixed(digits)
}
</script>

<template>
  <div class="field" :class="{ 'field-large': large, 'has-error': error }">
    <label class="field-label" :for="id">{{ label }}</label>
    <div class="field-control" :class="{ stepper: stepBy }">
      <button v-if="stepBy" type="button" class="step-btn" :aria-label="t('step.down')" :aria-controls="id" @click="nudge(-1)"><AppIcon name="minus" :size="20" /></button>
      <input
        :id="id"
        class="field-input"
        :type="type"
        :inputmode="type === 'number' ? (step && step.includes('.') ? 'decimal' : 'numeric') : undefined"
        :value="model"
        :min="min"
        :max="max"
        :step="step"
        :placeholder="placeholder"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? id + 'Error' : undefined"
        @input="model = ($event.target as HTMLInputElement).value"
      >
      <span v-if="unit" class="field-unit" aria-hidden="true">{{ unit }}</span>
      <button v-if="stepBy" type="button" class="step-btn" :aria-label="t('step.up')" :aria-controls="id" @click="nudge(1)"><AppIcon name="plus" :size="20" /></button>
    </div>
    <div v-if="error" :id="id + 'Error'" class="field-error" role="alert">{{ error }}</div>
  </div>
</template>
