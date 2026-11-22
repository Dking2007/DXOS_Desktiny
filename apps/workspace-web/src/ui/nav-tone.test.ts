// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import { NAV_GROUPS, NAV_TONES, navTone, toneForPath } from './nav'

describe('nav tones', () => {
  it('gives every module a known tone', () => {
    for (const link of NAV_GROUPS.flatMap((group) => group.links))
      expect(NAV_TONES, link.key).toContain(link.tone)
  })
  it('falls back for unknown and plugin keys', () => {
    expect(navTone('tasks')).toBe('tasks')
    expect(navTone('app:crm:0')).toBe('app')
    expect(navTone('something-new')).toBe('neutral')
    expect(navTone(undefined)).toBe('neutral')
  })
  it('reads the tone from a path', () => {
    expect(toneForPath('/tasks?create=1')).toBe('tasks')
    expect(toneForPath('/apps/crm/0')).toBe('app')
    expect(toneForPath('/unknown')).toBe('neutral')
  })
})
