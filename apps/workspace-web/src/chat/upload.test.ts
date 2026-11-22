// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import { attachmentProblem, attachmentSummary, fileAllowed, MAX_FILE_BYTES, timeLabel } from './upload'

describe('chat upload checks', () => {
  it('accepts listed MIME types and extensions only', () => {
    expect(fileAllowed({ name: 'a.png', type: 'image/png' })).toBe(true)
    expect(fileAllowed({ name: 'Báo cáo.PDF', type: '' })).toBe(true)
    expect(fileAllowed({ name: 'clip.mov', type: 'video/quicktime' })).toBe(true)
    expect(fileAllowed({ name: 'run.exe', type: 'application/x-msdownload' })).toBe(false)
    expect(fileAllowed({ name: 'logo.svg', type: 'image/svg+xml' })).toBe(false)
  })

  it('explains why a file cannot be attached', () => {
    expect(attachmentProblem({ name: 'a.txt', type: 'text/plain', size: 10 })).toBeNull()
    expect(attachmentProblem({ name: 'a.exe', type: '', size: 10 })).toBe('Loại tệp không hỗ trợ')
    expect(attachmentProblem({ name: 'a.zip', type: '', size: MAX_FILE_BYTES + 1 })).toMatch(/^Vượt/)
  })

  it('summarises attachment-only messages without emoji', () => {
    expect(attachmentSummary(['image'])).toBe('Ảnh')
    expect(attachmentSummary(['image', 'image'])).toBe('2 ảnh')
    expect(attachmentSummary(['image', 'video'])).toBe('Video')
    expect(attachmentSummary(['file', 'image'])).toBe('2 tệp đính kèm')
  })

  it('formats the clock time exactly as toLocaleTimeString does', () => {
    const iso = new Date(2026, 10, 20, 7, 5).toISOString()
    expect(timeLabel(iso)).toBe(new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }))
  })
})
