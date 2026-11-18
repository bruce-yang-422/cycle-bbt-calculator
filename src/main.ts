import { createApp } from 'vue'
import App from './App.vue'
import { syncLocalizedMetadata } from './i18n'
import { initTheme } from './theme'
import '../css/app.css'

initTheme()
syncLocalizedMetadata()
createApp(App).mount('#app')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const register = () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {
      // The site can still be used if installation or offline storage is blocked.
    })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
