<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<!-- Search-as-you-type picker for people and departments (WAI-ARIA combobox + listbox), single or multiple. -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { Check, ChevronDown, FilePen, Search, UsersRound, X } from 'lucide-vue-next'
import { initialsOf } from '../../ui/people'
import AvatarPhoto from '../AvatarPhoto.vue'
import {
  DEFAULT_LIMIT,
  filterOptions,
  highlightParts,
  moveActive,
  pushRecent,
  toRows,
  type PickerOption,
} from './filter'

const props = withDefaults(
  defineProps<{
    options: PickerOption[]
    modelValue: string | string[]
    multiple?: boolean
    id?: string | undefined
    placeholder?: string | undefined
    disabled?: boolean
    /** localStorage key for the "Gợi ý" (recently chosen) section; leave out to turn it off. */
    recentKey?: string | undefined
    /** Chips shown before "+N". */
    chipLimit?: number
  }>(),
  { chipLimit: 3, id: undefined, placeholder: undefined, recentKey: undefined },
)
const emit = defineEmits<{ 'update:modelValue': [value: string | string[]] }>()

const uid = useId()
const inputId = computed(() => props.id ?? `pk-${uid}`)
const listId = `pk-list-${uid}`
const root = ref<HTMLElement>()
const control = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()
const open = ref(false)
const query = ref('')
const active = ref(-1)
const limit = ref(DEFAULT_LIMIT)
const expanded = ref(false)
const popup = ref({ top: 0, left: 0, width: 0, maxHeight: 320, above: false })

const selected = computed<string[]>(() =>
  props.multiple ? (props.modelValue as string[]) : [props.modelValue as string],
)
const selectedSet = computed(() => new Set(selected.value))
const byValue = computed(() => new Map(props.options.map((o) => [o.value, o])))
const single = computed(() => (props.multiple ? undefined : byValue.value.get(props.modelValue as string)))

// Recent choices, kept per browser; a blocked or full storage just means no suggestions.
const recent = ref<string[]>([])
function loadRecent() {
  if (!props.recentKey) return
  try {
    const raw = JSON.parse(localStorage.getItem(props.recentKey) ?? '[]')
    recent.value = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []
  } catch {
    recent.value = []
  }
}
function remember(value: string) {
  if (!props.recentKey || !value) return
  recent.value = pushRecent(recent.value, value)
  try {
    localStorage.setItem(props.recentKey, JSON.stringify(recent.value))
  } catch {
    /* no storage: suggestions last only for this session */
  }
}

const result = computed(() => {
  let pool = props.options
  if (!query.value.trim() && recent.value.length) {
    const suggested = recent.value
      .map((v) => byValue.value.get(v))
      .filter((o): o is PickerOption => !!o && o.kind === 'user' && !(props.multiple && selectedSet.value.has(o.value)))
      .map((o) => ({ ...o, group: 'Gợi ý' }))
    const specials = pool.filter((o) => o.kind === 'special')
    pool = [...specials, ...suggested, ...pool.filter((o) => o.kind !== 'special')]
  }
  return filterOptions(pool, query.value, limit.value)
})
const rows = computed(() => toRows(result.value.items))
const flat = computed(() => result.value.items)
const optionId = (index: number) => `${listId}-o${index}`
// Index of each option row in `flat`, by row key.
const indexOfRow = computed(() => {
  const map = new Map<string, number>()
  let i = 0
  for (const row of rows.value) if (row.type === 'option') map.set(row.key, i++)
  return map
})

function isChosen(option: PickerOption): boolean {
  if (option.kind === 'dept' && props.multiple)
    return !!option.memberIds?.length && option.memberIds.every((id) => selectedSet.value.has(id))
  return selectedSet.value.has(option.value)
}

function choose(option: PickerOption) {
  if (!props.multiple) {
    emit('update:modelValue', option.value)
    remember(option.value)
    close()
    return
  }
  const current = props.modelValue as string[]
  if (option.kind === 'dept') {
    const members = option.memberIds ?? []
    emit(
      'update:modelValue',
      members.every((id) => current.includes(id))
        ? current.filter((id) => !members.includes(id))
        : [...current, ...members.filter((id) => !current.includes(id))],
    )
  } else if (current.includes(option.value)) {
    emit('update:modelValue', current.filter((v) => v !== option.value))
  } else {
    emit('update:modelValue', [...current, option.value])
    remember(option.value)
  }
  query.value = ''
  input.value?.focus()
}
function removeChip(value: string) {
  emit('update:modelValue', (props.modelValue as string[]).filter((v) => v !== value))
  input.value?.focus()
}
function clearAll() {
  emit('update:modelValue', [])
  input.value?.focus()
}

function place() {
  const box = control.value?.getBoundingClientRect()
  if (!box) return
  const below = window.innerHeight - box.bottom - 12
  const above = box.top - 12
  const flip = below < 220 && above > below
  const room = Math.max(140, flip ? above : below)
  popup.value = {
    left: box.left,
    width: box.width,
    top: flip ? box.top - 4 : box.bottom + 4,
    maxHeight: Math.min(360, room - 4),
    above: flip,
  }
}
function onViewport(event: Event) {
  // Scrolling inside the popup itself must not close or move it.
  if (event.target instanceof Node && list.value?.contains(event.target)) return
  place()
}
function show() {
  if (props.disabled || open.value) return
  loadRecent()
  open.value = true
  limit.value = DEFAULT_LIMIT
  place()
  window.addEventListener('resize', place)
  window.addEventListener('scroll', onViewport, true)
  document.addEventListener('pointerdown', outside, true)
  active.value = -1
  seekActive()
}
function close() {
  if (!open.value) return
  open.value = false
  query.value = ''
  active.value = -1
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', onViewport, true)
  document.removeEventListener('pointerdown', outside, true)
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close()
}
onBeforeUnmount(close)

/** Start on the chosen option (single) or the first one, so Enter does something sensible. */
function seekActive() {
  const at = props.multiple ? -1 : flat.value.findIndex((o) => o.value === props.modelValue)
  active.value = at >= 0 ? at : flat.value.length ? 0 : -1
  scrollActive()
}
watch(query, () => {
  limit.value = DEFAULT_LIMIT
  active.value = flat.value.length ? 0 : -1
  if (!open.value && query.value) show()
})
function scrollActive() {
  nextTick(() => {
    if (active.value < 0) {
      if (list.value) list.value.scrollTop = 0
      return
    }
    document.getElementById(optionId(active.value))?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(event: KeyboardEvent) {
  const { key } = event
  if (key === 'Escape') {
    if (open.value) {
      // Close only the list; the dialog around it stays.
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    return
  }
  if (key === 'Backspace' && props.multiple && !query.value) {
    const list = props.modelValue as string[]
    if (list.length) {
      event.preventDefault()
      emit('update:modelValue', list.slice(0, -1))
    }
    return
  }
  if (key === 'Tab') {
    close()
    return
  }
  if (key === 'Enter') {
    if (open.value && active.value >= 0 && flat.value[active.value]) {
      event.preventDefault()
      choose(flat.value[active.value]!)
    } else if (open.value) event.preventDefault()
    return
  }
  if (!open.value && (key === 'ArrowDown' || key === 'ArrowUp')) {
    event.preventDefault()
    show()
    return
  }
  const next = moveActive(key, active.value, flat.value.length)
  if (next !== null) {
    event.preventDefault()
    if (!open.value) show()
    active.value = next
    scrollActive()
  }
}

function showMore() {
  limit.value += DEFAULT_LIMIT
  input.value?.focus()
}
function toggle() {
  if (open.value) close()
  else {
    input.value?.focus()
    show()
  }
}

const chips = computed(() => {
  if (!props.multiple) return []
  const values = props.modelValue as string[]
  return (expanded.value ? values : values.slice(0, props.chipLimit)).map((v) => ({
    value: v,
    label: byValue.value.get(v)?.label ?? v,
  }))
})
const hiddenChips = computed(() =>
  props.multiple && !expanded.value ? Math.max(0, (props.modelValue as string[]).length - props.chipLimit) : 0,
)
const count = computed(() => (props.multiple ? (props.modelValue as string[]).length : 0))
const status = computed(() => {
  if (!open.value) return ''
  const n = result.value.total
  return n ? `${n} kết quả` : 'Không có kết quả'
})
const inputPlaceholder = computed(() => {
  if (!props.multiple) return open.value ? (single.value?.label ?? props.placeholder ?? '') : ''
  return count.value ? '' : (props.placeholder ?? 'Tìm người…')
})
const shownValue = computed(() => (open.value || props.multiple ? query.value : ''))

function initials(option: PickerOption) {
  return initialsOf(option.label)
}
</script>

<template>
  <div ref="root" class="pk" :class="{ 'pk-open': open, 'pk-disabled': disabled }">
    <div ref="control" class="pk-control" :class="{ 'pk-multi': multiple }" @click="input?.focus()">
      <span v-if="!multiple && single && !open" class="pk-current" aria-hidden="true">
        <span v-if="single.kind === 'user'" class="pk-av"
          >{{ initials(single) }}<AvatarPhoto :user-id="single.userId" /></span
        ><span v-else class="pk-av pk-av-icon"><component :is="single.kind === 'dept' ? UsersRound : FilePen" :size="15" /></span>
        <span class="pk-current-text">{{ single.label }}</span>
      </span>
      <template v-if="multiple">
        <span v-for="chip in chips" :key="chip.value" class="pk-chip"
          ><span class="pk-chip-text" :title="chip.label">{{ chip.label }}</span
          ><button
            type="button"
            class="pk-chip-x"
            tabindex="-1"
            :aria-label="`Bỏ ${chip.label}`"
            :disabled="disabled"
            @click.stop="removeChip(chip.value)"
          >
            <X :size="12" aria-hidden="true" /></button
        ></span>
        <button v-if="hiddenChips" type="button" class="pk-chip pk-more" @click.stop="expanded = true">
          +{{ hiddenChips }}
        </button>
        <button v-else-if="expanded && count > chipLimit" type="button" class="pk-chip pk-more" @click.stop="expanded = false">
          Thu gọn
        </button>
      </template>
      <input
        :id="inputId"
        ref="input"
        class="pk-input"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
        :value="shownValue"
        :placeholder="inputPlaceholder"
        :disabled="disabled"
        @input="query = ($event.target as HTMLInputElement).value"
        @focus="show"
        @click="show"
        @keydown="onKeydown"
      />
      <button
        type="button"
        class="pk-caret"
        tabindex="-1"
        :aria-label="open ? 'Đóng danh sách' : 'Mở danh sách'"
        :disabled="disabled"
        @click.stop="toggle"
      >
        <ChevronDown :size="16" aria-hidden="true" />
      </button>
    </div>
    <span class="sr-only" role="status" aria-live="polite">{{ status }}</span>
    <div
      v-show="open"
      class="pk-popup"
      :class="{ 'pk-above': popup.above }"
      :style="{ left: `${popup.left}px`, top: `${popup.top}px`, width: `${popup.width}px`, maxHeight: `${popup.maxHeight}px` }"
      @mousedown.prevent
    >
      <ul
        :id="listId"
        ref="list"
        class="pk-list"
        role="listbox"
        :aria-multiselectable="multiple || undefined"
        :aria-label="placeholder ?? 'Danh sách'"
        :style="{ maxHeight: `${popup.maxHeight - (multiple && count ? 44 : 0)}px` }"
      >
        <template v-for="row in rows" :key="row.key">
          <li v-if="row.type === 'header'" class="pk-group" role="presentation">{{ row.label }}</li>
          <li
            v-else
            :id="optionId(indexOfRow.get(row.key)!)"
            class="pk-option"
            :class="{ 'pk-active': indexOfRow.get(row.key) === active, 'pk-chosen': isChosen(row.option) }"
            role="option"
            :aria-selected="isChosen(row.option)"
            @click="choose(row.option)"
            @mousemove="active = indexOfRow.get(row.key)!"
          >
            <span v-if="row.option.kind === 'user'" class="pk-av"
              >{{ initials(row.option) }}<AvatarPhoto :user-id="row.option.userId"
            /></span>
            <span v-else class="pk-av pk-av-icon"
              ><component :is="row.option.kind === 'dept' ? UsersRound : FilePen" :size="15" aria-hidden="true"
            /></span>
            <span class="pk-text">
              <span class="pk-label"
                ><template v-for="(part, i) in highlightParts(row.option.label, query)" :key="i"
                  ><mark v-if="part.match">{{ part.text }}</mark
                  ><template v-else>{{ part.text }}</template></template
                ></span
              >
              <span v-if="row.option.secondary" class="pk-sub"
                ><template v-for="(part, i) in highlightParts(row.option.secondary, query)" :key="i"
                  ><mark v-if="part.match">{{ part.text }}</mark
                  ><template v-else>{{ part.text }}</template></template
                ></span
              >
            </span>
            <span v-if="multiple && row.option.kind === 'dept'" class="pk-hint">Chọn cả phòng</span>
            <Check v-if="isChosen(row.option)" class="pk-check" :size="16" aria-hidden="true" />
          </li>
        </template>
        <li v-if="!flat.length" class="pk-empty" role="presentation">
          <Search :size="16" aria-hidden="true" />Không tìm thấy “{{ query.trim() }}”
        </li>
        <li v-if="result.truncated" class="pk-more-row" role="presentation">
          Còn {{ result.total - flat.length }} kết quả. Gõ thêm để lọc…
          <button type="button" class="pk-link" @click="showMore">Hiện thêm</button>
        </li>
      </ul>
      <div v-if="multiple && count" class="pk-foot">
        <span>Đã chọn {{ count }}</span>
        <button type="button" class="pk-link" @click="clearAll">Bỏ chọn tất cả</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pk {
  position: relative;
  min-width: 0;
}
.pk-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: var(--control-h);
  padding: 3px 6px 3px var(--control-px, 12px);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--surface);
  cursor: text;
  position: relative;
}
.pk-control:hover {
  border-color: var(--muted);
}
.pk-control:focus-within {
  border-color: var(--focus);
  box-shadow: var(--focus-ring);
}
.pk-disabled .pk-control {
  opacity: 0.6;
  cursor: not-allowed;
}
.pk .pk-input {
  flex: 1 1 80px;
  min-width: 60px;
  width: auto;
  min-height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  outline: none;
}
.pk .pk-input:focus {
  box-shadow: none;
}
.pk-current {
  position: absolute;
  inset: 3px 36px 3px var(--control-px, 12px);
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  min-width: 0;
}
.pk-current-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pk-caret {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: auto;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
}
.pk-caret:hover {
  background: var(--surface-2);
}
.pk-open .pk-caret svg {
  transform: rotate(180deg);
}
.pk-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
  height: 28px;
  padding: 0 4px 0 10px;
  border: 0;
  border-radius: 999px;
  background: var(--teal-soft);
  color: var(--teal-ink);
  font-size: 0.8125rem;
  font-weight: 500;
}
.pk-chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
.pk-chip-x {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
}
.pk-chip-x:hover {
  background: var(--surface-4);
}
.pk-more {
  padding: 0 10px;
}
.pk-more:hover {
  background: var(--surface-3);
}
.pk-av {
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: linear-gradient(140deg, var(--teal-soft), var(--surface-3));
  color: var(--teal-ink);
  font-size: 0.6875rem;
  font-weight: 600;
}
.pk-av-icon {
  background: var(--surface-3);
}
.pk-popup {
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.pk-above {
  transform: translateY(-100%);
}
.pk-list {
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.pk-group {
  position: sticky;
  top: -4px;
  z-index: 1;
  padding: 8px 10px 4px;
  background: var(--surface);
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.pk-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.pk-active {
  background: var(--surface-2);
  box-shadow: inset 2px 0 0 var(--focus);
}
.pk-chosen .pk-label {
  font-weight: 600;
}
.pk-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.pk-label,
.pk-sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pk-label {
  font-size: 0.9375rem;
  line-height: 1.3;
}
.pk-sub {
  color: var(--muted);
  font-size: 0.8125rem;
  line-height: 1.3;
}
.pk-text mark {
  padding: 0;
  border-radius: 2px;
  background: color-mix(in srgb, var(--focus) 22%, transparent);
  color: inherit;
}
.pk-hint {
  color: var(--muted);
  font-size: 0.75rem;
  white-space: nowrap;
}
.pk-check {
  flex: none;
  color: var(--focus);
}
.pk-empty,
.pk-more-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px;
  color: var(--muted);
  font-size: 0.8125rem;
}
.pk-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--muted);
  font-size: 0.8125rem;
}
.pk-link {
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--focus);
  font-size: 0.8125rem;
  font-weight: 600;
}
.pk-link:hover {
  text-decoration: underline;
}
@media (pointer: coarse) {
  .pk-option {
    min-height: 48px;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .pk-caret svg {
    transition: transform 0.15s;
  }
}
</style>
