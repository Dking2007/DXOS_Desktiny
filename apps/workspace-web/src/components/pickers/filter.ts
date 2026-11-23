// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
// Pure search, grouping and keyboard-move logic behind PeoplePicker.
import { fold } from '@dx/web-shared/text.ts'

export interface PickerOption {
  /** What the v-model holds ('' is allowed for a "no one yet" choice). */
  value: string
  label: string
  /** Role · department, or a member count. */
  secondary?: string
  /** Group heading; options of one group are shown together, in first-seen order. */
  group: string
  kind: 'user' | 'dept' | 'special'
  /** The person's id, for the profile photo. */
  userId?: string
  /** For a department in multi mode: the people that "whole department" adds. */
  memberIds?: string[]
}

export interface Part {
  text: string
  match: boolean
}

export const DEFAULT_LIMIT = 50

/** Folded text plus, for each folded character, the index of the original character it came from. */
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const piece = fold(text[i]!)
    for (let k = 0; k < piece.length; k++) {
      folded += piece[k]
      map.push(i)
    }
  }
  return { folded, map }
}

/** Splits `text` so the part matching `query` (ignoring case and accents) can be highlighted. */
export function highlightParts(text: string, query: string): Part[] {
  const needle = fold(query.trim())
  if (!needle || !text) return [{ text, match: false }]
  const { folded, map } = foldWithMap(text)
  const at = folded.indexOf(needle)
  if (at < 0) return [{ text, match: false }]
  const start = map[at]!
  const end = map[at + needle.length - 1]! + 1
  const parts: Part[] = []
  if (start > 0) parts.push({ text: text.slice(0, start), match: false })
  parts.push({ text: text.slice(start, end), match: true })
  if (end < text.length) parts.push({ text: text.slice(end), match: false })
  return parts
}

/** Lower is better: word start in the label, then anywhere in the label, then the secondary text. */
function rank(option: PickerOption, needle: string): number {
  const label = fold(option.label)
  if (label.startsWith(needle)) return 0
  if (label.includes(` ${needle}`)) return 1
  if (label.includes(needle)) return 2
  if (fold(option.secondary ?? '').includes(needle)) return 3
  return -1
}

export interface FilterResult {
  items: PickerOption[]
  /** Matches before the cap. */
  total: number
  truncated: boolean
}

/** Options matching `query` (all of them when empty), best matches first, capped at `limit`. */
export function filterOptions(
  options: readonly PickerOption[],
  query: string,
  limit = DEFAULT_LIMIT,
): FilterResult {
  const needle = fold(query.trim())
  let matched: PickerOption[]
  if (!needle) matched = options.slice()
  else {
    const ranked: { option: PickerOption; score: number; index: number }[] = []
    options.forEach((option, index) => {
      if (option.kind === 'special') return
      const score = rank(option, needle)
      if (score >= 0) ranked.push({ option, score, index })
    })
    ranked.sort((a, b) => a.score - b.score || a.index - b.index)
    matched = ranked.map((r) => r.option)
  }
  return { items: matched.slice(0, limit), total: matched.length, truncated: matched.length > limit }
}

export type Row =
  | { type: 'header'; label: string; key: string }
  | { type: 'option'; option: PickerOption; key: string }

/** Items with a heading before each group (groups keep the order they first appear in). */
export function toRows(items: readonly PickerOption[], showHeaders = true): Row[] {
  const order: string[] = []
  const byGroup = new Map<string, PickerOption[]>()
  for (const item of items) {
    if (!byGroup.has(item.group)) {
      byGroup.set(item.group, [])
      order.push(item.group)
    }
    byGroup.get(item.group)!.push(item)
  }
  const rows: Row[] = []
  for (const group of order) {
    if (group && showHeaders) rows.push({ type: 'header', label: group, key: `h:${group}` })
    for (const option of byGroup.get(group)!) rows.push({ type: 'option', option, key: `o:${group}:${option.value}` })
  }
  return rows
}

/** Next highlighted index for a navigation key; null when the key does not move. */
export function moveActive(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowDown':
      return current < 0 ? 0 : (current + 1) % count
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    case 'PageDown':
      return Math.min(count - 1, Math.max(current, 0) + 8)
    case 'PageUp':
      return Math.max(0, current - 8)
    default:
      return null
  }
}

/** Push `value` to the front of a recent list without duplicates. */
export function pushRecent(list: readonly string[], value: string, max = 5): string[] {
  return [value, ...list.filter((v) => v !== value)].slice(0, max)
}
