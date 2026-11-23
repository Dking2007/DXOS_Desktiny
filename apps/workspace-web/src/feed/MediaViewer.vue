<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-vue-next'
import type { PostMedia } from '@dx/web-shared/types.ts'

const props = defineProps<{ items: PostMedia[]; start: number; caption?: string }>()
const emit = defineEmits<{ close: [] }>()
const index = ref(props.start)
const current = computed(() => props.items[index.value])
const dialog = ref<HTMLDialogElement>()
let previous: Element | null = null
let touchX = 0

function go(step: number) {
  const count = props.items.length
  index.value = (index.value + step + count) % count
}
function onKey(event: KeyboardEvent) {
  // Arrow keys inside a playing video seek it; only switch items from elsewhere.
  if (event.target instanceof HTMLMediaElement || props.items.length < 2) return
  if (event.key === 'ArrowRight') go(1)
  else if (event.key === 'ArrowLeft') go(-1)
  else if (event.key === 'Home') index.value = 0
  else if (event.key === 'End') index.value = props.items.length - 1
  else return
  event.preventDefault()
}
function onTouchEnd(event: TouchEvent) {
  const delta = event.changedTouches[0].clientX - touchX
  if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1)
}
onMounted(async () => {
  previous = document.activeElement
  await nextTick()
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  if (previous instanceof HTMLElement) previous.focus()
})
</script>
<template>
  <dialog
    ref="dialog"
    class="media-viewer"
    aria-label="Xem ảnh và video"
    @cancel.prevent="emit('close')"
    @keydown="onKey"
    @click.self="emit('close')"
  >
    <header class="media-viewer-bar">
      <span aria-live="polite">{{ index + 1 }} / {{ items.length }}</span>
      <span v-if="items.length > 1" class="media-viewer-hint">Dùng phím ← → để chuyển</span>
      <span class="grow" />
      <a class="icon-button" :href="`${current.url}?download=1`" :download="current.name" aria-label="Tải về" title="Tải về"
        ><Download :size="19"
      /></a>
      <button class="icon-button" type="button" aria-label="Đóng" title="Đóng (Esc)" autofocus @click="emit('close')">
        <X :size="21" />
      </button>
    </header>
    <div
      class="media-viewer-stage"
      @click.self="emit('close')"
      @touchstart.passive="touchX = $event.touches[0].clientX"
      @touchend="onTouchEnd"
    >
      <img v-if="current.kind === 'image'" :key="current.id" :src="current.url" :alt="current.alt || current.name" />
      <video v-else :key="current.id" :src="current.url" controls autoplay playsinline />
    </div>
    <template v-if="items.length > 1">
      <button class="media-viewer-nav prev" type="button" aria-label="Mục trước" title="Mục trước (←)" @click="go(-1)">
        <ChevronLeft :size="28" />
      </button>
      <button class="media-viewer-nav next" type="button" aria-label="Mục sau" title="Mục sau (→)" @click="go(1)">
        <ChevronRight :size="28" />
      </button>
      <div class="media-viewer-strip">
        <button
          v-for="(item, n) in items"
          :key="item.id"
          type="button"
          :class="{ active: n === index }"
          :aria-label="`Xem mục ${n + 1}`"
          :aria-current="n === index ? 'true' : undefined"
          @click="index = n"
        >
          <img v-if="item.kind === 'image'" :src="item.url" alt="" loading="lazy" />
          <video v-else :src="`${item.url}#t=0.1`" preload="metadata" muted tabindex="-1" />
        </button>
      </div>
    </template>
    <p v-if="caption" class="media-viewer-caption">{{ caption }}</p>
  </dialog>
</template>
