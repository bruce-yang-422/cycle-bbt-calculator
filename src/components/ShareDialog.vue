<script setup lang="ts">
import { nextTick, onUnmounted, ref, shallowRef } from 'vue'
import AppIcon from './AppIcon.vue'
import type { AudienceMode } from '../audience'
import type { useCycle } from '../useCycle'
import { t } from '../i18n'
import { buildShareResult, drawShareImage } from '../share'

const props = defineProps<{ cycle: ReturnType<typeof useCycle>; audience: AudienceMode }>()
const emit = defineEmits<{ notice: [message: string] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const textArea = ref<HTMLTextAreaElement | null>(null)
const file = shallowRef<File | null>(null)
const url = ref('')
const text = ref('')
const view = ref<'image' | 'text'>('image')
const feedback = ref('')
let generation = 0

function disposeImage() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''
  file.value = null
}

onUnmounted(() => {
  generation++
  disposeImage()
})

function setView(value: 'image' | 'text') {
  view.value = value
  feedback.value = ''
}

async function open() {
  if (dialog.value?.open) return
  const params = props.cycle.calcParams.value
  const result = params && buildShareResult(props.cycle.dayMap.value, props.audience, params.ovDay !== null)
  if (!result) {
    emit('notice', t('setupFirst'))
    return
  }
  const request = ++generation
  try {
    // Web fonts must be ready before canvas text, or the export falls back to system glyphs.
    await document.fonts?.ready
    if (request !== generation) return
    const canvas = drawShareImage(result)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (request !== generation) return
    if (!blob) throw new Error('PNG unavailable')

    disposeImage()
    file.value = new File([blob], result.filename, { type: 'image/png' })
    url.value = URL.createObjectURL(blob)
    text.value = result.text
    setView('image')
    await nextTick()
    dialog.value?.showModal()
  } catch {
    emit('notice', t('share.failed'))
  }
}

function restoreFocus() {
  disposeImage()
  document.getElementById('shareCycleBtn')?.focus()
}

function download() {
  if (!file.value) return
  const link = document.createElement('a')
  link.href = url.value
  link.download = file.value.name
  document.body.append(link)
  link.click()
  link.remove()
}

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
    feedback.value = t('share.copied')
  } catch {
    textArea.value?.focus()
    textArea.value?.select()
    feedback.value = t('share.manual')
  }
}

async function send() {
  const data: ShareData = view.value === 'image'
    ? { files: file.value ? [file.value] : [] }
    : { text: text.value }

  if (!navigator.share || (view.value === 'image' && (!file.value || !navigator.canShare?.(data)))) {
    feedback.value = t('share.unavailable')
    return
  }
  try {
    await navigator.share(data)
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'AbortError') feedback.value = t('share.unavailable')
  }
}

defineExpose({ open })
</script>

<template>
  <dialog id="shareDialog" ref="dialog" class="modal share-dialog" aria-labelledby="shareTitle" @close="restoreFocus">
    <div class="modal-head">
      <h2 id="shareTitle" class="modal-title">{{ t('share.open') }}</h2>
      <button id="shareClose" type="button" class="icon-btn" :aria-label="t('close')" @click="dialog?.close()"><AppIcon name="close" /></button>
    </div>
    <p class="share-note">{{ t('share.scope') }}</p>
    <div class="segmented">
      <button id="shareImageTab" type="button" class="segment" :class="{ on: view === 'image' }" :aria-pressed="view === 'image'" @click="setView('image')">{{ t('share.image') }}</button>
      <button id="shareTextTab" type="button" class="segment" :class="{ on: view === 'text' }" :aria-pressed="view === 'text'" @click="setView('text')">{{ t('share.text') }}</button>
    </div>
    <div id="shareImagePanel" :class="{ hidden: view !== 'image' }">
      <img v-if="url" id="sharePreview" :src="url" :alt="t('summary')">
      <button id="shareDownload" type="button" class="btn btn-ghost btn-block" @click="download"><AppIcon name="download" :size="17" />{{ t('share.download') }}</button>
    </div>
    <div id="shareTextPanel" :class="{ hidden: view !== 'text' }">
      <textarea id="sharePlainText" ref="textArea" :value="text" readonly :aria-label="t('share.text')"></textarea>
      <button id="shareCopy" type="button" class="btn btn-ghost btn-block" @click="copy">{{ t('share.copy') }}</button>
    </div>
    <button id="shareNative" type="button" class="btn btn-primary btn-lg" @click="send"><AppIcon name="share" :size="18" />{{ t('share.send') }}</button>
    <p id="shareFeedback" class="share-note" role="status">{{ feedback }}</p>
  </dialog>
</template>
