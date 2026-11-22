<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { ChevronDown, ExternalLink, LoaderCircle, RefreshCw, Search } from 'lucide-vue-next'
import { api } from '../api'
import { formatDate } from '@dx/web-shared/api.ts'
import type { Page } from '@dx/web-shared/api.ts'
import StatePanel from '@dx/web-shared/components/StatePanel.vue'
import { fold } from '@dx/web-shared/text.ts'
import { auditLabel, auditLink } from '../ui/audit'
interface AuditEntry {
  id: string
  actor_id: string
  actor_name: string
  action: string
  resource_id: string
  created_at: string
}
const log = useInfiniteQuery({
  queryKey: ['audit-logs'],
  initialPageParam: '',
  queryFn: ({ pageParam }) =>
    api.request<Page<AuditEntry>>(`/audit-logs?limit=50${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
  getNextPageParam: (last) => last.next_cursor ?? undefined,
})
const entries = computed(() => log.data.value?.pages.flatMap((page) => page.items) ?? [])
// Filters what is already loaded: who did it or what was done, ignoring accents.
const query = ref('')
const shown = computed(() => {
  const needle = fold(query.value.trim())
  if (!needle) return entries.value
  return entries.value.filter((entry) => fold(`${entry.actor_name} ${auditLabel(entry.action)}`).includes(needle))
})
const refreshing = computed(() => log.isRefetching.value && !log.isFetchingNextPage.value)
</script>
<template>
  <section class="card">
    <header class="card-header">
      <div class="audit-title">
        <h2>Nhật ký hoạt động</h2>
        <p class="muted">Ai đã làm gì, lúc nào trong không gian làm việc. Mới nhất ở trên.</p>
      </div>
      <button
        class="icon-button"
        type="button"
        aria-label="Tải lại nhật ký"
        title="Tải lại nhật ký"
        :disabled="log.isFetching.value"
        @click="log.refetch()"
      >
        <RefreshCw :size="18" :class="{ spin: refreshing }" />
      </button>
    </header>
    <div v-if="entries.length" class="toolbar audit-tools">
      <label class="search-box"
        ><Search :size="16" aria-hidden="true" /><input
          v-model="query"
          type="search"
          placeholder="Lọc theo người thực hiện hoặc hoạt động…"
          aria-label="Lọc nhật ký đã tải"
      /></label>
      <small class="muted" role="status">
        {{ query.trim() ? `${shown.length} / ${entries.length} mục đã tải` : `${entries.length} mục đã tải` }}
      </small>
    </div>
    <StatePanel
      :loading="log.isPending.value"
      :error="log.error.value"
      :empty="!!log.data.value && !shown.length"
      compact
      :title="entries.length ? 'Không có mục nào khớp bộ lọc' : 'Chưa có hoạt động nào được ghi'"
      :description="entries.length && log.hasNextPage.value ? 'Bộ lọc chỉ xét các mục đã tải. Bấm “Xem cũ hơn” để tải thêm.' : ''"
    />
    <div v-if="shown.length" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Thời điểm</th>
            <th>Người thực hiện</th>
            <th>Hoạt động</th>
            <th>Đối tượng</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in shown" :key="entry.id">
            <td class="audit-time">{{ formatDate(entry.created_at, true) }}</td>
            <td>{{ entry.actor_name }}</td>
            <td>{{ auditLabel(entry.action) }}</td>
            <td>
              <RouterLink
                v-if="auditLink(entry.action, entry.resource_id)"
                class="audit-open"
                :to="auditLink(entry.action, entry.resource_id)!"
                :aria-label="`Mở đối tượng của hoạt động: ${auditLabel(entry.action)}`"
                ><ExternalLink :size="14" aria-hidden="true" />Mở</RouterLink
              ><code v-else class="muted" :title="entry.resource_id">{{ entry.resource_id.slice(0, 8) }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="log.hasNextPage.value" class="audit-more">
      <button
        class="button secondary"
        type="button"
        :disabled="log.isFetchingNextPage.value"
        :aria-busy="log.isFetchingNextPage.value"
        @click="log.fetchNextPage()"
      >
        <LoaderCircle v-if="log.isFetchingNextPage.value" :size="16" class="spin" aria-hidden="true" /><ChevronDown
          v-else
          :size="16"
        />{{ log.isFetchingNextPage.value ? 'Đang tải…' : 'Xem cũ hơn' }}
      </button>
    </div>
    <p v-else-if="entries.length" class="audit-end muted">Đã hiển thị toàn bộ nhật ký.</p>
  </section>
</template>
<style scoped>
.audit-title {
  display: grid;
  gap: 4px;
}
.audit-title p {
  font-size: 0.875rem;
}
.audit-tools {
  justify-content: flex-start;
  padding: 16px 24px;
}
.audit-tools .search-box {
  flex: 1 1 260px;
  max-width: 420px;
}
.audit-time {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.audit-open {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
}
.audit-more {
  display: flex;
  justify-content: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}
.audit-end {
  margin: 0;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 0.875rem;
}
@media (max-width: 640px) {
  .audit-tools,
  .audit-more,
  .audit-end {
    padding: 12px 16px;
  }
}
</style>
