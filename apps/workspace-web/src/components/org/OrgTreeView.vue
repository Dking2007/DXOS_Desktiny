<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<!-- The organisation as an indented outline: folds, counts, warnings and the people in each unit. -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Building2, ChevronRight, ChevronsDownUp, ChevronsUpDown, Crown, Landmark, TriangleAlert, UserX, Users } from 'lucide-vue-next'
import type { User } from '@dx/web-shared/types.ts'
import { roleLabel } from '../../ui/labels'
import HighlightText from './HighlightText.vue'
import OrgAvatar from './OrgAvatar.vue'
import {
  descendantsOf,
  ROOT_ID,
  UNASSIGNED_ID,
  WARNING_LABELS,
  withAncestors,
  type OrgNode,
  type OrgSearch,
  type OrgTree,
} from './orgTree'

const props = defineProps<{
  tree: OrgTree
  rootTitle: string
  query: string
  search: OrgSearch
  attention: Set<string> | null
  role: string
  selected: string | null
}>()
const emit = defineEmits<{ open: [id: string] }>()

const showMembers = ref(true)
const expanded = ref(new Set<string>())
function defaultExpanded() {
  const small = props.tree.byId.size <= 24
  return new Set([
    ROOT_ID,
    ...[...props.tree.byId.values()].filter((node) => small || node.depth < 2).map((node) => node.id),
  ])
}
expanded.value = defaultExpanded()
watch(
  () => props.search,
  (search) => {
    if (search.expand.size) expanded.value = new Set([...expanded.value, ROOT_ID, ...search.expand])
  },
)
watch(
  () => props.attention,
  (attention) => {
    if (attention) expanded.value = new Set([...expanded.value, ROOT_ID, ...withAncestors(props.tree, attention)])
  },
)
function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}
function expandAll() {
  expanded.value = new Set([ROOT_ID, UNASSIGNED_ID, ...props.tree.byId.keys()])
}
function collapseAll() {
  expanded.value = new Set([ROOT_ID])
}

const searching = computed(() => !!props.query.trim())
// Which departments stay in the outline while searching or looking at warnings.
const visible = computed<Set<string> | null>(() => {
  if (searching.value) {
    const homes = props.tree.users
      .filter((user) => props.search.members.has(user.id) && user.department_id)
      .map((user) => user.department_id!)
    const ids = withAncestors(props.tree, [...props.search.departments, ...homes])
    for (const id of props.search.departments) for (const below of descendantsOf(props.tree, id)) ids.add(below)
    return ids
  }
  if (props.attention) return withAncestors(props.tree, props.attention)
  return null
})
function peopleOf(users: User[], departmentMatched: boolean) {
  return users.filter((user) => {
    if (props.role && (user.role || 'staff') !== props.role) return false
    if (searching.value && !departmentMatched) return props.search.members.has(user.id)
    return true
  })
}

type Row =
  | { kind: 'root'; key: string; level: number }
  | { kind: 'department'; key: string; level: number; node: OrgNode }
  | { kind: 'bucket'; key: string; level: number }
  | { kind: 'person'; key: string; level: number; user: User; leads: boolean }
  | { kind: 'empty'; key: string; level: number; text: string }

const rows = computed<Row[]>(() => {
  const result: Row[] = [{ kind: 'root', key: ROOT_ID, level: 0 }]
  if (!expanded.value.has(ROOT_ID)) return result
  if (showMembers.value)
    for (const user of peopleOf(props.tree.board, false))
      result.push({ kind: 'person', key: `${ROOT_ID}:${user.id}`, level: 1, user, leads: true })
  const visit = (node: OrgNode, level: number) => {
    if (visible.value && !visible.value.has(node.id)) return
    result.push({ kind: 'department', key: node.id, level, node })
    if (!expanded.value.has(node.id)) return
    if (showMembers.value) {
      const people = peopleOf(node.members, props.search.departments.has(node.id))
      for (const user of people)
        result.push({ kind: 'person', key: `${node.id}:${user.id}`, level: level + 1, user, leads: user.id === node.leader?.id })
      if (!people.length && !node.children.length && !searching.value)
        result.push({
          kind: 'empty',
          key: `${node.id}:empty`,
          level: level + 1,
          text: props.role && node.members.length ? 'Không có ai thuộc vai trò đang lọc' : 'Chưa có thành viên',
        })
    }
    for (const child of node.children) visit(child, level + 1)
  }
  for (const root of props.tree.roots) visit(root, 1)
  const waiting = peopleOf(props.tree.unassigned, false)
  if (props.tree.unassigned.length && (!visible.value || (searching.value && waiting.length))) {
    result.push({ kind: 'bucket', key: UNASSIGNED_ID, level: 1 })
    if (expanded.value.has(UNASSIGNED_ID) && showMembers.value)
      for (const user of waiting) result.push({ kind: 'person', key: `${UNASSIGNED_ID}:${user.id}`, level: 2, user, leads: false })
  }
  return result
})
const nothingFound = computed(
  () => searching.value && !props.search.members.size && !props.search.departments.size,
)
const indent = (level: number) => ({ '--level': level })
</script>
<template>
  <div class="org-tree-wrap">
    <div class="org-tree-tools">
      <button class="button ghost small" type="button" @click="expandAll"><ChevronsUpDown :size="16" />Mở hết</button>
      <button class="button ghost small" type="button" @click="collapseAll"><ChevronsDownUp :size="16" />Thu gọn</button>
      <label class="org-check"><input v-model="showMembers" type="checkbox" />Hiện thành viên</label>
    </div>
    <ul class="org-tree" aria-label="Cây tổ chức">
      <li
        v-for="row in rows"
        :key="row.key"
        class="org-row"
        :class="[
          `is-${row.kind}`,
          {
            selected:
              (row.kind === 'department' && selected === row.node.id) ||
              (row.kind === 'root' && selected === ROOT_ID) ||
              (row.kind === 'bucket' && selected === UNASSIGNED_ID),
          },
        ]"
        :style="indent(row.level)"
      >
        <template v-if="row.kind === 'root'">
          <button
            class="org-chevron"
            type="button"
            :aria-expanded="expanded.has(ROOT_ID)"
            :aria-label="`${expanded.has(ROOT_ID) ? 'Thu gọn' : 'Mở'} ${rootTitle}`"
            @click="toggle(ROOT_ID)"
          >
            <ChevronRight :size="16" :class="{ open: expanded.has(ROOT_ID) }" />
          </button>
          <Landmark :size="18" class="org-row-icon" aria-hidden="true" />
          <button class="org-row-name" type="button" @click="emit('open', ROOT_ID)">
            <strong class="org-ellipsis" :title="rootTitle">{{ rootTitle }}</strong>
          </button>
          <span class="org-row-counts">
            <span class="org-badge" :title="`${tree.users.length} người trong tổ chức`"><Users :size="12" aria-hidden="true" />{{ tree.users.length }}</span>
            <span class="org-badge" :title="`${tree.byId.size} phòng ban`"><Building2 :size="12" aria-hidden="true" />{{ tree.byId.size }}</span>
          </span>
        </template>
        <template v-else-if="row.kind === 'department'">
          <button
            v-if="row.node.children.length || row.node.members.length"
            class="org-chevron"
            type="button"
            :aria-expanded="expanded.has(row.node.id)"
            :aria-label="`${expanded.has(row.node.id) ? 'Thu gọn' : 'Mở'} ${row.node.department.name}`"
            @click="toggle(row.node.id)"
          >
            <ChevronRight :size="16" :class="{ open: expanded.has(row.node.id) }" />
          </button>
          <span v-else class="org-chevron-space" aria-hidden="true" />
          <Building2 :size="18" class="org-row-icon" aria-hidden="true" />
          <button class="org-row-name" type="button" :title="`Mở chi tiết ${row.node.department.name}`" @click="emit('open', row.node.id)">
            <strong class="org-ellipsis"><HighlightText :text="row.node.department.name" :query="query" /></strong>
            <span v-if="row.node.department.code" class="tag mono"><HighlightText :text="row.node.department.code" :query="query" /></span>
          </button>
          <span class="org-row-leader org-ellipsis" :class="{ missing: !row.node.leader }">
            <Crown v-if="row.node.leader" :size="14" aria-hidden="true" />
            <HighlightText :text="row.node.leader?.display_name ?? 'Chưa có lãnh đạo'" :query="row.node.leader ? query : ''" />
          </span>
          <span class="org-row-counts">
            <span
              class="org-badge"
              :title="row.node.totalMembers > row.node.members.length ? `${row.node.members.length} người trực tiếp, ${row.node.totalMembers} người cả khối` : `${row.node.members.length} người`"
              ><Users :size="12" aria-hidden="true" />{{ row.node.members.length
              }}<template v-if="row.node.totalMembers > row.node.members.length"> / {{ row.node.totalMembers }}</template></span
            >
            <span v-if="row.node.children.length" class="org-badge" :title="`${row.node.children.length} phòng con`"
              ><Building2 :size="12" aria-hidden="true" />{{ row.node.children.length }}</span
            >
            <span
              v-for="warning in row.node.warnings"
              :key="warning"
              class="org-badge"
              :class="warning === 'cycle' || warning === 'missing_parent' ? 'danger' : 'warn'"
              ><TriangleAlert :size="12" aria-hidden="true" />{{ WARNING_LABELS[warning] }}</span
            >
          </span>
        </template>
        <template v-else-if="row.kind === 'bucket'">
          <button
            class="org-chevron"
            type="button"
            :aria-expanded="expanded.has(UNASSIGNED_ID)"
            :aria-label="`${expanded.has(UNASSIGNED_ID) ? 'Thu gọn' : 'Mở'} danh sách chưa xếp phòng`"
            @click="toggle(UNASSIGNED_ID)"
          >
            <ChevronRight :size="16" :class="{ open: expanded.has(UNASSIGNED_ID) }" />
          </button>
          <UserX :size="18" class="org-row-icon" aria-hidden="true" />
          <button class="org-row-name" type="button" @click="emit('open', UNASSIGNED_ID)">
            <strong>Chưa xếp phòng</strong>
          </button>
          <span class="org-row-counts">
            <span class="org-badge warn"><Users :size="12" aria-hidden="true" />{{ tree.unassigned.length }}</span>
          </span>
        </template>
        <template v-else-if="row.kind === 'person'">
          <span class="org-chevron-space" aria-hidden="true" />
          <span class="org-person">
            <OrgAvatar :user="row.user" />
            <span class="org-person-text">
              <strong class="org-ellipsis"><HighlightText :text="row.user.display_name" :query="query" /></strong>
              <small class="org-ellipsis">{{ [roleLabel(row.user.role), row.user.job_title].filter(Boolean).join(' · ') }}</small>
            </span>
          </span>
          <span v-if="row.leads" class="org-badge ok"><Crown :size="12" aria-hidden="true" />Lãnh đạo</span>
        </template>
        <template v-else>
          <span class="org-chevron-space" aria-hidden="true" />
          <span class="muted org-row-empty">{{ row.text }}</span>
        </template>
      </li>
    </ul>
    <p v-if="nothingFound" class="org-tree-none muted">Không tìm thấy phòng ban hay thành viên nào khớp “{{ query.trim() }}”.</p>
  </div>
</template>
<style scoped>
.org-tree-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
}
.org-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--ink-2);
  cursor: pointer;
}
.org-tree {
  margin: 0;
  padding: 8px 0;
  list-style: none;
}
.org-row {
  --indent: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 6px 24px 6px calc(12px + var(--level, 0) * var(--indent));
  border-left: 3px solid transparent;
  transition: background 0.12s;
}
.org-row:hover {
  background: var(--surface-2);
}
.org-row.selected {
  background: var(--teal-soft);
  border-left-color: var(--teal);
}
.org-row.is-person,
.org-row.is-empty {
  min-height: 44px;
}
.org-row.is-root {
  border-bottom: 1px solid var(--border-soft);
}
.org-chevron,
.org-chevron-space {
  flex: none;
  width: 32px;
  height: 32px;
}
.org-chevron {
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
}
.org-chevron:hover {
  background: var(--surface-3);
  color: var(--navy);
}
.org-chevron svg {
  transition: transform 0.15s;
}
.org-chevron svg.open {
  transform: rotate(90deg);
}
.org-row-icon {
  flex: none;
  color: var(--muted);
}
.is-root .org-row-icon {
  color: var(--teal);
}
.is-bucket .org-row-icon {
  color: var(--amber-ink);
}
.org-row-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 36px;
  padding: 4px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--navy);
  text-align: left;
  font-size: 0.9375rem;
}
.org-row-name:hover {
  background: var(--surface-3);
}
.org-row-name strong {
  font-weight: 600;
}
.org-row-name .tag {
  flex: none;
}
.org-row-leader {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  color: var(--ink-2);
}
.org-row-leader svg {
  flex: none;
  color: var(--amber-ink);
}
.org-row-leader.missing {
  color: var(--muted);
  font-style: italic;
}
.org-row-counts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.is-person .org-person {
  flex: 1;
}
.org-row-empty {
  font-size: 0.875rem;
}
.org-tree-none {
  margin: 0;
  padding: 0 24px 24px;
  font-size: 0.875rem;
}
@media (max-width: 640px) {
  .org-tree-tools {
    padding: 12px 16px;
  }
  /* Name stays beside its chevron; leader and counts drop to a second line under the name. */
  .org-row {
    --indent: 16px;
    flex-wrap: wrap;
    row-gap: 4px;
    padding-right: 16px;
  }
  .org-row-name {
    flex: 1 1 0;
  }
  .org-row-name .tag {
    display: none;
  }
  .org-row-leader,
  .org-row-counts {
    flex-basis: 100%;
    justify-content: flex-start;
    margin-left: 0;
    padding-left: 66px;
  }
  .is-person .org-person {
    flex: 1 1 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-motion='full']) .org-chevron svg {
    transition: none;
  }
}
</style>
