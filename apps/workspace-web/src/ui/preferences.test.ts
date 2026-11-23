// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PREFERENCES,
  LEGACY_THEME_KEY,
  applyPreferences,
  formatDate,
  formatDateTime,
  formatTime,
  normalize,
  prefsKey,
  readPreferences,
  weekdayLabels,
  writePreferences,
  type Preferences,
} from './preferences'

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('personal settings: storage', () => {
  it('starts from the defaults', () => {
    expect(readPreferences(memory(), 'u1')).toEqual(DEFAULT_PREFERENCES)
    expect(readPreferences(null, null)).toEqual(DEFAULT_PREFERENCES)
    expect(DEFAULT_PREFERENCES).toMatchObject({ theme: 'system', fontScale: 1, language: 'vi', dateFormat: 'dmy' })
  })

  it('keeps each person apart', () => {
    const storage = memory()
    writePreferences(storage, 'u1', { ...DEFAULT_PREFERENCES, fontScale: 1.25 })
    expect(prefsKey('u1')).toBe('dx-workspace-prefs:u1')
    expect(readPreferences(storage, 'u1').fontScale).toBe(1.25)
    expect(readPreferences(storage, 'u2').fontScale).toBe(1)
  })

  it('carries over the theme chosen with the old toggle, then retires the old key', () => {
    const storage = memory({ [LEGACY_THEME_KEY]: 'dark' })
    const prefs = readPreferences(storage, 'u1')
    expect(prefs.theme).toBe('dark')
    writePreferences(storage, 'u1', prefs)
    expect(storage.data.has(LEGACY_THEME_KEY)).toBe(false)
    expect(readPreferences(storage, 'u1').theme).toBe('dark')
    // A stored record wins over a leftover old key.
    storage.setItem(LEGACY_THEME_KEY, 'light')
    expect(readPreferences(storage, 'u1').theme).toBe('dark')
    expect(readPreferences(memory({ [LEGACY_THEME_KEY]: 'nonsense' }), 'u1').theme).toBe('system')
  })

  it('survives damaged JSON and storage that throws', () => {
    expect(readPreferences(memory({ [prefsKey('u1')]: '{not json' }), 'u1')).toEqual(DEFAULT_PREFERENCES)
    expect(readPreferences(memory({ [prefsKey('u1')]: '"text"' }), 'u1')).toEqual(DEFAULT_PREFERENCES)
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readPreferences(broken, 'u1')).toEqual(DEFAULT_PREFERENCES)
    expect(() => writePreferences(broken, 'u1', DEFAULT_PREFERENCES)).not.toThrow()
  })

  it('drops unknown values field by field', () => {
    const prefs = normalize({
      theme: 'purple',
      fontScale: 3,
      fontFamily: 'system',
      motion: 'reduce',
      highContrast: 'yes',
      focusAlways: true,
      language: 'en',
      weekStart: 0,
      extra: 1,
    })
    expect(prefs).toEqual({
      ...DEFAULT_PREFERENCES,
      fontFamily: 'system',
      motion: 'reduce',
      focusAlways: true,
      weekStart: 0,
    })
  })
})

describe('personal settings: formats', () => {
  const at = new Date(2026, 10, 2, 9, 5)
  const dmy = { dateFormat: 'dmy', timeFormat: '24h' } as const
  const ymd12 = { dateFormat: 'ymd', timeFormat: '12h' } as const

  it('writes dates day first or year first', () => {
    expect(formatDate(at, dmy)).toBe('02/11/2026')
    expect(formatDate(at, ymd12)).toBe('2026-11-02')
    // A bare calendar day stays that day whatever the time zone.
    expect(formatDate('2026-01-31', dmy)).toBe('31/01/2026')
  })

  it('writes the time on a 24- or 12-hour clock', () => {
    expect(formatTime(at, dmy)).toBe('09:05')
    expect(formatTime(at, ymd12)).toBe('9:05 SA')
    expect(formatTime(new Date(2026, 0, 1, 0, 0), ymd12)).toBe('12:00 SA')
    expect(formatTime(new Date(2026, 0, 1, 12, 30), ymd12)).toBe('12:30 CH')
    expect(formatTime(new Date(2026, 0, 1, 23, 59), ymd12)).toBe('11:59 CH')
    expect(formatDateTime(at, dmy)).toBe('02/11/2026 09:05')
  })

  it('gives the fallback for nothing or nonsense', () => {
    expect(formatDate(null, dmy)).toBe('—')
    expect(formatDate('', dmy)).toBe('—')
    expect(formatDate('not a date', dmy, '')).toBe('')
    expect(formatTime(undefined, dmy)).toBe('—')
    expect(formatDateTime('x', dmy)).toBe('—')
  })

  it('orders the weekdays from the chosen first day', () => {
    expect(weekdayLabels(1)).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])
    expect(weekdayLabels(0)[0]).toBe('CN')
  })
})

describe('personal settings: applying', () => {
  function fakeRoot() {
    return {
      dataset: {} as Record<string, string>,
      lang: '',
      style: {
        fontSize: '',
        removeProperty(this: { fontSize: string }) {
          this.fontSize = ''
          return ''
        },
      },
    }
  }

  it('sets only the attributes that differ from the defaults', () => {
    const root = fakeRoot()
    applyPreferences(DEFAULT_PREFERENCES as Preferences, root as unknown as HTMLElement)
    expect(root.dataset).toEqual({})
    expect(root.style.fontSize).toBe('')
    expect(root.lang).toBe('vi')
    const chosen: Preferences = {
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
      density: 'compact',
      fontScale: 1.12,
      fontFamily: 'system',
      lineSpacing: 'relaxed',
      motion: 'full',
      highContrast: true,
      focusAlways: true,
      underlineLinks: true,
    }
    applyPreferences(chosen, root as unknown as HTMLElement)
    expect(root.dataset).toEqual({
      theme: 'dark',
      uiDensity: 'compact',
      uiFont: 'system',
      uiLeading: 'relaxed',
      motion: 'full',
      contrast: 'more',
      focus: 'always',
      links: 'underline',
    })
    expect(root.style.fontSize).toBe('112%')
    applyPreferences(DEFAULT_PREFERENCES as Preferences, root as unknown as HTMLElement)
    expect(root.dataset).toEqual({})
    expect(root.style.fontSize).toBe('')
  })
})
