<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { localizedDate, t, type TranslationKey } from '../i18n'
import AppIcon from './AppIcon.vue'

export type InfoPage = 'about' | 'privacy'

const repo = 'https://github.com/bruce-yang-422/cycle-bbt-calculator'
/** Bump when the privacy policy text changes in substance. */
const policyDate = '2026-11-18'
const version = __APP_VERSION__
const buildDate = __BUILD_DATE__
const dialogs = { about: ref<HTMLDialogElement | null>(null), privacy: ref<HTMLDialogElement | null>(null) }
const aboutDialog = dialogs.about
const privacyDialog = dialogs.privacy
const longDate = (iso: string) => localizedDate(new Date(`${iso}T00:00:00`), { year: 'numeric', month: 'long', day: 'numeric' })

const badges: Array<[TranslationKey, 'sparkle' | 'lock' | 'shield' | 'download' | 'globe']> = [
  ['about.free', 'sparkle'],
  ['about.noAccount', 'shield'],
  ['about.local', 'lock'],
  ['about.offline', 'download'],
  ['about.open', 'globe'],
]
const sections: Array<[TranslationKey, TranslationKey]> = [
  ['privacy.dataTitle', 'privacy.data'],
  ['privacy.notTitle', 'privacy.not'],
  ['privacy.thirdTitle', 'privacy.third'],
  ['privacy.regionTitle', 'privacy.region'],
  ['privacy.shareTitle', 'privacy.share'],
  ['privacy.controlTitle', 'privacy.control'],
  ['privacy.securityTitle', 'privacy.security'],
  ['privacy.changesTitle', 'privacy.changes'],
  ['privacy.contactTitle', 'privacy.contact'],
]

async function open(page: InfoPage) {
  const dialog = dialogs[page].value
  if (!dialog || dialog.open) return
  // A shareable address (…/#privacy) that opens straight to this page.
  if (location.hash !== '#' + page) history.replaceState(null, '', '#' + page)
  dialog.showModal()
  await nextTick()
  dialog.scrollTop = 0
}

function closed(page: InfoPage) {
  if (location.hash === '#' + page) history.replaceState(null, '', location.pathname + location.search)
}

function fromHash() {
  const page = location.hash.slice(1)
  if (page === 'about' || page === 'privacy') void open(page)
}

onMounted(() => {
  fromHash()
  window.addEventListener('hashchange', fromHash)
})
onUnmounted(() => window.removeEventListener('hashchange', fromHash))

defineExpose({ open })
</script>

<template>
  <dialog id="aboutDialog" ref="aboutDialog" class="modal info-dialog" aria-labelledby="aboutTitle" @click.self="aboutDialog?.close()" @close="closed('about')">
    <div class="info-body">
      <div class="modal-head">
        <span></span>
        <button type="button" class="icon-btn" :aria-label="t('close')" @click="aboutDialog?.close()"><AppIcon name="close" /></button>
      </div>
      <div class="about-hero">
        <img class="about-logo" src="/images/logo-cycle.svg" width="72" height="72" alt="">
        <h2 id="aboutTitle">{{ t('app.name') }}</h2>
        <p class="about-tagline">{{ t('app.subtitle') }}</p>
        <p id="aboutVersion" class="about-version">{{ t('about.version', { version, date: longDate(buildDate) }) }}</p>
      </div>

      <p class="info-text">{{ t('about.what') }}</p>
      <ul class="about-badges">
        <li v-for="[key, icon] in badges" :key="key"><AppIcon :name="icon" :size="14" />{{ t(key) }}</li>
      </ul>
      <p class="note-card about-disclaimer"><AppIcon name="sparkle" :size="16" /><span>{{ t('help.note') }}</span></p>

      <nav class="info-links" :aria-label="t('about.title')">
        <button id="aboutPrivacy" type="button" class="info-link" @click="aboutDialog?.close(); open('privacy')">
          <AppIcon name="lock" :size="18" /><span>{{ t('privacy.title') }}</span><AppIcon class="row-arrow" name="right" :size="16" />
        </button>
        <a class="info-link" :href="repo" target="_blank" rel="noopener noreferrer">
          <AppIcon name="globe" :size="18" /><span>{{ t('about.source') }}</span><AppIcon class="row-arrow" name="right" :size="16" />
        </a>
        <a class="info-link" :href="repo + '/issues'" target="_blank" rel="noopener noreferrer">
          <AppIcon name="edit" :size="18" /><span>{{ t('about.issue') }}</span><AppIcon class="row-arrow" name="right" :size="16" />
        </a>
      </nav>

      <p class="fine-print">{{ t('about.credits') }}</p>
      <p class="fine-print about-copy">© 2026 Bruce Yang · <a :href="repo + '/blob/main/LICENSE'" target="_blank" rel="noopener noreferrer">MIT License</a></p>
    </div>
  </dialog>

  <dialog id="privacyDialog" ref="privacyDialog" class="modal info-dialog" aria-labelledby="privacyTitle" @click.self="privacyDialog?.close()" @close="closed('privacy')">
    <div class="info-body">
      <div class="modal-head">
        <h2 id="privacyTitle" class="modal-title">{{ t('privacy.title') }}</h2>
        <button type="button" class="icon-btn" :aria-label="t('close')" @click="privacyDialog?.close()"><AppIcon name="close" /></button>
      </div>
      <p class="fine-print privacy-date">{{ t('privacy.updated', { date: longDate(policyDate) }) }}</p>
      <p class="status-banner is-good privacy-summary"><span><AppIcon name="lock" :size="16" /></span><span>{{ t('privacy.summary') }}</span></p>
      <section v-for="[title, body] in sections" :key="title" class="privacy-section">
        <h3>{{ t(title) }}</h3>
        <p class="info-text">{{ t(body) }}</p>
      </section>
      <a class="btn btn-ghost btn-block" :href="repo + '/issues'" target="_blank" rel="noopener noreferrer">{{ t('about.issue') }}</a>
    </div>
  </dialog>
</template>
