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

export const catalogs: Record<Language, Record<TranslationKey, string>> = {
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

  const title = t('app.name')
  const description = t('app.subtitle')
  document.documentElement.lang = language.value
  document.title = title

  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (manifest) {
    const base = import.meta.env?.BASE_URL ?? '/'
    manifest.href = `${base}locales/manifest.${language.value}.json`
  }

  document.querySelectorAll<HTMLMetaElement>(
    'meta[property="og:title"], meta[name="twitter:title"], meta[name="apple-mobile-web-app-title"]',
  ).forEach(element => { element.content = title })

  document.querySelectorAll<HTMLMetaElement>(
    'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]',
  ).forEach(element => { element.content = description })

  const structuredData = document.querySelector('script[type="application/ld+json"]')
  if (structuredData?.textContent) {
    const schema = JSON.parse(structuredData.textContent)
    schema.name = title
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
