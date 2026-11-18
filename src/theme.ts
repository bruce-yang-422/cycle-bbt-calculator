import { ref } from 'vue'

export const themeModes = ['light', 'dark', 'system'] as const
export type ThemeMode = (typeof themeModes)[number]

const storageKey = 'theme'
const barColors = { light: '#fbf6f4', dark: '#1a1418' }

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Fall back to the system preference when storage is blocked.
  }
  return 'system'
}

const media = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')
export const themeMode = ref<ThemeMode>(typeof window === 'undefined' ? 'system' : readMode())
/** The theme actually on screen, after resolving "system". */
export const isDark = ref(false)

function apply(): void {
  const root = document.documentElement
  if (themeMode.value === 'system') delete root.dataset.theme
  else root.dataset.theme = themeMode.value
  isDark.value = themeMode.value === 'dark' || (themeMode.value === 'system' && Boolean(media?.matches))
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', barColors[isDark.value ? 'dark' : 'light'])
}

export function setTheme(mode: ThemeMode): boolean {
  themeMode.value = mode
  apply()
  try {
    if (mode === 'system') localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, mode)
    return true
  } catch {
    return false
  }
}

/** Applies the saved theme before the app mounts so the first paint uses the right colours. */
export function initTheme(): void {
  apply()
  media?.addEventListener('change', () => {
    if (themeMode.value === 'system') apply()
  })
}
