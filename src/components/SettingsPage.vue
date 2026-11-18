<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NButton, NCard } from 'naive-ui'
import { audienceModes, isAudienceMode, type AudienceMode } from '../audience'
import { language, languageNames, setLanguage, supportedLanguages, t, type TranslationKey } from '../i18n'
import { guideEmphasis } from '../locales/guide-emphasis'
import { detectRegion, isTaiwanRegion, regionChecking, regionPreference, regionStatus, setRegion } from '../region'

const props = defineProps<{ audience: AudienceMode }>()
const emit = defineEmits<{
  'update:audience': [mode: AudienceMode]
  reset: []
  'storage-error': []
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
    <h2 class="section-title">{{ t('settings.title') }}</h2>
    <p class="page-intro">{{ t('guide.subtitle') }}</p>

    <NCard class="settings-card" content-style="padding: 0">
      <h3 class="settings-help-title preferences-title">{{ t('settings.preferences') }}</h3>
      <div class="settings-preferences">
        <div class="audience-picker">
          <label for="languageSelect">{{ t('language') }}</label>
          <select id="languageSelect" class="audience-select language-select" :value="language" @change="changeLanguage">
            <option v-for="code in supportedLanguages" :key="code" :value="code" :lang="code">{{ languageNames[code] }}</option>
          </select>
        </div>
        <div class="audience-picker">
          <label for="audienceSelect">{{ t('purpose') }}</label>
          <select id="audienceSelect" class="audience-select" :value="audience" @change="changeAudience">
            <option v-for="mode in audienceModes" :key="mode" :value="mode">{{ t(`mode.${mode}`) }}</option>
          </select>
        </div>
      </div>

      <div class="region-settings">
        <label for="regionSelect">{{ t('region.label') }}</label>
        <select id="regionSelect" :value="regionPreference" aria-describedby="regionStatus" @change="changeRegion">
          <option value="auto">{{ t('region.auto') }}</option>
          <option value="TW">{{ t('region.taiwan') }}</option>
          <option value="global">{{ t('region.global') }}</option>
        </select>
        <small id="regionStatus" role="status">{{ regionStatus }}</small>
      </div>

      <div class="settings-privacy"><span class="privacy-badge">{{ t('privacy') }}</span></div>
      <div class="settings-reset">
        <p id="resetDescription">{{ t('reset.description') }}</p>
        <NButton id="resetAllBtn" class="btn-outline" type="error" ghost block aria-describedby="resetDescription" @click="emit('reset')">
          {{ t('reset.button') }}
        </NButton>
      </div>
    </NCard>

    <h3 id="purposeGuideTitle" class="settings-help-title">{{ t(plan.title) }}</h3>
    <p id="helpIntro" class="page-intro">{{ t(`${audience}.hint`) }}</p>
    <div id="purposeGuide">
      <template v-for="group in guideSections" :key="group.kind">
        <h4 v-if="group.kind === 'faq'" class="settings-help-title">{{ t('guide.faq') }}</h4>
        <component
          :is="group.kind === 'faq' ? 'details' : 'div'"
          v-for="entry in group.entries"
          :key="entry.heading"
          :class="[group.kind === 'faq' ? 'guide-detail' : 'emrg-box', { 'guide-priority': entry.priority, 'guide-timing': entry.timing }]"
          :data-topic="entry.body"
          :data-question="group.kind === 'faq' ? entry.heading : undefined"
        >
          <component :is="group.kind === 'faq' ? 'summary' : 'h4'" :class="group.kind === 'cards' ? 'emrg-title' : undefined">
            {{ t(entry.heading) }}
          </component>
          <div>
            <p>
              <template v-for="(segment, index) in entry.segments" :key="index">
                <strong v-if="segment.emphasis" class="guide-emphasis">{{ segment.text }}</strong>
                <template v-else>{{ segment.text }}</template>
              </template>
            </p>
            <a v-if="entry.source" :href="entry.source">{{ t('help.source') }}</a>
          </div>
        </component>
      </template>
    </div>

    <div id="taiwanHelp" class="emrg-box safe" :class="{ hidden: !isTaiwanRegion }">
      <h4 class="emrg-title">{{ t('tw.title') }}</h4>
      <p id="taiwanPurpose">{{ t(`tw.${audience}`) }}</p>
      <p>{{ t('tw.support') }}</p>
      <a href="https://www.immigration.gov.tw/5385/7445/7910/204893/" target="_blank" rel="noopener noreferrer">{{ t('tw.source') }}</a>
    </div>
    <div class="disclaimer-box">{{ t('help.note') }}</div>
  </section>
</template>

<style scoped>
#page-emergency .preferences-title {
  margin: 0 0 16px;
  color: var(--text-sub);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: .08em;
}
</style>
