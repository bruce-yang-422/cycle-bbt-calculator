<script setup lang="ts">
import { t } from '../i18n'
import { setTheme, themeMode, themeModes } from '../theme'
import AppIcon, { type IconName } from './AppIcon.vue'

const emit = defineEmits<{ 'storage-error': [] }>()
const icons: Record<(typeof themeModes)[number], IconName> = { light: 'sun', dark: 'moon', system: 'monitor' }

function choose(mode: (typeof themeModes)[number]) {
  if (!setTheme(mode)) emit('storage-error')
}
</script>

<template>
  <div class="theme-toggle" role="group" :aria-label="t('theme.label')">
    <button
      v-for="mode in themeModes"
      :id="'theme-' + mode"
      :key="mode"
      type="button"
      class="theme-btn"
      :class="{ on: themeMode === mode }"
      :aria-pressed="themeMode === mode"
      :aria-label="t('theme.' + mode)"
      :title="t('theme.' + mode)"
      @click="choose(mode)"
    >
      <AppIcon :name="icons[mode]" :size="17" />
    </button>
  </div>
</template>
