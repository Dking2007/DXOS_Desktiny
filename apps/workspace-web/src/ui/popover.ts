// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

// Closes a dropdown on a click outside it, on Escape (returning focus to its trigger)
// and when the page changes underneath it.
export function useDismiss(root: Ref<HTMLElement | undefined>, open: Ref<boolean>, trigger?: Ref<HTMLElement | undefined>) {
  const route = useRoute()
  function onPointer(event: PointerEvent) {
    if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
  }
  function onKey(event: KeyboardEvent) {
    if (open.value && event.key === 'Escape') {
      open.value = false
      trigger?.value?.focus()
    }
  }
  watch(
    () => route?.fullPath,
    () => {
      open.value = false
    },
  )
  onMounted(() => {
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointer)
    document.removeEventListener('keydown', onKey)
  })
}

/** Index of the menu item to focus for an arrow / Home / End key, or -1 to ignore the key. */
export function menuStep(key: string, index: number, count: number) {
  if (!count) return -1
  if (key === 'ArrowDown') return (index + 1) % count
  if (key === 'ArrowUp') return index < 0 ? count - 1 : (index - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return -1
}

/** Arrow-key movement between the items of an open menu, as in a native menu. */
export function moveMenuFocus(menu: HTMLElement | undefined, event: KeyboardEvent) {
  if (!menu) return
  const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')]
  const next = menuStep(event.key, items.indexOf(document.activeElement as HTMLElement), items.length)
  if (next < 0) return
  event.preventDefault()
  items[next]?.focus()
}
