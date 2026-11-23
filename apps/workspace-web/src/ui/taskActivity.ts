// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
// How a task's history reads as a workflow: each event becomes a step with a tone (moved forward,
// finished, held up, stopped, or a side note) and a short line of what changed.
import { formatDate } from '@dx/web-shared/api.ts'

export type StepTone = 'start' | 'progress' | 'done' | 'warn' | 'stop' | 'note'

export interface ActivityEvent {
  id: string
  action: string
  actor_name: string
  detail: Record<string, unknown>
  created_at: string
}

export interface ActivityStep {
  id: string
  action: string
  label: string
  tone: StepTone
  /** Main-path steps (created → … → done) get a full node; side notes get a small dot. */
  major: boolean
  actor: string
  at: string
  /** What changed, e.g. "Hạn: 12/11 → 15/11" or "+2 tệp". */
  note: string
  /** The reason someone gave, shown as a quote. */
  reason: string
}

const STEPS: Record<
  string,
  { label: string; tone: StepTone; major?: boolean }
> = {
  created: { label: 'Tạo công việc', tone: 'start', major: true },
  assigned: { label: 'Giao / phân công', tone: 'progress', major: true },
  accept: { label: 'Tiếp nhận', tone: 'progress', major: true },
  start: { label: 'Bắt đầu thực hiện', tone: 'progress', major: true },
  submit: { label: 'Nộp kết quả', tone: 'progress', major: true },
  complete: { label: 'Nghiệm thu hoàn tất', tone: 'done', major: true },
  return: { label: 'Trả lại', tone: 'warn', major: true },
  block: { label: 'Báo vướng mắc', tone: 'warn', major: true },
  unblock: { label: 'Tiếp tục xử lý', tone: 'progress', major: true },
  cancel: { label: 'Hủy việc', tone: 'stop', major: true },
  due_changed: { label: 'Đổi hạn', tone: 'warn' },
  automation_attached: { label: 'Gắn luồng tự động', tone: 'note' },
  automation_detached: { label: 'Gỡ luồng tự động', tone: 'note' },
  files_changed: { label: 'Cập nhật tài liệu đính kèm', tone: 'note' },
  updated: { label: 'Cập nhật', tone: 'note' },
}

const FIELD_NAMES: Record<string, string> = {
  title: 'tiêu đề',
  description: 'mô tả',
  priority: 'mức ưu tiên',
  due_at: 'hạn',
  watcher_ids: 'người theo dõi',
  checklist: 'checklist',
  labels: 'nhãn',
  file_ids: 'tệp đính kèm',
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function noteOf(event: ActivityEvent): string {
  const d = event.detail ?? {}
  switch (event.action) {
    case 'due_changed': {
      const from = text(d.from) ? formatDate(text(d.from), true) : 'không hạn'
      const to = text(d.to) ? formatDate(text(d.to), true) : 'không hạn'
      return `Hạn: ${from} → ${to}`
    }
    case 'files_changed': {
      const parts = []
      if (Number(d.added) > 0) parts.push(`+${Number(d.added)} tệp`)
      if (Number(d.removed) > 0) parts.push(`−${Number(d.removed)} tệp`)
      return parts.join(', ')
    }
    case 'automation_attached':
    case 'automation_detached':
      return text(d.name)
    case 'updated': {
      const fields = Array.isArray(d.fields)
        ? d.fields.map((f) => FIELD_NAMES[String(f)] ?? String(f))
        : []
      return fields.length ? `Sửa ${fields.join(', ')}` : ''
    }
    default:
      return ''
  }
}

export function toStep(event: ActivityEvent): ActivityStep {
  const known = STEPS[event.action]
  return {
    id: event.id,
    action: event.action,
    label: known?.label ?? event.action,
    tone: known?.tone ?? 'note',
    major: known?.major ?? false,
    actor: event.actor_name,
    at: event.created_at,
    note: noteOf(event),
    reason: text(event.detail?.reason),
  }
}

/** Newest last, as the work happened. With `limit`, the earlier ones are folded away. */
export function activitySteps(
  events: ActivityEvent[],
  limit?: number,
): { steps: ActivityStep[]; hidden: number } {
  const steps = events.map(toStep)
  if (!limit || steps.length <= limit + 1) return { steps, hidden: 0 }
  return { steps: steps.slice(-limit), hidden: steps.length - limit }
}
