<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import {
  AlarmClock,
  CheckCheck,
  ClipboardCheck,
  Download,
  HardDrive,
  ListChecks,
  Undo2,
  Workflow,
} from 'lucide-vue-next'
import { api } from '../api'
import { useSession } from '../stores/session'
import ProcessWaitCard from '../components/ProcessWaitCard.vue'
import NarrativeCard from '../ai/NarrativeCard.vue'
import { useAi } from '../ai/useAi'
import { formatDate, formatSize } from '@dx/web-shared/api.ts'
import StatePanel from '@dx/web-shared/components/StatePanel.vue'
import StatusBadge from '@dx/web-shared/components/StatusBadge.vue'
interface Overview {
  as_of: string
  period_days: number
  definitions: Record<string, string>
  tasks: {
    total: number
    by_status: Record<string, number>
    open: number
    open_with_due: number
    overdue: number
    overdue_rate: number | null
    completed_in_period: number
    completed_late: number
    late_completion_rate: number | null
    average_completion_hours: number | null
    by_assignee: { assignee_id: string | null; display_name: string; open: number; overdue: number }[]
  }
  cases: {
    total: number
    by_status: Record<string, number>
    returns_in_period: number
    pending_my_approval: number
  }
  storage: { my_files: number; my_bytes: number }
  by_department: {
    department_id: string | null
    name: string
    tasks_open: number
    tasks_overdue: number
    tasks_completed: number
    cases_total: number
    cases_waiting: number
    cases_overdue: number
    returns: number
  }[]
  automations?: { failed_in_period: number; enabled_rules: number }
}
const session = useSession()
const ai = useAi()
const canSeeProcess = computed(
  () => session.can('cases.read.department') || session.can('cases.read.organization'),
)
const days = ref(30)
const scope = ref<'all' | 'mine' | 'managed'>('all')
const report = useQuery({
  queryKey: computed(() => ['reports', days.value, scope.value]),
  queryFn: () => api.request<Overview>(`/reports/overview?days=${days.value}&scope=${scope.value}`),
})
const data = computed(() => report.data.value)
const SCOPE_LABEL = { all: 'Mọi việc bạn xem được', managed: 'Việc bạn giao hoặc điều phối', mine: 'Việc của bạn' }
const PERIOD_LABEL: Record<number, string> = { 7: '7 ngày qua', 30: '30 ngày qua', 90: '90 ngày qua', 365: '12 tháng qua' }
function hoursText(hours: number | null) {
  if (hours === null) return '—'
  if (hours < 1) return 'dưới 1 giờ'
  return hours >= 48 ? `${Math.round(hours / 24)} ngày` : `${Math.round(hours)} giờ`
}
function percent(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`
}
function bars(record: Record<string, number>) {
  const max = Math.max(1, ...Object.values(record))
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count, width: (count / max) * 100 }))
}
</script>
<template>
  <header class="page-head compact">
    <h1 class="sr-only">Báo cáo</h1>
    <div class="page-actions">
      <select v-model="scope" aria-label="Phạm vi" class="compact-select">
        <option value="all">Mọi việc bạn xem được</option>
        <option value="managed">Việc bạn giao / điều phối</option>
        <option value="mine">Việc của bạn</option>
      </select>
      <select v-model.number="days" aria-label="Khoảng thời gian" class="compact-select">
        <option :value="7">7 ngày</option>
        <option :value="30">30 ngày</option>
        <option :value="90">90 ngày</option>
        <option :value="365">12 tháng</option>
      </select>
      <a
        class="button secondary"
        :href="`/workspace/v1/reports/tasks.csv?scope=${scope}`"
        download
        :title="`Tệp CSV, phạm vi: ${SCOPE_LABEL[scope].toLowerCase()}`"
        ><Download :size="16" />Tải danh sách công việc</a
      ><a
        class="button secondary"
        href="/workspace/v1/reports/cases.csv"
        download
        title="Tệp CSV gồm mọi hồ sơ bạn được xem"
        ><Download :size="16" />Tải danh sách hồ sơ</a
      >
    </div>
  </header>
  <section v-if="report.isPending.value || report.error.value" class="card">
    <StatePanel
      :loading="report.isPending.value"
      :error="report.error.value"
      @retry="report.refetch()"
    />
  </section>
  <template v-if="data">
    <p class="muted report-asof">
      {{ SCOPE_LABEL[scope] }} · {{ PERIOD_LABEL[days] }} · số liệu lúc {{ formatDate(data.as_of, true) }}
    </p>
    <NarrativeCard v-if="ai.on('report_narrative')" :days="days" :scope="scope" />
    <div class="stat-grid">
      <RouterLink to="/tasks?scope=all&status=assigned,accepted,in_progress,blocked,returned,submitted" class="stat-tile">
        <span class="stat-icon"><ListChecks :size="21" /></span>
        <div><strong>{{ data.tasks.open }}</strong><small>Việc đang mở</small></div>
      </RouterLink>
      <RouterLink to="/tasks?scope=all&overdue=true" class="stat-tile">
        <span class="stat-icon red"><AlarmClock :size="21" /></span>
        <div>
          <strong>{{ data.tasks.overdue }}</strong
          ><small>Việc quá hạn · chiếm {{ percent(data.tasks.overdue_rate) }} việc có hạn</small>
        </div>
      </RouterLink>
      <div class="stat-tile">
        <span class="stat-icon blue"><CheckCheck :size="21" /></span>
        <div>
          <strong>{{ data.tasks.completed_in_period }}</strong
          ><small
            >Việc hoàn tất trong kỳ · {{ percent(data.tasks.late_completion_rate) }} bị trễ hạn</small
          >
        </div>
      </div>
      <RouterLink to="/approvals" class="stat-tile">
        <span class="stat-icon amber"><ClipboardCheck :size="21" /></span>
        <div>
          <strong>{{ data.cases.pending_my_approval }}</strong><small>Hồ sơ chờ tôi duyệt</small>
        </div>
      </RouterLink>
    </div>
    <div class="home-columns">
      <div class="stack">
        <section class="card">
          <header class="card-header">
            <h2>Công việc theo trạng thái</h2>
            <span class="muted header-note"
              >Thời gian hoàn tất trung bình: {{ hoursText(data.tasks.average_completion_hours) }}</span
            >
          </header>
          <div class="card-body">
            <p v-if="!data.tasks.total" class="muted">Chưa có công việc trong phạm vi.</p>
            <div v-for="row in bars(data.tasks.by_status)" :key="row.status" class="bar-row">
              <StatusBadge kind="task" :status="row.status" />
              <div class="metric-bar"><span :style="{ width: `${row.width}%` }" /></div>
              <strong>{{ row.count }}</strong>
            </div>
          </div>
        </section>
        <section class="card">
          <header class="card-header">
            <h2>Việc đang mở theo người</h2>
          </header>
          <div v-if="data.tasks.by_assignee.length" class="table-wrap">
            <table>
              <thead>
                <tr><th>Người phụ trách</th><th class="num">Đang mở</th><th class="num">Quá hạn</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in data.tasks.by_assignee" :key="row.assignee_id ?? 'none'">
                  <td>{{ row.display_name }}</td>
                  <td class="num">{{ row.open }}</td>
                  <td class="num" :class="{ 'overdue-text': row.overdue }">{{ row.overdue }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="card-body muted">Không có việc đang mở.</p>
        </section>
      </div>
      <aside class="stack report-aside">
        <section class="card">
          <header class="card-header">
            <h2>Hồ sơ theo trạng thái <span class="muted">({{ data.cases.total }})</span></h2>
            <span class="muted header-note icon-note"
              ><Undo2 :size="14" aria-hidden="true" />{{ data.cases.returns_in_period }} lần trả lại</span
            >
          </header>
          <div class="card-body">
            <p v-if="!data.cases.total" class="muted">Chưa có hồ sơ trong phạm vi.</p>
            <div v-for="row in bars(data.cases.by_status)" :key="row.status" class="bar-row">
              <StatusBadge :status="row.status" />
              <div class="metric-bar"><span :style="{ width: `${row.width}%` }" /></div>
              <strong>{{ row.count }}</strong>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-body stack">
            <div class="date-line"><HardDrive :size="16" aria-hidden="true" />Tài liệu của tôi</div>
            <p>
              <strong>{{ data.storage.my_files }}</strong> tệp ·
              {{ formatSize(data.storage.my_bytes) }}
            </p>
            <template v-if="data.automations">
              <div class="date-line"><Workflow :size="16" aria-hidden="true" />Tự động hóa</div>
              <p>
                {{ data.automations.enabled_rules }} luồng đang áp dụng ·
                <span :class="{ 'overdue-text': data.automations.failed_in_period }"
                  >{{ data.automations.failed_in_period }} lượt lỗi trong kỳ</span
                >
              </p>
            </template>
          </div>
        </section>
        <details class="card report-definitions">
          <summary>Cách tính các con số</summary>
          <dl class="card-body detail-meta">
            <div><dt>Tỷ lệ quá hạn</dt><dd>{{ data.definitions.overdue_rate }}</dd></div>
            <div><dt>Tỷ lệ hoàn tất trễ</dt><dd>{{ data.definitions.late_completion_rate }}</dd></div>
            <div><dt>Việc đã hủy</dt><dd>{{ data.definitions.cancelled }}</dd></div>
            <div><dt>Phạm vi</dt><dd>Chỉ tính những việc và hồ sơ bạn được phép xem.</dd></div>
          </dl>
        </details>
      </aside>
    </div>
    <section v-if="data.by_department.length" class="card department-card">
      <header class="card-header">
        <h2>Tình hình từng phòng ban</h2>
        <span class="muted header-note">Phòng có nhiều việc, hồ sơ quá hạn xếp trên</span>
      </header>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Đơn vị</th>
              <th class="num">Việc đang mở</th>
              <th class="num">Việc quá hạn</th>
              <th class="num">Hoàn tất trong kỳ</th>
              <th class="num">Hồ sơ</th>
              <th class="num">Đang chờ duyệt</th>
              <th class="num">Hồ sơ quá hạn</th>
              <th class="num">Lần trả lại</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.by_department" :key="row.department_id ?? 'none'">
              <td>{{ row.name }}</td>
              <td class="num">{{ row.tasks_open }}</td>
              <td class="num" :class="{ 'overdue-text': row.tasks_overdue }">{{ row.tasks_overdue }}</td>
              <td class="num">{{ row.tasks_completed }}</td>
              <td class="num">{{ row.cases_total }}</td>
              <td class="num">{{ row.cases_waiting }}</td>
              <td class="num" :class="{ 'overdue-text': row.cases_overdue }">{{ row.cases_overdue }}</td>
              <td class="num">{{ row.returns }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <ProcessWaitCard v-if="canSeeProcess" :days="days" />
  </template>
</template>
<style scoped>
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.header-note {
  font-size: 0.875rem;
}
.icon-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.report-aside {
  align-content: start;
}
.department-card {
  margin-top: 24px;
}
</style>
