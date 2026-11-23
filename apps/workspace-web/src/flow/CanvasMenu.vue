<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Component } from 'vue'

export interface MenuItem {
  key: string
  label: string
  icon: Component
  shortcut?: string
  disabled?: boolean
  /** Why it is disabled, shown as a tooltip. */
  reason?: string
  danger?: boolean
  /** Draws a separator above this item. */
  divided?: boolean
}

/** Right-click menu on the canvas: arrow keys move, Enter runs, Escape or a click elsewhere closes. */
const props = defineProps<{ x: number; y: number; items: MenuItem[]; label: string }>()
const emit = defineEmits<{ select: [key: string]; close: [] }>()
const root = ref<HTMLElement>()
const place = ref({ left: props.x, top: props.y })

function buttons() {
  return [...(root.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
}
function onKey(event: KeyboardEvent) {
  const list = buttons()
  const index = list.indexOf(document.activeElement as HTMLButtonElement)
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1
    list[(next + list.length) % list.length]?.focus()
  } else if (event.key === 'Escape' || event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  }
}
function onPointer(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) emit('close')
}
function onScroll() {
  emit('close')
}
onMounted(async () => {
  document.addEventListener('pointerdown', onPointer, true)
  window.addEventListener('wheel', onScroll, { passive: true })
  await nextTick()
  const box = root.value
  const parent = box?.offsetParent as HTMLElement | null
  if (box && parent) {
    place.value = {
      left: Math.max(8, Math.min(props.x, parent.clientWidth - box.offsetWidth - 8)),
      top: Math.max(8, Math.min(props.y, parent.clientHeight - box.offsetHeight - 8)),
    }
  }
  buttons()[0]?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointer, true)
  window.removeEventListener('wheel', onScroll)
})
</script>
<template>
  <div
    ref="root"
    class="canvas-menu"
    role="menu"
    :aria-label="label"
    :style="{ left: `${place.left}px`, top: `${place.top}px` }"
    @keydown="onKey"
    @contextmenu.prevent
  >
    <template v-for="item in items" :key="item.key">
      <hr v-if="item.divided" class="canvas-menu-divider" />
      <button
        type="button"
        role="menuitem"
        :class="{ danger: item.danger }"
        :disabled="item.disabled"
        :title="item.disabled ? item.reason : undefined"
        @click="emit('select', item.key)"
      >
        <component :is="item.icon" :size="16" aria-hidden="true" />
        <span class="grow">{{ item.label }}</span>
        <kbd v-if="item.shortcut">{{ item.shortcut }}</kbd>
      </button>
    </template>
  </div>
</template>
