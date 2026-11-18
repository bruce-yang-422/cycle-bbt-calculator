<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'
import { audienceModes, isAudienceMode, type AudienceMode } from '../audience'
import { language, languageNames, setLanguage, supportedLanguages, t, type TranslationKey } from '../i18n'
import { guideEmphasis } from '../locales/guide-emphasis'
import { detectRegion, isTaiwanRegion, regionChecking, regionPreference, regionStatus, setRegion } from '../region'

const props = defineProps<{ audience: AudienceMode }>()
const emit = defineEmits<{
  'update:audience': [mode: AudienceMode]
  reset: []
  'storage-error': []
  unprotected: []
}>()

const sources = {
  pain: 'https://www.nhs.uk/symptoms/period-pain/',
  irregular: 'https://www.nhs.uk/symptoms/irregular-periods/',
  heavy: 'https://www.nhs.uk/conditions/heavy-periods/',
  ec: 'https://www.who.int/news-room/fact-sheets/detail/emergency-contraception',
  test: 'https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/',
  options: 'https://www.nhs.uk/contraception/methods-of-contraception/',
  signals: 'https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/',
  partner: 'https://www.nhs.uk/contraception/methods-of-contraception/vasectomy-male-sterilisation/what-is-it/',
  trying: 'https://www.nhs.uk/pregnancy/trying-for-a-baby/trying-to-get-pregnant/',
  urgent: 'https://www.nhs.uk/symptoms/vaginal-bleeding-between-periods-or-after-sex/',
}

type GuideEntry = [heading: TranslationKey, body: TranslationKey, source?: keyof typeof sources]
type GuidePlan = { title: TranslationKey; cards: GuideEntry[]; faq: GuideEntry[] }

const plans: Record<AudienceMode, GuidePlan> = {
  tracking: {
    title: 'guide.trackingTitle',
    cards: [
      ['guide.painTitle', 'guide.pain', 'pain'],
      ['guide.irregularTitle', 'guide.irregular', 'irregular'],
      ['guide.urgentTitle', 'guide.urgent', 'urgent'],
    ],
    faq: [
      ['guide.heavyTitle', 'guide.heavy', 'heavy'],
      ['help.testTitle', 'help.test', 'test'],
      ['guide.recordTitle', 'guide.record'],
      ['guide.estimateQuestion', 'tracking.note'],
    ],
  },
  contraception: {
    title: 'guide.title',
    cards: [
      ['help.ecTitle', 'help.ec', 'ec'],
      ['help.testTitle', 'help.test', 'test'],
    ],
    faq: [
      ['guide.ecTitle', 'guide.ec', 'ec'],
      ['guide.optionsTitle', 'guide.options', 'options'],
      ['guide.signalsTitle', 'guide.signals', 'signals'],
      ['guide.partnerTitle', 'guide.partner', 'partner'],
    ],
  },
  conception: {
    title: 'guide.conceptionTitle',
    cards: [
      ['guide.timingTitle', 'guide.timing', 'trying'],
      ['help.testTitle', 'help.test', 'test'],
      ['guide.urgentTitle', 'guide.urgent', 'urgent'],
    ],
    faq: [
      ['guide.prepareTitle', 'guide.prepare', 'trying'],
      ['guide.tempQuestion', 'conception.note', 'test'],
      ['guide.estimateQuestion', 'tracking.note'],
    ],
  },
}

function guideParagraph(key: TranslationKey) {
  const text = t(key)
  const phrases = guideEmphasis[language.value][key] ?? []
  const ranges = phrases.map(phrase => ({ start: text.indexOf(phrase), phrase }))
    .filter(range => range.start >= 0)
    .sort((a, b) => a.start - b.start)

  let cursor = 0
  const segments: { text: string; emphasis: boolean }[] = []
  for (const { start, phrase } of ranges) {
    if (start < cursor) continue
    segments.push({ text: text.slice(cursor, start), emphasis: false })
    segments.push({ text: phrase, emphasis: true })
    cursor = start + phrase.length
  }
  segments.push({ text: text.slice(cursor), emphasis: false })
  return segments
}

function guideEntry([heading, body, source]: GuideEntry) {
  return {
    heading,
    body,
    source: source ? sources[source] : undefined,
    segments: guideParagraph(body),
    priority: body === 'help.ec' || body === 'guide.urgent',
    timing: body === 'help.test' || body === 'guide.heavy',
  }
}

const plan = computed(() => plans[props.audience])
const guideSections = computed(() => [
  { kind: 'cards', entries: plan.value.cards.map(guideEntry) },
  { kind: 'faq', entries: plan.value.faq.map(guideEntry) },
] as const)

function changeLanguage(event: Event) {
  setLanguage((event.target as HTMLSelectElement).value)
}

function changeAudience(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (isAudienceMode(value)) emit('update:audience', value)
}

function changeRegion(event: Event) {
  if (!setRegion((event.target as HTMLSelectElement).value)) emit('storage-error')
}

onMounted(() => {
  if (regionPreference.value === 'auto' && !regionChecking.value) void detectRegion()
})
</script>

<template>
  <section id="page-emergency" class="page">
    <div class="page-head">
      <h2 class="section-title"><span class="title-icon"><AppIcon name="settings" /></span>{{ t('settings.title') }}</h2>
      <p class="page-intro">{{ t('guide.subtitle') }}</p>
    </div>

    <div class="page-columns">
    <div>
    <div class="card settings-card">
      <h3 class="card-title">{{ t('settings.preferences') }}</h3>
      <div class="settings-rows">
        <div class="setting-row">
          <label for="languageSelect">{{ t('language') }}</label>
          <select id="languageSelect" class="pill-select" :value="language" @change="changeLanguage">
            <option v-for="code in supportedLanguages" :key="code" :value="code" :lang="code">{{ languageNames[code] }}</option>
          </select>
        </div>
        <div class="setting-row">
          <label for="audienceSelect">{{ t('purpose') }}</label>
          <select id="audienceSelect" class="pill-select" :value="audience" @change="changeAudience">
            <option v-for="mode in audienceModes" :key="mode" :value="mode">{{ t(`mode.${mode}`) }}</option>
          </select>
        </div>
        <div class="setting-row">
          <label for="regionSelect">{{ t('region.label') }}</label>
          <select id="regionSelect" class="pill-select" :value="regionPreference" aria-describedby="regionStatus" @change="changeRegion">
          <option value="auto">{{ t('region.auto') }}</option>
          <option value="TW">{{ t('region.taiwan') }}</option>
            <option value="global">{{ t('region.global') }}</option>
          </select>
        </div>
        <small id="regionStatus" class="setting-status" role="status">{{ regionStatus }}</small>
      </div>

      <p class="privacy-badge"><AppIcon name="lock" :size="15" />{{ t('privacy') }}</p>
      <div class="settings-reset">
        <p id="resetDescription">{{ t('reset.description') }}</p>
        <button id="resetAllBtn" type="button" class="btn btn-danger-ghost" aria-describedby="resetDescription" @click="emit('reset')">
          <AppIcon name="trash" :size="17" />{{ t('reset.button') }}
        </button>
      </div>
    </div>
    </div>

    <div class="guide-column">
    <button id="guideUnp" type="button" class="action-row" @click="emit('unprotected')">
      <span class="action-row-icon"><AppIcon name="shield" :size="20" /></span>
      <span class="action-copy">
        <strong>{{ t('unp.action') }}</strong>
        <small>{{ t('unp.actionSub') }}</small>
      </span>
      <AppIcon class="row-arrow" name="right" :size="18" />
    </button>
    <h3 id="purposeGuideTitle" class="block-title">{{ t(plan.title) }}</h3>
    <p id="helpIntro" class="page-intro">{{ t(`${audience}.hint`) }}</p>
    <div id="purposeGuide">
      <template v-for="group in guideSections" :key="group.kind">
        <h4 v-if="group.kind === 'faq'" class="block-title faq-title">{{ t('guide.faq') }}</h4>
        <component
          :is="group.kind === 'faq' ? 'details' : 'div'"
          v-for="entry in group.entries"
          :key="entry.heading"
          :class="[group.kind === 'faq' ? 'guide-detail' : 'emrg-box', { 'guide-priority': entry.priority, 'guide-timing': entry.timing }]"
          :data-topic="entry.body"
          :data-question="group.kind === 'faq' ? entry.heading : undefined"
        >
          <component :is="group.kind === 'faq' ? 'summary' : 'h4'" :class="group.kind === 'cards' ? 'emrg-title' : undefined">
            <span>{{ t(entry.heading) }}</span>
            <AppIcon v-if="group.kind === 'faq'" class="faq-chevron" name="down" :size="18" />
          </component>
          <div>
            <p>
              <template v-for="(segment, index) in entry.segments" :key="index">
                <strong v-if="segment.emphasis" class="guide-emphasis">{{ segment.text }}</strong>
                <template v-else>{{ segment.text }}</template>
              </template>
            </p>
            <a v-if="entry.source" class="source-link" :href="entry.source" target="_blank" rel="noopener noreferrer">{{ t('help.source') }}</a>
          </div>
        </component>
      </template>
    </div>

    <div id="taiwanHelp" class="emrg-box safe" :class="{ hidden: !isTaiwanRegion }">
      <h4 class="emrg-title">{{ t('tw.title') }}</h4>
      <p id="taiwanPurpose">{{ t(`tw.${audience}`) }}</p>
      <p>{{ t('tw.support') }}</p>
      <a class="source-link" href="https://www.immigration.gov.tw/5385/7445/7910/204893/" target="_blank" rel="noopener noreferrer">{{ t('tw.source') }}</a>
    </div>
    <p class="fine-print">{{ t('help.note') }}</p>
    </div>
    </div>
  </section>
</template>

