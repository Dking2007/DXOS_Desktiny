<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { fold } from '@dx/web-shared/text.ts'
import { KINDS } from './nodes'
import type { NodeKind } from './nodes'
import type { PluginStep } from './pluginNodes'

/** Small searchable list of step kinds, opened next to a "+" on the canvas. */
const props = defineProps<{
  title: string
  kinds: NodeKind[]
  plugins?: PluginStep[]
  /** Where to open, in pixels inside the canvas; kept on screen. */
  x: number
  y: number
}>()
const emit = defineEmits<{ pick: [kind: NodeKind]; plugin: [step: PluginStep]; close: [] }>()
const root = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
const query = ref('')
const active = ref(0)
const place = ref({ left: props.x, top: props.y })

type Choice = { key: string; group: string; title: string; hint: string; kind: NodeKind; step?: PluginStep }
const ORDER = ['Bước cần người', 'Logic', 'Hành động', 'Dữ liệu và tài liệu', 'Plugin']
const choices = computed<Choice[]>(() => {
  const needle = fold(query.value.trim())
  const all: Choice[] = [
    ...props.kinds.map((kind) => ({
      key: kind,
      group: KINDS[kind].group,
      title: KINDS[kind].title,
      hint: KINDS[kind].hint,
      kind,
    })),
    ...(props.plugins ?? []).map((step) => ({
      key: `${step.plugin_id}:${step.kind}`,
      group: 'Plugin',
      title: step.title,
      hint: step.plugin_name,
      kind: 'plugin_action' as NodeKind,
      step,
    })),
  ]
  return all
    .filter((item) => !needle || fold(`${item.title} ${item.hint} ${item.group}`).includes(needle))
    .sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group))
})
watch(query, () => (active.value = 0))

function choose(item: Choice | undefined) {
  if (!item) return
  if (item.step) emit('plugin', item.step)
  else emit('pick', item.kind)
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const count = choices.value.length
    if (!count) return
    active.value = (active.value + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
    void nextTick(() => root.value?.querySelector('.picker-item.active')?.scrollIntoView({ block: 'nearest' }))
  } else if (event.key === 'Enter') {
    event.preventDefault()
    choose(choices.value[active.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  }
}
function onPointer(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) emit('close')
}
onMounted(async () => {
  document.addEventListener('pointerdown', onPointer, true)
  await nextTick()
  const box = root.value
  const parent = box?.offsetParent as HTMLElement | null
  if (box && parent) {
    const left = Math.min(Math.max(8, props.x), parent.clientWidth - box.offsetWidth - 8)
    const top = Math.min(Math.max(8, props.y - 24), parent.clientHeight - box.offsetHeight - 8)
    place.value = { left: Math.max(8, left), top: Math.max(8, top) }
  }
  input.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointer, true))
</script>
<template>
  <div
    ref="root"
    class="step-picker"
    role="dialog"
    :aria-label="title"
    :style="{ left: `${place.left}px`, top: `${place.top}px` }"
    @keydown="onKey"
  >
    <header>
      <strong>{{ title }}</strong>
      <button type="button" class="icon-button" aria-label="Đóng" title="Đóng (Esc)" @click="emit('close')">
        <X :size="16" />
      </button>
    </header>
    <label class="search-box"
      ><Search :size="15" /><input
        ref="input"
        v-model="query"
        type="search"
        placeholder="Tìm bước…"
        aria-label="Tìm loại bước"
        aria-controls="step-picker-list"
        :aria-activedescendant="choices[active] ? `pick-${choices[active].key}` : undefined"
    /></label>
    <div id="step-picker-list" class="picker-list" role="listbox" :aria-label="title">
      <p v-if="!choices.length" class="muted">Không có bước nào khớp “{{ query }}”.</p>
      <template v-for="(item, index) in choices" :key="item.key">
        <span v-if="index === 0 || choices[index - 1]!.group !== item.group" class="section-label">{{
          item.group
        }}</span>
        <button
          :id="`pick-${item.key}`"
          type="button"
          role="option"
          class="palette-item picker-item"
          :class="{ active: index === active }"
          :aria-selected="index === active"
          :style="{ '--node-color': KINDS[item.kind].color }"
          @mouseenter="active = index"
          @click="choose(item)"
        >
          <span class="flow-node-icon small"><component :is="KINDS[item.kind].icon" :size="16" /></span>
          <span class="grow"
            ><strong>{{ item.title }}</strong><small>{{ item.hint }}</small></span
          >
        </button>
      </template>
    </div>
    <p class="picker-foot muted"><kbd>↑</kbd> <kbd>↓</kbd> chọn · <kbd>Enter</kbd> thêm · <kbd>Esc</kbd> đóng</p>
  </div>
</template>
