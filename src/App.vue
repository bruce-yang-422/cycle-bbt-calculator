<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { NButton, NConfigProvider, type GlobalThemeOverrides } from 'naive-ui'
import { audienceModes, isAudienceMode, type AudienceMode } from './audience'
import { language, languageNames, setLanguage, supportedLanguages, t } from './i18n'
import { resetAllData } from './storage'
import { useCycle, type ActionResult } from './useCycle'
import CalendarPage from './components/CalendarPage.vue'
import CycleSettings from './components/CycleSettings.vue'
import HistoryPage from './components/HistoryPage.vue'
import InstallControls from './components/InstallControls.vue'
import SettingsPage from './components/SettingsPage.vue'
import ShareDialog from './components/ShareDialog.vue'
import TemperaturePage from './components/TemperaturePage.vue'

const pages = [
  { id: 'calendar', key: 'nav.calendar', icon: '📅', desktop: 'control-3', mobile: 'control-21' },
  { id: 'bbt', key: 'nav.bbt', icon: '🌡️', desktop: 'control-4', mobile: 'control-22' },
  { id: 'history', key: 'nav.history', icon: '📋', desktop: 'control-5', mobile: 'control-23' },
  { id: 'emergency', key: 'nav.help', icon: '⚙️', desktop: 'control-6', mobile: 'control-24' },
] as const
type Page = (typeof pages)[number]['id']

const theme: GlobalThemeOverrides = {
  common: {
    primaryColor: '#b94765',
    primaryColorHover: '#a83856',
    primaryColorPressed: '#922b46',
    primaryColorSuppl: '#a83856',
    textColorBase: '#382e35',
    borderRadius: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Noto Sans TC", sans-serif',
  },
}
const cycle = useCycle()
const activePage = ref<Page>('calendar')
const audience = ref<AudienceMode>('contraception')
const initialAudience = ref<AudienceMode | ''>('')
const audienceDialog = ref<HTMLDialogElement | null>(null)
const mainContent = ref<HTMLElement | null>(null)
const settings = ref<InstanceType<typeof CycleSettings> | null>(null)
const calendar = ref<InstanceType<typeof CalendarPage> | null>(null)
const share = ref<InstanceType<typeof ShareDialog> | null>(null)
const toast = ref('')
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

function navigate(page: Page) {
  activePage.value = page
  window.scrollTo({ top: 0 })
}

async function quickTemperature() {
  navigate('bbt')
  await nextTick()
  document.getElementById('bbtTemp')?.focus()
}

function notify(message: string) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3500)
}

function resultNotice(result: ActionResult) {
  if (result.key) notify(t(result.key))
  if (result.ok) calendar.value?.hideDetails()
}

function setAudience(mode: AudienceMode) {
  audience.value = mode
  try {
    localStorage.setItem('audienceMode', mode)
  } catch {
    notify(t('error.storage'))
  }
}

function start() {
  if (!initialAudience.value) return
  setAudience(initialAudience.value)
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
  <NConfigProvider :theme-overrides="theme">
    <a class="skip-link" href="#mainContent">{{ t('skip') }}</a>
    <header class="desk-header">
      <div class="desk-logo">
        <img class="desk-logo-icon" src="/images/logo.png" width="32" height="32" alt="">
        {{ t('app.name') }}
      </div>
      <nav class="desk-tabs">
        <button
          v-for="page in pages"
          :key="page.id"
          type="button"
          class="desk-tab"
          :class="{ active: activePage === page.id }"
          :aria-current="activePage === page.id ? 'page' : undefined"
          :data-control="page.desktop"
          @click="navigate(page.id)"
        >{{ t(page.key) }}</button>
      </nav>
    </header>

    <main id="mainContent" ref="mainContent" class="app-body" tabindex="-1">
      <div class="welcome">
        <div>
          <div class="eyebrow">CYCLE &amp; BODY TEMPERATURE</div>
          <h1>{{ t('app.title') }}</h1>
          <p>{{ t('app.subtitle') }}</p>
        </div>
      </div>

      <section id="page-calendar" class="page" :class="{ active: activePage === 'calendar' }">
        <CalendarPage
          ref="calendar"
          :cycle="cycle"
          :audience="audience"
          @setup="settings?.open()"
          @save="resultNotice(cycle.saveCurrentCycle())"
          @temperature="quickTemperature"
          @share="share?.open()"
        />
      </section>
      <section id="page-bbt" class="page" :class="{ active: activePage === 'bbt' }">
        <TemperaturePage :cycle="cycle" :audience="audience" :active="activePage === 'bbt'" @notice="notify" @changed="calendar?.hideDetails()" />
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
      />

      <InstallControls />
    </main>

    <nav class="bottom-nav">
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
        <span class="nav-icon" aria-hidden="true">{{ page.icon }}</span>{{ t(page.key) }}
      </button>
    </nav>

    <div id="toast" class="toast" :class="{ hidden: !toast }" role="status" aria-live="polite">{{ toast }}</div>
    <CycleSettings ref="settings" :cycle="cycle" @notice="notify" @applied="calendar?.hideDetails()" />
    <ShareDialog ref="share" :cycle="cycle" :audience="audience" @notice="notify" />

    <dialog
      id="audienceDialog"
      ref="audienceDialog"
      class="audience-dialog"
      aria-labelledby="audienceDialogTitle"
      aria-describedby="audienceDialogIntro"
    >
      <form data-control="control-31" @submit.prevent="start">
        <label for="initialLanguage">{{ t('language') }}</label>
        <select id="initialLanguage" class="audience-select language-select" :value="language" data-control="control-32" @change="setLanguage(($event.target as HTMLSelectElement).value)">
          <option v-for="code in supportedLanguages" :key="code" :value="code">{{ languageNames[code] }}</option>
        </select>

        <h2 id="audienceDialogTitle">{{ t('onboard.title') }}</h2>
        <p id="audienceDialogIntro">{{ t('onboard.intro') }}</p>
        <label class="field-label" for="initialAudience">{{ t('purpose') }}</label>
        <select id="initialAudience" v-model="initialAudience" class="audience-select" required data-control="control-33">
          <option value="" disabled>{{ t('onboard.choose') }}</option>
          <option v-for="mode in audienceModes" :key="mode" :value="mode">{{ t('mode.' + mode) }}</option>
        </select>
        <p id="initialAudienceHint" class="purpose-preview" aria-live="polite">{{ t(initialAudience ? initialAudience + '.hint' : 'onboard.note') }}</p>
        <NButton class="btn-primary" attr-type="submit" type="primary" block>{{ t('onboard.save') }}</NButton>
      </form>
    </dialog>
  </NConfigProvider>
</template>
