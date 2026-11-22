// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createApi,
  errorText,
  formatDate,
  setDateFormatter,
  formatSize,
  queryString,
} from './api'
afterEach(() => vi.unstubAllGlobals())
describe('API error and formatting contract', () => {
  it('preserves conflicts and trace identifiers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'revision_conflict',
            detail: 'Stale',
            trace_id: 'trace-123',
          }),
          { status: 409 },
        ),
      ),
    )
    const api = createApi('workspace')
    api.setCsrf('csrf-test')
    await expect(
      api.request('/cases/1', { method: 'PATCH', body: '{}' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'revision_conflict',
      traceId: 'trace-123',
    })
  })
  it('sends server session credentials and CSRF header, never bearer storage', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'x' })))
    vi.stubGlobal('fetch', fetcher)
    const api = createApi('workspace')
    api.setCsrf('csrf-test')
    await api.request('/cases', { method: 'POST', body: '{}' })
    const [, options] = fetcher.mock.calls[0]!
    expect(options.credentials).toBe('include')
    expect(options.headers.get('X-CSRF-Token')).toBe('csrf-test')
    expect(options.headers.get('Authorization')).toBeNull()
  })
  it('shows actionable revision conflicts', () => {
    expect(errorText(new ApiError(409, 'conflict', 'detail'))).toContain(
      'Tải lại bản mới',
    )
    expect(errorText(new ApiError(401, 'auth', 'detail'))).toContain(
      'Đăng nhập lại',
    )
  })
  it('does not serialize empty cursor or folder ID', () => {
    expect(
      queryString({ folder_id: null, q: '', trash: false, limit: 10 }),
    ).toBe('?trash=false&limit=10')
  })
  it('handles missing dates and finite file units', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(1024)).toBe('1 KB')
  })
  it('formats dates and sizes the same as a freshly built formatter, call after call', () => {
    const iso = '2026-03-05T08:07:00Z'
    const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const dateTime = new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    for (let round = 0; round < 3; round += 1) {
      expect(formatDate(iso)).toBe(date.format(new Date(iso)))
      expect(formatDate(iso, true)).toBe(dateTime.format(new Date(iso)))
    }
    expect(formatDate(iso, true)).not.toBe(formatDate(iso))
    expect(formatDate('không phải ngày')).toBe('không phải ngày')
    expect(formatSize(1536)).toBe(`${(1.5).toLocaleString('vi-VN')} KB`)
    expect(formatSize(5 * 1024 ** 3)).toBe('5 GB')
  })
  it('lets the app register its own date format and restores the default afterwards', () => {
    const iso = '2026-03-05T08:07:00Z'
    const stock = formatDate(iso)
    setDateFormatter((value, withTime) => `custom:${value}:${withTime}`)
    try {
      expect(formatDate(iso, true)).toBe(`custom:${iso}:true`)
      expect(formatDate(null)).toBe('—')
    } finally {
      setDateFormatter(null)
    }
    expect(formatDate(iso)).toBe(stock)
  })
})
