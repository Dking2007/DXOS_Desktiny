// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import { DEFAULT_LIMIT, filterOptions, highlightParts, moveActive, pushRecent, toRows, type PickerOption } from './filter'

const user = (id: string, label: string, secondary = ''): PickerOption => ({
  value: `user:${id}`,
  label,
  secondary,
  group: 'Cá nhân',
  kind: 'user',
})
const sample: PickerOption[] = [
  { value: '', label: 'Lưu nháp', group: '', kind: 'special' },
  user('1', 'Nguyễn Văn An', 'Phòng Kế hoạch'),
  user('2', 'Trần Thị Châu', 'Phòng Kinh doanh'),
  user('3', 'Đặng An Khang'),
  { value: 'dept:1', label: 'Phòng Kế hoạch', group: 'Đơn vị', kind: 'dept' },
]

describe('filterOptions', () => {
  it('returns everything for an empty query', () => {
    expect(filterOptions(sample, '  ').items).toHaveLength(5)
  })
  it('ignores case and accents and ranks word starts first', () => {
    const r = filterOptions([...sample, user('9', 'An Bình')], 'an').items.map((o) => o.label)
    expect(r[0]).toBe('An Bình')
    expect(r.slice(1, 3)).toEqual(['Nguyễn Văn An', 'Đặng An Khang'])
  })
  it('matches Đ as d and searches secondary text last', () => {
    expect(filterOptions(sample, 'dang').items[0]!.label).toBe('Đặng An Khang')
    const r = filterOptions(sample, 'kinh doanh').items
    expect(r.map((o) => o.label)).toEqual(['Trần Thị Châu'])
  })
  it('never matches the special option while searching', () => {
    expect(filterOptions(sample, 'nhap').items).toHaveLength(0)
  })
  it('caps and reports truncation', () => {
    const many = Array.from({ length: 300 }, (_, i) => user(String(i), `Người ${i}`))
    const r = filterOptions(many, '')
    expect(r.items).toHaveLength(DEFAULT_LIMIT)
    expect(r.total).toBe(300)
    expect(r.truncated).toBe(true)
    expect(filterOptions(many, 'người 29', 5).items).toHaveLength(5)
  })
})

describe('highlightParts', () => {
  it('marks the matching part in the original text', () => {
    expect(highlightParts('Trần Thị Châu', 'thi')).toEqual([
      { text: 'Trần ', match: false },
      { text: 'Thị', match: true },
      { text: ' Châu', match: false },
    ])
  })
  it('handles Đ and no match', () => {
    expect(highlightParts('Đặng', 'dang')[0]).toEqual({ text: 'Đặng', match: true })
    expect(highlightParts('An', 'zz')).toEqual([{ text: 'An', match: false }])
    expect(highlightParts('An', '')).toEqual([{ text: 'An', match: false }])
  })
})

describe('toRows', () => {
  it('adds a heading per named group only', () => {
    const rows = toRows(sample)
    expect(rows.map((r) => r.type)).toEqual(['option', 'header', 'option', 'option', 'option', 'header', 'option'])
  })
})

describe('moveActive', () => {
  it('wraps and jumps', () => {
    expect(moveActive('ArrowDown', -1, 3)).toBe(0)
    expect(moveActive('ArrowDown', 2, 3)).toBe(0)
    expect(moveActive('ArrowUp', 0, 3)).toBe(2)
    expect(moveActive('Home', 2, 3)).toBe(0)
    expect(moveActive('End', 0, 3)).toBe(2)
    expect(moveActive('x', 0, 3)).toBeNull()
    expect(moveActive('ArrowDown', 0, 0)).toBeNull()
  })
})

describe('pushRecent', () => {
  it('moves to front, dedupes and caps', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c'])
    expect(pushRecent(['1', '2', '3', '4', '5'], '6')).toEqual(['6', '1', '2', '3', '4'])
  })
})
