<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<!-- A task's history drawn as a workflow: main steps as nodes on a line, side notes as small dots.
     The card folds down to its latest step; the choice is remembered on this device. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Ban,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  FilePlus2,
  Paperclip,
  PenLine,
  Play,
  RotateCcw,
  Send,
  UserRoundPlus,
  Workflow,
} from 'lucide-vue-next'
import { formatDate } from '@dx/web-shared/api.ts'
import { activitySteps, toStep } from '../ui/taskActivity'
import type { ActivityEvent } from '../ui/taskActivity'

const props = defineProps<{ events: ActivityEvent[] }>()

const ICONS: Record<string, unknown> = {
  created: FilePlus2,
  assigned: UserRoundPlus,
  accept: Check,
  start: Play,
  submit: Send,
  complete: CheckCheck,
  return: RotateCcw,
  block: CircleAlert,
  unblock: Play,
  cancel: Ban,
  due_changed: CalendarClock,
  automation_attached: Workflow,
  automation_detached: Workflow,
  files_changed: Paperclip,
  updated: PenLine,
}
const KEY = 'dx-task-activity-collapsed'
function load() {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
const collapsed = ref(load())
function toggle() {
  collapsed.value = !collapsed.value
  try {
    window.localStorage.setItem(KEY, collapsed.value ? '1' : '0')
  } catch {
    /* private window: the card still folds, it just isn't remembered */
  }
}
const showAll = ref(false)
const view = computed(() =>
  activitySteps(props.events, showAll.value ? undefined : 6),
)
const latest = computed(() => {
  const last = props.events[props.events.length - 1]
  return last ? toStep(last) : null
})
const bodyId = `task-activity-${Math.random().toString(36).slice(2, 8)}`
</script>
<template>
  <section class="card activity" :class="{ 'is-collapsed': collapsed }">
    <header class="card-header activity-head">
      <button
        type="button"
        class="activity-toggle"
        :aria-expanded="!collapsed"
        :aria-controls="bodyId"
        @click="toggle"
      >
        <h3>Hoạt động</h3>
        <span class="activity-count">{{ events.length }}</span>
        <ChevronDown :size="18" class="activity-chevron" aria-hidden="true" />
        <span class="sr-only">{{ collapsed ? 'Mở rộng' : 'Thu gọn' }}</span>
      </button>
    </header>
    <button
      v-if="collapsed && latest"
      type="button"
      class="activity-latest"
      @click="toggle"
    >
      <span
        class="node small"
        :class="`tone-${latest.tone}`"
        aria-hidden="true"
      >
        <component :is="ICONS[latest.action] ?? PenLine" :size="13" />
      </span>
      <span class="activity-latest-text">
        <strong>{{ latest.label }}</strong>
        <small>{{ latest.actor }} · {{ formatDate(latest.at, true) }}</small>
      </span>
    </button>
    <div v-show="!collapsed" :id="bodyId" class="card-body">
      <p v-if="!events.length" class="muted">Chưa có hoạt động nào.</p>
      <button
        v-if="view.hidden"
        type="button"
        class="button ghost small activity-more"
        @click="showAll = true"
      >
        Hiện {{ view.hidden }} bước trước
      </button>
      <ol class="flow">
        <li
          v-for="(step, index) in view.steps"
          :key="step.id"
          class="flow-step"
          :class="[
            `tone-${step.tone}`,
            { minor: !step.major, current: index === view.steps.length - 1 },
          ]"
        >
          <span
            class="node"
            :class="[`tone-${step.tone}`, { small: !step.major }]"
            aria-hidden="true"
          >
            <component
              :is="ICONS[step.action] ?? PenLine"
              :size="step.major ? 15 : 12"
            />
          </span>
          <div class="flow-body">
            <p class="flow-title">
              {{ step.label
              }}<span v-if="index === view.steps.length - 1" class="flow-now"
                >Mới nhất</span
              >
            </p>
            <small class="flow-meta"
              >{{ step.actor || 'Hệ thống' }} ·
              {{ formatDate(step.at, true) }}</small
            >
            <small v-if="step.note" class="flow-note">{{ step.note }}</small>
            <blockquote v-if="step.reason" class="flow-reason">
              {{ step.reason }}
            </blockquote>
          </div>
        </li>
      </ol>
      <button
        v-if="showAll && events.length > 7"
        type="button"
        class="button ghost small activity-more"
        @click="showAll = false"
      >
        Chỉ hiện các bước gần đây
      </button>
    </div>
  </section>
</template>
<style scoped>
.activity-head {
  padding: 0;
}
.activity-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: var(--space-5) var(--space-6);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: inherit;
}
.activity-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.activity-toggle h3 {
  margin: 0;
}
.activity-count {
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}
.activity-chevron {
  margin-left: auto;
  color: var(--muted);
  transition: transform 0.18s;
}
.is-collapsed .activity-chevron {
  transform: rotate(-90deg);
}
.activity-latest {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px var(--space-6) 14px;
  border: 0;
  border-top: 1px solid var(--border);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.activity-latest:hover {
  background: var(--surface-2);
}
.activity-latest-text {
  display: grid;
  min-width: 0;
}
.activity-latest-text strong {
  font-size: 0.875rem;
}
.activity-latest-text small {
  color: var(--muted);
  font-size: 0.75rem;
}
.activity-more {
  margin: 0 0 12px 34px;
}
.flow {
  margin: 0;
  padding: 0;
  list-style: none;
}
.flow-step {
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  padding-bottom: 16px;
}
/* The connector runs from this node down to the next one. */
.flow-step::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 30px;
  bottom: 0;
  width: 2px;
  border-radius: 2px;
  background: var(--border);
}
.flow-step:last-child {
  padding-bottom: 0;
}
.flow-step:last-child::before {
  display: none;
}
.flow-step.minor .flow-title {
  font-weight: 500;
  color: var(--muted);
}
.node {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--tone-line);
  background: var(--tone-soft);
  color: var(--tone-ink);
}
.node.small {
  width: 22px;
  height: 22px;
  margin: 4px;
  border-width: 1px;
}
.activity-latest .node.small {
  margin: 0;
}
.tone-start,
.tone-note {
  --tone-ink: var(--muted);
  --tone-soft: var(--surface-3);
  --tone-line: var(--border);
}
.tone-progress {
  --tone-ink: var(--teal-ink);
  --tone-soft: var(--teal-soft);
  --tone-line: var(--teal-line);
}
.tone-done {
  --tone-ink: var(--green-ink);
  --tone-soft: var(--green-soft);
  --tone-line: var(--green-line);
}
.tone-warn {
  --tone-ink: var(--amber-ink);
  --tone-soft: var(--amber-soft);
  --tone-line: var(--amber-line);
}
.tone-stop {
  --tone-ink: var(--red-ink);
  --tone-soft: var(--red-soft);
  --tone-line: var(--red-line);
}
.flow-step.current .node {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--tone-line) 45%, transparent);
}
.flow-body {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding-top: 4px;
}
.flow-step.minor .flow-body {
  padding-top: 5px;
}
.flow-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}
.flow-now {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--tone-soft);
  color: var(--tone-ink);
  font-size: 0.6875rem;
  font-weight: 600;
}
.flow-meta,
.flow-note {
  color: var(--muted);
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}
.flow-note {
  color: inherit;
}
.flow-reason {
  margin: 6px 0 0;
  padding: 6px 10px;
  border-left: 3px solid var(--tone-line);
  border-radius: 0 8px 8px 0;
  background: var(--tone-soft);
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
@media (prefers-reduced-motion: reduce) {
  .activity-chevron {
    transition: none;
  }
}
</style>
