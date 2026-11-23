// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import { activitySteps, toStep } from './taskActivity'

const ev = (
  action: string,
  detail: Record<string, unknown> = {},
  id = action,
) => ({
  id,
  action,
  actor_name: 'Lan',
  detail,
  created_at: '2026-11-20T08:00:00Z',
})

describe('task activity as a workflow', () => {
  it('gives main steps a tone and keeps the reason', () => {
    const step = toStep(ev('return', { reason: 'Thiếu chữ ký' }))
    expect(step).toMatchObject({
      label: 'Trả lại',
      tone: 'warn',
      major: true,
      reason: 'Thiếu chữ ký',
    })
    expect(toStep(ev('complete')).tone).toBe('done')
    expect(toStep(ev('cancel')).tone).toBe('stop')
  })
  it('describes side notes', () => {
    expect(toStep(ev('files_changed', { added: 2, removed: 1 })).note).toBe(
      '+2 tệp, −1 tệp',
    )
    expect(toStep(ev('updated', { fields: ['title', 'checklist'] })).note).toBe(
      'Sửa tiêu đề, checklist',
    )
    expect(toStep(ev('due_changed', { from: null, to: null })).note).toBe(
      'Hạn: không hạn → không hạn',
    )
    expect(toStep(ev('files_changed')).major).toBe(false)
  })
  it('falls back for unknown actions', () => {
    expect(toStep(ev('mystery'))).toMatchObject({
      label: 'mystery',
      tone: 'note',
      major: false,
    })
  })
  it('folds older steps away only when it saves more than one', () => {
    const events = Array.from({ length: 7 }, (_, i) =>
      ev('updated', {}, String(i)),
    )
    expect(activitySteps(events, 6).hidden).toBe(0)
    const more = [...events, ev('start', {}, 'x')]
    const folded = activitySteps(more, 6)
    expect(folded.hidden).toBe(2)
    expect(folded.steps.at(-1)?.id).toBe('x')
  })
})
