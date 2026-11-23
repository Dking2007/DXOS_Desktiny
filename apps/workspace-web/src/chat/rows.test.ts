// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it, vi } from 'vitest'
import { messageRows } from './rows'

const at = (day: number, hour: number, minute: number) => new Date(2026, 10, day, hour, minute).toISOString()
const msg = (sender: string, created_at: string) => ({ sender_id: sender, created_at })

describe('messageRows', () => {
  it('groups one sender within five minutes on the same day', () => {
    const rows = messageRows(
      [msg('a', at(20, 9, 0)), msg('a', at(20, 9, 4)), msg('a', at(20, 9, 10)), msg('b', at(20, 9, 11))],
      () => 'day',
    )
    expect(rows.map((r) => [r.first, r.last])).toEqual([
      [true, false],
      [false, true],
      [true, true],
      [true, true],
    ])
  })

  it('shows a day separator only where the day changes and breaks blocks across midnight', () => {
    const label = vi.fn((iso: string) => new Date(iso).getDate().toString())
    const rows = messageRows(
      [msg('a', at(20, 23, 58)), msg('a', at(20, 23, 59)), msg('a', at(21, 0, 1))],
      label,
    )
    expect(rows.map((r) => r.day)).toEqual(['20', null, '21'])
    expect(rows.map((r) => [r.first, r.last])).toEqual([
      [true, false],
      [false, true],
      [true, true],
    ])
    // The locale-formatted label is built once per separator, not per message.
    expect(label).toHaveBeenCalledTimes(2)
  })

  it('keeps the message objects as they are and handles an empty list', () => {
    const first = msg('a', at(20, 9, 0))
    expect(messageRows([first])[0].message).toBe(first)
    expect(messageRows([])).toEqual([])
  })
})
