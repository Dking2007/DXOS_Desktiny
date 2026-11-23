<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowUp } from 'lucide-vue-next'
import { allowedOn, mostScrolled, nextVisible, scrollBehavior, type Glide, type ScrollState } from '../../ui/backToTop'
import { prefersReducedMotion } from '../../ui/preferences'

/** "Lên đầu trang": floats above the assistant button once the page is a screen or more down. */
const route = useRoute()
const scrolled = ref(false)
const shown = computed(() => scrolled.value && allowedOn(route.meta))
let frame = 0

interface Scroller extends ScrollState {
  toTop: (behavior: Glide) => void
}
// The page normally scrolls as a whole; full-height views may scroll inside the main pane instead.
function scrollers(): Scroller[] {
  const list: Scroller[] = [
    {
      top: window.scrollY || document.documentElement.scrollTop,
      height: window.innerHeight,
      toTop: (behavior) => window.scrollTo({ top: 0, behavior }),
    },
  ]
  const main = document.getElementById('main-content')
  if (main && main.scrollHeight > main.clientHeight)
    list.push({ top: main.scrollTop, height: main.clientHeight, toTop: (behavior) => main.scrollTo({ top: 0, behavior }) })
  return list
}
function measure() {
  frame = 0
  const current = mostScrolled(scrollers())
  scrolled.value = current ? nextVisible(scrolled.value, current) : false
}
function schedule() {
  if (!frame) frame = window.requestAnimationFrame(measure)
}
function toTop() {
  const behavior = scrollBehavior(prefersReducedMotion())
  for (const scroller of scrollers()) if (scroller.top > 0) scroller.toTop(behavior)
  // The button disappears under the pointer; keyboard focus goes to the start of the content instead.
  document.getElementById('main-content')?.focus({ preventScroll: true })
}
onMounted(() => {
  // Capture catches scrolling of the main pane too (scroll events do not bubble).
  document.addEventListener('scroll', schedule, { capture: true, passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  measure()
})
onBeforeUnmount(() => {
  document.removeEventListener('scroll', schedule, { capture: true })
  window.removeEventListener('resize', schedule)
  if (frame) window.cancelAnimationFrame(frame)
})
// A new page starts at the top; measure once it has rendered.
watch(() => route.fullPath, schedule, { flush: 'post' })
</script>
<template>
  <Transition name="back-to-top">
    <button
      v-if="shown"
      class="back-to-top"
      type="button"
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      @click="toTop"
    >
      <ArrowUp :size="20" aria-hidden="true" />
    </button>
  </Transition>
</template>
