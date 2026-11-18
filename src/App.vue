<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { audienceModes, isAudienceMode, type AudienceMode } from './audience'
import { language, languageNames, setLanguage, supportedLanguages, t } from './i18n'
import { resetAllData } from './storage'
import { useCycle } from './useCycle'
import AppIcon, { type IconName } from './components/AppIcon.vue'
import CalendarPage from './components/CalendarPage.vue'
import CycleSettings from './components/CycleSettings.vue'
import HistoryPage from './components/HistoryPage.vue'
import InstallControls from './components/InstallControls.vue'
import SettingsPage from './components/SettingsPage.vue'
import ShareDialog from './components/ShareDialog.vue'
import TemperaturePage from './components/TemperaturePage.vue'
import UnprotectedDialog from './components/UnprotectedDialog.vue'

const pages = [
  { id: 'calendar', key: 'nav.calendar', icon: 'calendar', desktop: 'control-3', mobile: 'control-21' },
  { id: 'bbt', key: 'nav.bbt', icon: 'thermometer', desktop: 'control-4', mobile: 'control-22' },
  { id: 'history', key: 'nav.history', icon: 'notebook', desktop: 'control-5', mobile: 'control-23' },
  { id: 'emergency', key: 'nav.help', icon: 'settings', desktop: 'control-6', mobile: 'control-24' },
] as const
type Page = (typeof pages)[number]['id']

const modeIcons: Record<AudienceMode, IconName> = { tracking: 'moon', contraception: 'shield', conception: 'heart' }

const cycle = useCycle()
const activePage = ref<Page>('calendar')
const audience = ref<AudienceMode>('contraception')
const audienceDialog = ref<HTMLDialogElement | null>(null)
const mainContent = ref<HTMLElement | null>(null)
const settings = ref<InstanceType<typeof CycleSettings> | null>(null)
const calendar = ref<InstanceType<typeof CalendarPage> | null>(null)
const temperature = ref<InstanceType<typeof TemperaturePage> | null>(null)
const share = ref<InstanceType<typeof ShareDialog> | null>(null)
const unprotectedDialog = ref<InstanceType<typeof UnprotectedDialog> | null>(null)
const toast = ref('')
const toastUndo = ref<(() => void) | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  try {
    const saved = localStorage.getItem('audienceMode')
    if (isAudienceMode(saved)) {
      audience.value = saved
      return
    }
  } catch {
    // First-use setup remains available when storage is blocked.
  }
  audienceDialog.value?.showModal()
})
onUnmounted(() => clearTimeout(toastTimer))
// Mode-specific colour tokens (e.g. a neutral low-risk tone for contraception) key off this attribute.
watchEffect(() => { document.documentElement.dataset.mode = audience.value })

function navigate(page: Page) {
  activePage.value = page
  window.scrollTo({ top: 0 })
}

async function logTemperature(date?: string) {
  navigate('bbt')
  if (date) temperature.value?.prefill(date)
  await nextTick()
  document.getElementById('bbtTemp')?.focus()
}

function notify(message: string, undo?: () => void) {
  toast.value = message
  toastUndo.value = undo ?? null
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
    toastUndo.value = null
  }, undo ? 6000 : 3500)
}

function runUndo() {
  toastUndo.value?.()
  calendar.value?.hideDetails()
  notify(t('updated'))
}

function periodStarted(date?: string) {
  const { result, undo } = cycle.startPeriod(date)
  if (!result.ok && result.key === 'setupFirst') {
    settings.value?.open()
    return
  }
  if (result.ok) calendar.value?.hideDetails()
  if (result.key) notify(t(result.key), undo)
}

function setAudience(mode: AudienceMode) {
  audience.value = mode
  try {
    localStorage.setItem('audienceMode', mode)
  } catch {
    notify(t('error.storage'))
  }
}

function start(mode: AudienceMode) {
  setAudience(mode)
  audienceDialog.value?.close()
  mainContent.value?.focus()
}

function reset() {
  resetAllData({
    confirm: message => window.confirm(message),
    location: window.location,
    notify,
    translate: t,
  })
}
</script>

<template>
  <a class="skip-link" href="#mainContent">{{ t('skip') }}</a>
  <header class="top-bar">
    <div class="brand">
      <img class="brand-logo" src="/images/logo.png" width="34" height="34" alt="">
      <span class="brand-name">{{ t('app.name') }}</span>
    </div>
    <nav class="desk-tabs" :aria-label="t('app.name')">
      <button
        v-for="page in pages"
        :key="page.id"
        type="button"
        class="desk-tab"
        :class="{ active: activePage === page.id }"
        :aria-current="activePage === page.id ? 'page' : undefined"
        :data-control="page.desktop"
        @click="navigate(page.id)"
      >
        <AppIcon :name="page.icon" :size="18" />{{ t(page.key) }}
      </button>
    </nav>
  </header>

  <main id="mainContent" ref="mainContent" class="app-body" tabindex="-1">
    <section id="page-calendar" class="page" :class="{ active: activePage === 'calendar' }">
      <CalendarPage
        ref="calendar"
        :cycle="cycle"
        :audience="audience"
        @setup="settings?.open()"
        @period="periodStarted"
        @unprotected="unprotectedDialog?.open($event)"
        @temperature="logTemperature"
        @share="share?.open()"
      />
    </section>
    <section id="page-bbt" class="page" :class="{ active: activePage === 'bbt' }">
      <TemperaturePage ref="temperature" :cycle="cycle" :audience="audience" :active="activePage === 'bbt'" @notice="notify" @changed="calendar?.hideDetails()" />
    </section>
    <section id="page-history" class="page" :class="{ active: activePage === 'history' }">
      <HistoryPage :cycle="cycle" :audience="audience" @notice="notify" @changed="calendar?.hideDetails()" />
    </section>
    <SettingsPage
      :audience="audience"
      :class="{ active: activePage === 'emergency' }"
      @update:audience="setAudience"
      @reset="reset"
      @storage-error="notify(t('error.storage'))"
      @unprotected="unprotectedDialog?.open()"
    />

    <InstallControls />
  </main>

  <nav class="bottom-nav" :aria-label="t('app.name')">
    <button
      v-for="page in pages"
      :id="'nav-' + page.id"
      :key="page.id"
      type="button"
      class="nav-btn"
      :class="{ active: activePage === page.id }"
      :aria-current="activePage === page.id ? 'page' : undefined"
      :data-control="page.mobile"
      @click="navigate(page.id)"
    >
      <span class="nav-icon"><AppIcon :name="page.icon" /></span>
      <span class="nav-label">{{ t(page.key) }}</span>
    </button>
  </nav>

  <div id="toast" class="toast" :class="{ hidden: !toast }" role="status" aria-live="polite">
    <span>{{ toast }}</span>
    <button v-if="toastUndo" type="button" class="toast-action" @click="runUndo">{{ t('undo') }}</button>
  </div>
  <CycleSettings ref="settings" :cycle="cycle" @notice="notify" @applied="calendar?.hideDetails()" />
  <ShareDialog ref="share" :cycle="cycle" :audience="audience" @notice="notify" />
  <UnprotectedDialog ref="unprotectedDialog" :cycle="cycle" @notice="notify" />

  <dialog
    id="audienceDialog"
    ref="audienceDialog"
    class="modal audience-dialog"
    aria-labelledby="audienceDialogTitle"
    aria-describedby="audienceDialogIntro"
    data-control="control-31"
    @cancel.prevent
  >
    <div class="onboard-lang">
      <AppIcon name="globe" :size="16" />
      <label class="visually-hidden" for="initialLanguage">{{ t('language') }}</label>
      <select id="initialLanguage" class="pill-select" :value="language" data-control="control-32" @change="setLanguage(($event.target as HTMLSelectElement).value)">
        <option v-for="code in supportedLanguages" :key="code" :value="code">{{ languageNames[code] }}</option>
      </select>
    </div>
    <img class="onboard-logo" src="/images/logo.png" width="64" height="64" alt="">
    <h2 id="audienceDialogTitle">{{ t('onboard.title') }}</h2>
    <p id="audienceDialogIntro" class="onboard-intro">{{ t('onboard.intro') }}</p>
    <div class="mode-cards" role="group" :aria-label="t('purpose')" data-control="control-33">
      <button
        v-for="mode in audienceModes"
        :key="mode"
        type="button"
        class="mode-card"
        :class="'mode-' + mode"
        :data-mode="mode"
        @click="start(mode)"
      >
        <span class="mode-icon"><AppIcon :name="modeIcons[mode]" :size="24" /></span>
        <span class="mode-copy">
          <strong>{{ t('mode.' + mode) }}</strong>
          <small>{{ t(mode + '.hint') }}</small>
        </span>
        <AppIcon class="mode-arrow" name="right" :size="18" />
      </button>
    </div>
    <p class="onboard-note"><AppIcon name="lock" :size="14" />{{ t('privacy') }}</p>
  </dialog>
</template>
