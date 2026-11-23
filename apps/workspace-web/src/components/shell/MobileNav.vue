<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ClipboardCheck, House, ListChecks, Menu, MessagesSquare } from 'lucide-vue-next'
import type { MeOverview } from '@dx/web-shared/types.ts'
import { badgeText } from '../../ui/nav'

defineProps<{ counts?: MeOverview['counts'] }>()
defineEmits<{ more: [] }>()
</script>
<template>
  <nav class="mobile-nav" aria-label="Điều hướng nhanh">
    <RouterLink to="/home"><span class="tone-tile" data-tone="home" aria-hidden="true"><House :size="17" :stroke-width="1.9" /></span><span>Hôm nay</span></RouterLink>
    <RouterLink to="/tasks"
      ><span class="tone-tile" data-tone="tasks" aria-hidden="true"><ListChecks :size="17" :stroke-width="1.9" /></span><span>Công việc</span
      ><i v-if="counts && counts.tasks + counts.tasks_to_review" class="nav-badge">{{
        badgeText(counts.tasks + counts.tasks_to_review)
      }}</i></RouterLink
    >
    <RouterLink to="/approvals"
      ><span class="tone-tile" data-tone="approvals" aria-hidden="true"><ClipboardCheck :size="17" :stroke-width="1.9" /></span><span>Phê duyệt</span
      ><i v-if="counts?.approvals" class="nav-badge">{{ badgeText(counts.approvals) }}</i></RouterLink
    >
    <RouterLink to="/chat"
      ><span class="tone-tile" data-tone="chat" aria-hidden="true"><MessagesSquare :size="17" :stroke-width="1.9" /></span><span>Nhắn tin</span
      ><i v-if="counts?.chat" class="nav-badge">{{ badgeText(counts.chat) }}</i></RouterLink
    >
    <button type="button" title="Mở toàn bộ menu" aria-haspopup="dialog" @click="$emit('more')">
      <Menu :size="21" aria-hidden="true" /><span>Thêm</span>
    </button>
  </nav>
</template>
