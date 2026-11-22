// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import { delegationProblem, reasonMissing, uploadLabel } from './workForms'

describe('delegation period', () => {
  const now = new Date('2026-11-22T08:00').getTime()
  it('needs an end in the future, after the start', () => {
    expect(delegationProblem('', '', now)).toMatch(/kết thúc/)
    expect(delegationProblem('', '2026-11-21T08:00', now)).toMatch(/sau hiện tại/)
    expect(delegationProblem('2026-11-25T08:00', '2026-11-24T08:00', now)).toMatch(/sau thời điểm bắt đầu/)
  })
  it('accepts up to 90 days, starting now when no start is given', () => {
    expect(delegationProblem('', '2026-12-01T08:00', now)).toBe('')
    expect(delegationProblem('2026-11-23T08:00', '2027-02-21T08:00', now)).toBe('')
    expect(delegationProblem('2026-11-23T08:00', '2027-02-22T08:00', now)).toMatch(/90 ngày/)
  })
})

describe('required reason', () => {
  it('treats blank text as missing only when a reason is required', () => {
    expect(reasonMissing(true, '   ')).toBe(true)
    expect(reasonMissing(true, ' Thiếu chữ ký ')).toBe(false)
    expect(reasonMissing(false, '')).toBe(false)
    expect(reasonMissing(true, null)).toBe(true)
  })
})

describe('upload progress', () => {
  it('counts files when several go up', () => {
    expect(uploadLabel(0, 1)).toBe('Đang tải lên…')
    expect(uploadLabel(0, 3)).toBe('Đang tải lên 1/3…')
    expect(uploadLabel(3, 3)).toBe('Đang tải lên 3/3…')
  })
})
