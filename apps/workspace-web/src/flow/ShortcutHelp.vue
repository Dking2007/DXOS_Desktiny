<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Keyboard, X } from 'lucide-vue-next'
import { isMac, shortcutHelp } from './shortcuts'

/** Popover listing every canvas shortcut; opened with "?" or the keyboard button. */
const emit = defineEmits<{ close: [] }>()
const groups = shortcutHelp(isMac())
const root = ref<HTMLElement>()
const closer = ref<HTMLButtonElement>()
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
  }
}
function onPointer(event: PointerEvent) {
  const target = event.target as HTMLElement
  if (root.value && !root.value.contains(target) && !target.closest?.('[data-shortcut-toggle]')) emit('close')
}
onMounted(() => {
  document.addEventListener('pointerdown', onPointer, true)
  closer.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointer, true))
</script>
<template>
  <section
    ref="root"
    class="shortcut-help"
    role="dialog"
    aria-labelledby="shortcut-help-title"
    @keydown="onKey"
  >
    <header>
      <Keyboard :size="17" aria-hidden="true" />
      <strong id="shortcut-help-title" class="grow">Phím tắt trên canvas</strong>
      <button ref="closer" type="button" class="icon-button" aria-label="Đóng bảng phím tắt" title="Đóng (Esc)" @click="emit('close')">
        <X :size="16" />
      </button>
    </header>
    <div class="shortcut-groups">
      <div v-for="group in groups" :key="group.group">
        <span class="section-label">{{ group.group }}</span>
        <dl>
          <template v-for="item in group.items" :key="item.label">
            <dt>
              <template v-for="(key, index) in item.keys" :key="key"
                ><kbd>{{ key }}</kbd
                ><span v-if="index < item.keys.length - 1" class="muted" aria-hidden="true">+</span></template
              >
            </dt>
            <dd>{{ item.label }}</dd>
          </template>
        </dl>
      </div>
    </div>
    <p class="muted">Phím tắt không chạy khi bạn đang gõ trong ô nhập hoặc khi có hộp thoại đang mở.</p>
  </section>
</template>
