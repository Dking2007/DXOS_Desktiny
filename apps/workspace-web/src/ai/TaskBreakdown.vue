<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { formatDate } from '@dx/web-shared/api.ts'
import { api } from '../api'
import { toast } from '../ui/toast'

/** AI proposes sub-tasks for a large task; the chosen ones are created as unassigned drafts. */
const props = defineProps<{ taskId: string; caseId?: string | null }>()
const emit = defineEmits<{ created: [] }>()
interface Item {
  title: string
  due_at: string | null
  note: string
  picked: boolean
}
const items = ref<Item[]>([])
const loading = ref(false)
const creating = ref(false)
async function suggest() {
  loading.value = true
  try {
    const result = await api.request<{ items: Omit<Item, 'picked'>[] }>(`/ai/tasks/${props.taskId}/breakdown`, { method: 'POST' })
    items.value = result.items.map((item) => ({ ...item, picked: true }))
    if (!items.value.length) toast.error('AI chưa đề xuất được việc con nào.')
  } catch (error) {
    toast.error(error)
  } finally {
    loading.value = false
  }
}
async function create() {
  if (creating.value) return
  creating.value = true
  const chosen = items.value.filter((item) => item.picked && item.title.trim())
  let made = 0
  try {
    for (const item of chosen) {
      await api.request('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: item.title,
          description: item.note,
          due_at: item.due_at,
          parent_id: props.taskId,
          case_id: props.caseId ?? null,
        }),
      })
      made++
      // A created line leaves the list at once, so trying again never creates it twice.
      items.value = items.value.filter((other) => other !== item)
    }
    toast.success(`Đã tạo ${made} việc con (chưa giao). Mở từng việc để giao người làm.`)
    items.value = []
  } catch (error) {
    toast.error(error)
  } finally {
    creating.value = false
    if (made) emit('created')
  }
}
const pickedCount = computed(() => items.value.filter((item) => item.picked && item.title.trim()).length)
</script>
<template>
  <div class="breakdown">
    <button v-if="!items.length" class="button secondary small ai-action" :disabled="loading" @click="suggest">
      <Sparkles :size="14" />{{ loading ? 'AI đang chia việc…' : 'Gợi ý việc con bằng AI' }}
    </button>
    <div v-else class="ai-card">
      <header><span class="ai-title"><Sparkles :size="16" />Việc con AI đề xuất</span></header>
      <div v-for="(item, index) in items" :key="index" class="ai-issue breakdown-item">
        <input
          v-model="item.picked"
          type="checkbox"
          :aria-label="`Chọn việc con ${index + 1}`"
          :disabled="creating"
        />
        <span class="grow breakdown-fields"
          ><input
            v-model="item.title"
            maxlength="250"
            :aria-label="`Tên việc con ${index + 1}`"
            :disabled="creating"
          /><small class="muted"
            >{{ item.due_at ? `Hạn đề xuất ${formatDate(item.due_at, true)}` : 'Chưa có hạn'
            }}{{ item.note ? ` · ${item.note}` : '' }}</small
          ></span
        >
      </div>
      <div class="inline-actions breakdown-actions">
        <button
          class="button small"
          :disabled="creating || !pickedCount"
          :title="pickedCount ? '' : 'Chọn ít nhất một việc con có tên.'"
          @click="create"
        >
          {{ creating ? 'Đang tạo…' : `Tạo ${pickedCount} việc con` }}
        </button>
        <button class="button ghost small" :disabled="creating" @click="items = []">Bỏ qua</button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.breakdown {
  padding: 4px 23px 18px;
}
.breakdown-item {
  align-items: center;
}
.breakdown-fields {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.breakdown-actions {
  margin-top: 12px;
}
</style>
