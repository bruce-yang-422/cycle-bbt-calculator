import { ref } from 'vue'
import de from './locales/de'
import en from './locales/en'
import es from './locales/es'
import ja from './locales/ja'
import ko from './locales/ko'
import th from './locales/th'
import vi from './locales/vi'
import zhTW from './locales/zh-TW'

export const supportedLanguages = ['zh-TW', 'en', 'ja', 'ko', 'es', 'de', 'th', 'vi'] as const

export type Language = (typeof supportedLanguages)[number]
export type TranslationKey = keyof typeof en

export const languageNames: Record<Language, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  de: 'Deutsch',
  th: 'ไทย',
  vi: 'Tiếng Việt',
}

const ogLocales: Record<Language, string> = {
  'zh-TW': 'zh_TW',
  en: 'en_US',
  ja: 'ja_JP',
  ko: 'ko_KR',
  es: 'es_ES',
  de: 'de_DE',
  th: 'th_TH',
  vi: 'vi_VN',
}

export const catalogs:Record<Language, Record<TranslationKey, string>> = {
  'zh-TW': zhTW,
  en,
  ja,
  ko,
  es,
  de,
  th,
  vi,
}

function isSupportedLanguage(value: string): value is Language {
  return supportedLanguages.some(code => code === value)
}

export function resolveLanguage(value?: string | null): Language | null {
  if (!value) return null
  if (isSupportedLanguage(value)) return value

  const base = value.toLowerCase().split('-')[0]
  if (base === 'zh') return 'zh-TW'
  return base && isSupportedLanguage(base) ? base : null
}

function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'

  const urlLanguage = resolveLanguage(new URL(window.location.href).searchParams.get('lang'))
  if (urlLanguage) return urlLanguage

  try {
    const saved = resolveLanguage(window.localStorage.getItem('language'))
    if (saved) return saved
  } catch {
    // Browser storage can be unavailable in private or restricted contexts.
  }

  return resolveLanguage(window.navigator.language) ?? 'en'
}

export const language = ref<Language>(initialLanguage())

export function t(key: string, values: Record<string, string | number> = {}): string {
  if (!Object.hasOwn(catalogs.en, key)) throw new Error(`Missing translation: ${key}`)

  const translationKey = key as TranslationKey
  const message = catalogs[language.value][translationKey] ?? catalogs.en[translationKey]
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder))
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(language.value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function localizedDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { month: 'numeric', day: 'numeric', weekday: 'short' },
): string {
  return new Intl.DateTimeFormat(language.value, { calendar: 'gregory', ...options }).format(date)
}

export function syncLocalizedMetadata(): void {
  if (typeof document === 'undefined') return

  const name = t('app.name')
  const title = t('seo.title')
  const description = t('seo.description')
  const base = import.meta.env?.BASE_URL ?? '/'
  document.documentElement.lang = language.value
  document.title = title

  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (manifest) manifest.href = `${base}locales/manifest.${language.value}.json`

  // 只有網址帶 ?lang= 時才是該語言的專屬網址，否則視為 x-default 首頁。
  const pageUrl = new URL(base, window.location.origin)
  if (new URL(window.location.href).searchParams.has('lang')) pageUrl.searchParams.set('lang', language.value)
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.append(canonical)
  }
  canonical.href = pageUrl.href

  const setMeta = (selector: string, content: string) => {
    document.querySelectorAll<HTMLMetaElement>(selector).forEach(element => { element.content = content })
  }
  setMeta('meta[property="og:title"], meta[name="twitter:title"]', title)
  setMeta('meta[name="apple-mobile-web-app-title"], meta[name="application-name"], meta[property="og:site_name"]', name)
  setMeta('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]', description)
  setMeta('meta[property="og:url"]', pageUrl.href)
  setMeta('meta[property="og:locale"]', ogLocales[language.value])

  const structuredData = document.querySelector('script[type="application/ld+json"]')
  if (structuredData?.textContent) {
    const schema = JSON.parse(structuredData.textContent)
    schema.name = title
    schema.alternateName = name
    schema.description = description
    schema.inLanguage = language.value
    structuredData.textContent = JSON.stringify(schema)
  }
}

export function setLanguage(value: string): void {
  if (!isSupportedLanguage(value)) return

  language.value = value
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem('language', value)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', value)
    window.history.replaceState(null, '', url)
  } catch {
    // The current locale is still available for this page.
  }
  syncLocalizedMetadata()
}
