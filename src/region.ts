import { computed, ref } from 'vue'
import { t } from './i18n'

export type RegionPreference = 'auto' | 'TW' | 'global'

function isRegionPreference(value: unknown): value is RegionPreference {
  return value === 'auto' || value === 'TW' || value === 'global'
}

function getSavedRegion(): RegionPreference {
  if (typeof window === 'undefined') return 'auto'

  try {
    const value = window.localStorage.getItem('regionPreference')
    if (isRegionPreference(value)) return value
  } catch {
    // The general guidance remains available when local storage is restricted.
  }
  return 'auto'
}

export const regionPreference = ref<RegionPreference>(getSavedRegion())
export const regionChecking = ref(false)
const detectedCountry = ref<string | null>(null)
let activeRequest: AbortController | undefined

export const isTaiwanRegion = computed(() => regionPreference.value === 'TW'
  || (regionPreference.value === 'auto' && detectedCountry.value === 'TW'))

export const regionStatus = computed(() => {
  if (regionPreference.value !== 'auto') return t(isTaiwanRegion.value ? 'region.taiwan' : 'region.global')
  if (regionChecking.value) return t('region.checking')
  if (!detectedCountry.value) return t('region.unknown')
  return t(isTaiwanRegion.value ? 'region.detectedTW' : 'region.detectedGlobal')
})

export async function detectRegion(): Promise<void> {
  if (regionPreference.value !== 'auto') return

  activeRequest?.abort()
  const controller = new AbortController()
  activeRequest = controller
  detectedCountry.value = null
  regionChecking.value = true
  const timeout = setTimeout(() => controller.abort(), 3500)

  try {
    const response = await fetch('/cdn-cgi/trace', {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    if (!response.ok || !response.headers.get('content-type')?.includes('text/plain')) return

    // Cloudflare's trace includes the IP address, so retain only the country code.
    const country = (await response.text()).match(/^loc=([A-Z]{2})\s*$/m)?.[1]
    if (activeRequest === controller && !controller.signal.aborted && country && country !== 'XX') {
      detectedCountry.value = country
    }
  } catch {
    // Static hosting, offline use, and timeouts use general guidance.
  } finally {
    clearTimeout(timeout)
    if (activeRequest === controller) {
      activeRequest = undefined
      regionChecking.value = false
    }
  }
}

export function setRegion(value: string): boolean {
  if (!isRegionPreference(value)) return false

  regionPreference.value = value
  activeRequest?.abort()
  activeRequest = undefined
  regionChecking.value = false

  let saved = true
  try {
    window.localStorage.setItem('regionPreference', value)
  } catch {
    saved = false
  }
  if (value === 'auto') void detectRegion()
  return saved
}
