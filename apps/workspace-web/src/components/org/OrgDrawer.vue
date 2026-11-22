<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<!-- Side panel for one unit of the organisation: who leads it, who is in it, what sits below,
     and the changes an organisation manager can make from there. -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowRightLeft,
  Building2,
  ChevronRight,
  Crown,
  FolderPlus,
  Pencil,
  TriangleAlert,
  UserPlus,
  Users,
  X,
} from 'lucide-vue-next'
import type { User } from '@dx/web-shared/types.ts'
import { roleLabel } from '../../ui/labels'
import OrgAvatar from './OrgAvatar.vue'
import { ancestorsOf, ROOT_ID, UNASSIGNED_ID, WARNING_LABELS, type OrgTree } from './orgTree'

const props = defineProps<{
  tree: OrgTree
  target: string
  rootTitle: string
  role: string
  canManage: boolean
}>()
const emit = defineEmits<{
  close: []
  open: [id: string]
  edit: [id: string]
  addMember: [departmentId: string | null]
  assign: [userId: string | null, departmentId: string | null]
  addChild: [parentId: string | null]
}>()

const dialog = ref<HTMLDialogElement>()
const heading = ref<HTMLElement>()
let previous: Element | null = null
onMounted(async () => {
  previous = document.activeElement
  await nextTick()
  dialog.value?.showModal()
  heading.value?.focus()
})
onBeforeUnmount(() => {
  if (previous instanceof HTMLElement) previous.focus()
})
watch(
  () => props.target,
  async () => {
    await nextTick()
    heading.value?.focus()
  },
)

const node = computed(() => props.tree.byId.get(props.target) ?? null)
const kind = computed(() =>
  props.target === ROOT_ID ? 'root' : props.target === UNASSIGNED_ID ? 'bucket' : node.value ? 'department' : 'missing',
)
const trail = computed(() =>
  node.value
    ? ancestorsOf(props.tree, node.value.id)
        .reverse()
        .map((id) => props.tree.byId.get(id)!)
    : [],
)
const roleFiltered = (users: User[]) => (props.role ? users.filter((user) => (user.role || 'staff') === props.role) : users)
const people = computed(() => {
  if (kind.value === 'root') return roleFiltered(props.tree.board)
  if (kind.value === 'bucket') return roleFiltered(props.tree.unassigned)
  return roleFiltered(node.value?.members ?? [])
})
const allPeople = computed(() =>
  kind.value === 'root' ? props.tree.board : kind.value === 'bucket' ? props.tree.unassigned : (node.value?.members ?? []),
)
const children = computed(() => (kind.value === 'root' ? props.tree.roots : (node.value?.children ?? [])))
const leaderHome = computed(() => {
  const leader = node.value?.leader
  if (!leader || leader.department_id === node.value?.id) return ''
  const home = leader.department_id ? props.tree.byId.get(leader.department_id) : null
  return home ? `Thuộc ${home.department.name}` : 'Chưa xếp phòng'
})
const title = computed(() =>
  kind.value === 'root'
    ? props.rootTitle
    : kind.value === 'bucket'
      ? 'Chưa xếp phòng'
      : (node.value?.department.name ?? 'Phòng ban không còn tồn tại'),
)
const peopleTitle = computed(() => (kind.value === 'root' ? 'Ban giám đốc' : kind.value === 'bucket' ? 'Người chưa thuộc phòng nào' : 'Thành viên'))
const departmentId = computed(() => (kind.value === 'department' ? props.target : null))
const describe = (user: User) => [roleLabel(user.role), user.job_title].filter(Boolean).join(' · ')
</script>
<template>
  <dialog
    ref="dialog"
    class="org-drawer"
    aria-labelledby="org-drawer-title"
    @cancel.prevent="emit('close')"
    @click="
      (event) => {
        if (event.target === dialog) emit('close')
      }
    "
  >
    <header class="org-drawer-head">
      <div class="org-drawer-title">
        <span class="eyebrow">{{ kind === 'root' ? 'Tổ chức' : kind === 'bucket' ? 'Danh sách' : 'Phòng ban' }}</span>
        <nav v-if="trail.length" class="org-trail" aria-label="Thuộc khối">
          <button type="button" class="org-trail-link" @click="emit('open', ROOT_ID)">{{ rootTitle }}</button>
          <template v-for="item in trail" :key="item.id"
            ><ChevronRight :size="14" aria-hidden="true" /><button type="button" class="org-trail-link" @click="emit('open', item.id)">
              {{ item.department.name }}
            </button></template
          >
        </nav>
        <h2 id="org-drawer-title" ref="heading" tabindex="-1">{{ title }}</h2>
        <div v-if="node" class="org-badges">
          <span v-if="node.department.code" class="tag mono">{{ node.department.code }}</span>
          <span
            v-for="warning in node.warnings"
            :key="warning"
            class="org-badge"
            :class="warning === 'cycle' || warning === 'missing_parent' ? 'danger' : 'warn'"
            ><TriangleAlert :size="12" aria-hidden="true" />{{ WARNING_LABELS[warning] }}</span
          >
        </div>
      </div>
      <button class="icon-button" type="button" aria-label="Đóng bảng chi tiết" title="Đóng (Esc)" @click="emit('close')">
        <X :size="20" />
      </button>
    </header>

    <div class="org-drawer-body">
      <p v-if="kind === 'missing'" class="muted">Phòng ban này đã bị đổi hoặc không còn trong danh sách. Hãy đóng bảng và chọn lại.</p>

      <dl v-if="kind !== 'missing'" class="org-facts">
        <div>
          <dt>{{ kind === 'bucket' ? 'Số người' : 'Thành viên trực tiếp' }}</dt>
          <dd>{{ allPeople.length }}</dd>
        </div>
        <div v-if="node && node.totalMembers !== node.members.length">
          <dt>Cả khối</dt>
          <dd>{{ node.totalMembers }}</dd>
        </div>
        <div v-if="kind === 'root'">
          <dt>Cả tổ chức</dt>
          <dd>{{ tree.users.length }}</dd>
        </div>
        <div v-if="kind !== 'bucket'">
          <dt>Phòng con</dt>
          <dd>{{ children.length }}</dd>
        </div>
      </dl>

      <div v-if="canManage && kind !== 'missing'" class="org-actions">
        <button v-if="kind === 'department'" class="button secondary small" type="button" @click="emit('edit', target)">
          <Pencil :size="16" />Chỉnh sửa phòng ban
        </button>
        <button class="button secondary small" type="button" @click="emit('addMember', departmentId)">
          <UserPlus :size="16" />{{ kind === 'department' ? 'Thêm thành viên vào phòng này' : 'Thêm thành viên' }}
        </button>
        <button
          v-if="kind === 'department'"
          class="button secondary small"
          type="button"
          :disabled="!tree.users.some((user) => user.department_id !== target)"
          title="Chuyển một người đã có tài khoản vào phòng này"
          @click="emit('assign', null, target)"
        >
          <ArrowRightLeft :size="16" />Xếp người có sẵn vào phòng
        </button>
        <button v-if="kind !== 'bucket'" class="button secondary small" type="button" @click="emit('addChild', departmentId)">
          <FolderPlus :size="16" />{{ kind === 'root' ? 'Thêm phòng ban' : 'Thêm phòng con' }}
        </button>
      </div>

      <section v-if="kind === 'department'" class="org-section" aria-labelledby="org-leader-title">
        <h3 id="org-leader-title">Lãnh đạo</h3>
        <div v-if="node?.leader" class="org-person">
          <OrgAvatar :user="node.leader" large />
          <span class="org-person-text">
            <strong>{{ node.leader.display_name }}</strong>
            <small>{{ [describe(node.leader), leaderHome].filter(Boolean).join(' · ') }}</small>
          </span>
        </div>
        <div v-else class="notice warning org-notice">
          <TriangleAlert :size="18" aria-hidden="true" />
          <span>Phòng chưa có lãnh đạo nên các bước duyệt “lãnh đạo phòng” sẽ không tìm được người duyệt.</span>
        </div>
      </section>

      <section v-if="kind !== 'missing'" class="org-section" aria-labelledby="org-people-title">
        <h3 id="org-people-title">
          {{ peopleTitle }} <span class="muted">({{ people.length }}{{ role ? ` / ${allPeople.length}` : '' }})</span>
        </h3>
        <p v-if="role" class="org-hint muted">Đang lọc theo vai trò: {{ roleLabel(role) }}.</p>
        <ul v-if="people.length" class="org-list">
          <li v-for="user in people" :key="user.id">
            <div class="org-person">
              <OrgAvatar :user="user" />
              <span class="org-person-text">
                <strong class="org-ellipsis" :title="user.display_name">{{ user.display_name }}</strong>
                <small class="org-ellipsis">{{ describe(user) }}</small>
              </span>
            </div>
            <span v-if="node && user.id === node.leader?.id" class="org-badge ok"><Crown :size="12" aria-hidden="true" />Lãnh đạo</span>
            <button
              v-if="canManage && kind !== 'root'"
              class="button ghost small"
              type="button"
              :aria-label="`${kind === 'bucket' ? 'Xếp phòng cho' : 'Chuyển phòng cho'} ${user.display_name}`"
              @click="emit('assign', user.id, departmentId)"
            >
              <ArrowRightLeft :size="16" />{{ kind === 'bucket' ? 'Xếp phòng' : 'Chuyển' }}
            </button>
          </li>
        </ul>
        <p v-else class="org-empty muted">
          <Users :size="18" aria-hidden="true" />{{
            allPeople.length ? 'Không có ai thuộc vai trò đang lọc.' : kind === 'bucket' ? 'Mọi người đều đã có phòng ban.' : 'Chưa có ai trong mục này.'
          }}
        </p>
      </section>

      <section v-if="kind === 'root' || kind === 'department'" class="org-section" aria-labelledby="org-children-title">
        <h3 id="org-children-title">{{ kind === 'root' ? 'Phòng ban cấp cao nhất' : 'Phòng con' }} <span class="muted">({{ children.length }})</span></h3>
        <ul v-if="children.length" class="org-list">
          <li v-for="child in children" :key="child.id">
            <button class="org-child" type="button" @click="emit('open', child.id)">
              <Building2 :size="18" aria-hidden="true" />
              <span class="org-person-text">
                <strong class="org-ellipsis" :title="child.department.name">{{ child.department.name }}</strong>
                <small class="org-ellipsis">{{ child.leader?.display_name ?? 'Chưa có lãnh đạo' }} · {{ child.totalMembers }} người</small>
              </span>
              <TriangleAlert v-if="child.warnings.length" :size="16" class="org-child-warn" :aria-label="child.warnings.map((item) => WARNING_LABELS[item]).join(', ')" />
              <ChevronRight :size="16" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <p v-else class="org-empty muted"><Building2 :size="18" aria-hidden="true" />Chưa có phòng con.</p>
      </section>
    </div>
  </dialog>
</template>
<style scoped>
.org-drawer {
  margin: 0 0 0 auto;
  width: min(460px, 100vw);
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  padding: 0;
  border: 0;
  border-left: 1px solid var(--border);
  border-radius: 16px 0 0 16px;
  background: var(--surface);
  color: var(--navy);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: org-drawer-in 0.2s ease-out;
}
.org-drawer[open] {
  display: flex;
  flex-direction: column;
}
.org-drawer::backdrop {
  background: #0f172a59;
}
@keyframes org-drawer-in {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
}
.org-drawer-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}
.org-drawer-title {
  display: grid;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.org-drawer-title .eyebrow {
  margin: 0;
}
.org-drawer-title h2 {
  overflow-wrap: anywhere;
}
.org-drawer-title h2:focus {
  outline: none;
}
.org-trail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 0.8125rem;
}
.org-trail-link {
  min-height: 28px;
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--teal-ink);
  font-size: 0.8125rem;
}
.org-trail-link:hover {
  background: var(--teal-soft);
}
.org-drawer-body {
  display: grid;
  align-content: start;
  gap: 24px;
  padding: 20px 24px 32px;
  overflow-y: auto;
}
.org-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 12px;
  margin: 0;
}
.org-facts div {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
}
.org-facts dt {
  color: var(--muted);
  font-size: 0.8125rem;
}
.org-facts dd {
  margin: 0;
  font-family: 'Be Vietnam Pro', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.org-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.org-actions .button {
  justify-content: flex-start;
  white-space: normal;
  text-align: left;
  line-height: 1.3;
}
.org-section {
  display: grid;
  gap: 12px;
}
.org-section h3 {
  font-size: 0.9375rem;
}
.org-section h3 .muted {
  font-weight: 400;
}
.org-hint {
  margin-top: -4px;
  font-size: 0.8125rem;
}
.org-notice {
  margin: 0;
}
.org-notice svg {
  flex: none;
  margin-top: 2px;
}
.org-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.org-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-soft);
}
.org-list li:last-child {
  border-bottom: 0;
}
.org-list .org-person {
  flex: 1;
}
.org-child {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--navy);
  text-align: left;
}
.org-child:hover {
  background: var(--surface-2);
}
.org-child > svg {
  flex: none;
  color: var(--muted);
}
.org-child .org-person-text {
  flex: 1;
}
.org-child .org-child-warn {
  color: var(--amber-ink);
}
.org-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 16px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  font-size: 0.875rem;
}
@media (max-width: 640px) {
  .org-drawer {
    border-radius: 0;
    border-left: 0;
  }
  .org-drawer-head,
  .org-drawer-body {
    padding-left: 16px;
    padding-right: 16px;
  }
  .org-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
