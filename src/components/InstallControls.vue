<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from 'vue';
import { t } from '../i18n';

defineProps<{ blocked?: boolean }>();

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const storageKey = 'installBannerDismissed';
const icon = `${import.meta.env.BASE_URL}images/icon-192.png`;
const standalone = ref(false);
const appInstalled = ref(false);
const installInProgress = ref(false);
const bannerVisible = ref(false);
const helpVisible = ref(false);
const ios = ref(false);
const deferredPrompt = shallowRef<InstallPromptEvent | null>(null);
const footer = useTemplateRef<HTMLElement>('footer');
const help = useTemplateRef<HTMLElement>('help');
const entryHidden = computed(() => standalone.value || appInstalled.value);
let mounted = false;
let bannerDismissed = false;
let safariTimer: ReturnType<typeof setTimeout> | undefined;
let displayMode: MediaQueryList | undefined;

function rememberDismissal(): void {
  bannerDismissed = true;
  try {
    window.localStorage.setItem(storageKey, '1');
  } catch {
    // Dismissal still applies while this page is open.
  }
}

function showBanner(): void {
  if (!entryHidden.value && !bannerDismissed) bannerVisible.value = true;
}

function dismissBanner(): void {
  rememberDismissal();
  bannerVisible.value = false;
}

async function showHelp(): Promise<void> {
  bannerVisible.value = false;
  helpVisible.value = true;
  await nextTick();
  help.value?.scrollIntoView({ block: 'nearest' });
  help.value?.querySelector('button')?.focus();
}

function closeHelp(): void {
  helpVisible.value = false;
  footer.value?.querySelector('button')?.focus();
}

async function handleInstallClick(): Promise<void> {
  if (installInProgress.value || entryHidden.value) return;
  const prompt = deferredPrompt.value;
  if (!prompt) {
    await showHelp();
    return;
  }

  deferredPrompt.value = null;
  installInProgress.value = true;
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (!mounted) return;
    if (outcome === 'accepted') rememberDismissal();
    bannerVisible.value = false;
    helpVisible.value = false;
  } catch {
    if (mounted && !entryHidden.value) await showHelp();
  } finally {
    if (mounted) installInProgress.value = false;
  }
}

function capturePrompt(event: Event): void {
  event.preventDefault();
  deferredPrompt.value = event as InstallPromptEvent;
  showBanner();
}

function markInstalled(): void {
  appInstalled.value = true;
  deferredPrompt.value = null;
  rememberDismissal();
  bannerVisible.value = false;
  helpVisible.value = false;
}

function syncDisplayMode(): void {
  const navigator = window.navigator as Navigator & { standalone?: boolean };
  standalone.value = Boolean(displayMode?.matches || navigator.standalone);
  if (standalone.value) {
    bannerVisible.value = false;
    helpVisible.value = false;
  }
}

onMounted(() => {
  mounted = true;
  try {
    bannerDismissed = Boolean(window.localStorage.getItem(storageKey));
  } catch {
    // The install controls are still available if storage is blocked.
  }

  displayMode = window.matchMedia('(display-mode: standalone)');
  syncDisplayMode();
  displayMode.addEventListener?.('change', syncDisplayMode);
  window.addEventListener('beforeinstallprompt', capturePrompt);
  window.addEventListener('appinstalled', markInstalled);

  const userAgent = window.navigator.userAgent;
  ios.value = /iphone|ipad|ipod/i.test(userAgent);
  if (!standalone.value && ios.value && /safari/i.test(userAgent) && !/crios|fxios/i.test(userAgent)) {
    safariTimer = setTimeout(showBanner, 1500);
  }
});

onUnmounted(() => {
  mounted = false;
  clearTimeout(safariTimer);
  displayMode?.removeEventListener?.('change', syncDisplayMode);
  window.removeEventListener('beforeinstallprompt', capturePrompt);
  window.removeEventListener('appinstalled', markInstalled);
});
</script>

<template>
  <Teleport to="body">
    <div id="installBanner" class="install-banner" :class="{ hidden: !bannerVisible }" :inert="blocked">
      <div class="install-icon"><img :src="icon" alt=""></div>
      <div class="install-copy">
        <div class="install-title">{{ t('install.title') }}</div>
        <div class="install-sub">{{ t(!deferredPrompt && ios ? 'install.ios' : 'install.sub') }}</div>
      </div>
      <div class="install-actions">
        <button id="installBtn" type="button" class="btn btn-primary btn-sm install-btn" data-control="control-1" :disabled="installInProgress" @click="handleInstallClick">
          {{ t('install.button') }}
        </button>
        <button id="installCloseBtn" type="button" class="icon-btn install-close" data-control="control-2" :aria-label="t('close')" @click="dismissBanner">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>
        </button>
      </div>
    </div>
  </Teleport>

  <footer ref="footer" class="app-footer">
    <p>{{ t('footer') }}</p>
    <button
      id="appInstallEntry"
      type="button"
      class="btn btn-ghost btn-sm app-install-entry"
      :class="{ hidden: entryHidden }"
      data-control="control-19"
      aria-controls="installHelp"
      :aria-expanded="helpVisible"
      :disabled="installInProgress"
      @click="handleInstallClick"
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/></svg>
      {{ t('install.button') }}
    </button>
  </footer>
  <section id="installHelp" ref="help" class="install-help" :class="{ hidden: !helpVisible }" aria-labelledby="installHelpTitle">
    <strong id="installHelpTitle">{{ t('install.title') }}</strong>
    <p id="installHelpText">{{ t(ios ? 'install.ios' : 'install.other') }}</p>
    <button type="button" class="chip" data-control="control-20" @click="closeHelp">{{ t('install.hide') }}</button>
  </section>
</template>
