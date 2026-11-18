<script setup lang="ts">
defineProps<{
  id: string
  label: string
  type: 'date' | 'number'
  min?: string | number
  max?: string | number
  step?: string
  placeholder?: string
  error?: string
}>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div>
    <label class="field-label" :for="id">{{ label }}</label>
    <input
      :id="id"
      class="field-input"
      :type="type"
      :value="model"
      :min="min"
      :max="max"
      :step="step"
      :placeholder="placeholder"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? id + 'Error' : undefined"
      @input="model = ($event.target as HTMLInputElement).value"
    >
    <div v-if="error" :id="id + 'Error'" class="field-error" role="alert">{{ error }}</div>
  </div>
</template>
