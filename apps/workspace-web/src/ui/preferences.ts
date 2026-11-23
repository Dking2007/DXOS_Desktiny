// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
// Personal settings (Cài đặt cá nhân): look, text, accessibility, language and formats. Every
// choice applies at once, is remembered per person on this device, and is put on <html> before the
// app mounts so nobody sees the stock look flash first. The sector pack's look (ui/appearance.ts)
// is the organisation's; these sit on top of it for one person.
import { ref } from 'vue'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type Density = 'default' | 'comfortable' | 'compact'
export type FontFamily = 'default' | 'system'
export type LineSpacing = 'normal' | 'relaxed'
export type Motion = 'system' | 'reduce' | 'full'
export type DateFormat = 'dmy' | 'ymd'
export type TimeFormat = '24h' | '12h'
export type WeekStart = 1 | 0

export interface Preferences {
  theme: ThemeChoice
  density: Density
  fontScale: number
  fontFamily: FontFamily
  lineSpacing: LineSpacing
  motion: Motion
  highContrast: boolean
  focusAlways: boolean
  underlineLinks: boolean
  language: string
  dateFormat: DateFormat
  timeFormat: TimeFormat
  weekStart: WeekStart
}

/**
 * Languages the interface is written in. Only Vietnamese exists today; a translation would be its
 * own project (string catalogue, plural rules, review). Adding one here is the only switch needed
 * on this side.
 */
export const LANGUAGES = [{ code: 'vi', label: 'Tiếng Việt', locale: 'vi-VN' }] as const
export const FONT_SCALES = [
  { value: 0.9, label: 'Nhỏ', hint: '90%' },
  { value: 1, label: 'Mặc định', hint: '100%' },
  { value: 1.12, label: 'Lớn', hint: '112%' },
  { value: 1.25, label: 'Rất lớn', hint: '125%' },
] as const

export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
  theme: 'system',
  density: 'default',
  fontScale: 1,
  fontFamily: 'default',
  lineSpacing: 'normal',
  motion: 'system',
  highContrast: false,
  focusAlways: false,
  underlineLinks: false,
  language: 'vi',
  dateFormat: 'dmy',
  timeFormat: '24h',
  weekStart: 1,
})

export const PREFS_KEY = 'dx-workspace-prefs'
/** Whose settings to put on before the session answers (the last person signed in here). */
export const PREFS_USER_KEY = 'dx-workspace-prefs-user'
/** The theme toggle's key before personal settings existed. */
export const LEGACY_THEME_KEY = 'dx-workspace-theme'

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function prefsKey(userId: string | null | undefined) {
  return `${PREFS_KEY}:${userId || 'guest'}`
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** Keeps every known field that holds an allowed value; anything else falls back to the default. */
export function normalize(raw: unknown): Preferences {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const d = DEFAULT_PREFERENCES
  return {
    theme: oneOf(source.theme, ['light', 'dark', 'system'] as const, d.theme),
    density: oneOf(source.density, ['default', 'comfortable', 'compact'] as const, d.density),
    fontScale: oneOf(
      source.fontScale,
      FONT_SCALES.map((scale) => scale.value as number),
      d.fontScale,
    ),
    fontFamily: oneOf(source.fontFamily, ['default', 'system'] as const, d.fontFamily),
    lineSpacing: oneOf(source.lineSpacing, ['normal', 'relaxed'] as const, d.lineSpacing),
    motion: oneOf(source.motion, ['system', 'reduce', 'full'] as const, d.motion),
    highContrast: source.highContrast === true,
    focusAlways: source.focusAlways === true,
    underlineLinks: source.underlineLinks === true,
    language: oneOf(
      source.language,
      LANGUAGES.map((language) => language.code as string),
      d.language,
    ),
    dateFormat: oneOf(source.dateFormat, ['dmy', 'ymd'] as const, d.dateFormat),
    timeFormat: oneOf(source.timeFormat, ['24h', '12h'] as const, d.timeFormat),
    weekStart: oneOf(source.weekStart, [1, 0] as const, d.weekStart),
  }
}

/** The theme chosen with the old toggle, if any, so nobody loses it with the move. */
function legacyTheme(storage: Store | null | undefined): ThemeChoice | null {
  try {
    const value = storage?.getItem(LEGACY_THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

/** Stored settings for one person; missing or damaged data gives the defaults (plus the old theme). */
export function readPreferences(storage: Store | null | undefined, userId: string | null | undefined): Preferences {
  let text: string | null = null
  try {
    text = storage?.getItem(prefsKey(userId)) ?? null
  } catch {
    text = null
  }
  if (text) {
    try {
      return normalize(JSON.parse(text))
    } catch {
      // Damaged JSON: start again from the defaults below.
    }
  }
  const theme = legacyTheme(storage)
  return theme ? { ...DEFAULT_PREFERENCES, theme } : { ...DEFAULT_PREFERENCES }
}

export function hasStoredPreferences(storage: Store | null | undefined, userId: string | null | undefined) {
  try {
    return !!storage?.getItem(prefsKey(userId))
  } catch {
    return false
  }
}

export function writePreferences(storage: Store | null | undefined, userId: string | null | undefined, prefs: Preferences) {
  try {
    storage?.setItem(prefsKey(userId), JSON.stringify(prefs))
    // The old key has been carried over; leaving it would bring it back after a reset.
    storage?.removeItem(LEGACY_THEME_KEY)
  } catch {
    // Private windows may block storage; the choice still holds for this visit.
  }
}

// ---- Formats ----

const pad = (value: number) => String(value).padStart(2, '0')

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // A bare date is a calendar day, not midnight UTC: read it in local time.
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

type FormatPrefs = Pick<Preferences, 'dateFormat' | 'timeFormat'>

/** 22/11/2026 or 2026-11-22. Empty or unreadable input gives the fallback ("—"). */
export function formatDate(
  value: Date | string | number | null | undefined,
  prefs: FormatPrefs = preferences.value,
  fallback = '—',
): string {
  const date = toDate(value)
  if (!date) return fallback
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = String(date.getFullYear())
  return prefs.dateFormat === 'ymd' ? `${year}-${month}-${day}` : `${day}/${month}/${year}`
}

/** 14:05 or 2:05 CH (SA = sáng, CH = chiều, as Vietnamese clocks write it). */
export function formatTime(
  value: Date | string | number | null | undefined,
  prefs: FormatPrefs = preferences.value,
  fallback = '—',
): string {
  const date = toDate(value)
  if (!date) return fallback
  const hours = date.getHours()
  const minutes = pad(date.getMinutes())
  if (prefs.timeFormat === '24h') return `${pad(hours)}:${minutes}`
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'SA' : 'CH'}`
}

export function formatDateTime(
  value: Date | string | number | null | undefined,
  prefs: FormatPrefs = preferences.value,
  fallback = '—',
): string {
  const date = toDate(value)
  if (!date) return fallback
  return `${formatDate(date, prefs)} ${formatTime(date, prefs)}`
}

/** Weekday names from the person's first day of the week, for calendars and date pickers. */
export function weekdayLabels(weekStart: WeekStart = preferences.value.weekStart): string[] {
  const names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return [...names.slice(weekStart), ...names.slice(0, weekStart)]
}

export function localeOf(language: string = preferences.value.language): string {
  return LANGUAGES.find((item) => item.code === language)?.locale ?? 'vi-VN'
}

// ---- Live state ----

function browserStorage(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

let currentUser: string | null = null
export const preferences = ref<Preferences>({ ...DEFAULT_PREFERENCES })

/** Puts the settings on <html> as attributes the stylesheets read (refine.css, "Personal settings"). */
export function applyPreferences(prefs: Preferences = preferences.value, root?: HTMLElement) {
  const html = root ?? (typeof document === 'undefined' ? null : document.documentElement)
  if (!html) return
  const attrs: Record<string, string | null> = {
    // "system" sets nothing, so the prefers-color-scheme rules decide.
    theme: prefs.theme === 'system' ? null : prefs.theme,
    uiDensity: prefs.density === 'default' ? null : prefs.density,
    uiFont: prefs.fontFamily === 'default' ? null : prefs.fontFamily,
    uiLeading: prefs.lineSpacing === 'normal' ? null : prefs.lineSpacing,
    motion: prefs.motion === 'system' ? null : prefs.motion,
    contrast: prefs.highContrast ? 'more' : null,
    focus: prefs.focusAlways ? 'always' : null,
    links: prefs.underlineLinks ? 'underline' : null,
  }
  for (const [key, value] of Object.entries(attrs)) {
    if (value) html.dataset[key] = value
    else delete html.dataset[key]
  }
  // Text is sized in rem, so the root size scales every rem-sized label at once.
  if (prefs.fontScale === 1) html.style.removeProperty('font-size')
  else html.style.fontSize = `${Math.round(prefs.fontScale * 1000) / 10}%`
  html.lang = prefs.language
}

/** Applies the last signed-in person's settings; called once, before the app mounts. */
export function startPreferences() {
  const storage = browserStorage()
  try {
    currentUser = storage?.getItem(PREFS_USER_KEY) ?? null
  } catch {
    currentUser = null
  }
  preferences.value = readPreferences(storage, currentUser)
  applyPreferences()
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onOtherTab)
    import.meta.hot?.dispose(() => window.removeEventListener('storage', onOtherTab))
  }
}

/** Another tab changed them: follow along. */
function onOtherTab(event: StorageEvent) {
  if (event.key !== prefsKey(currentUser)) return
  preferences.value = readPreferences(browserStorage(), currentUser)
  applyPreferences()
}

/** Switches to the signed-in person's settings; someone with none keeps what is on screen now. */
export function bindPreferencesUser(userId: string) {
  if (userId === currentUser) return
  const storage = browserStorage()
  currentUser = userId
  try {
    storage?.setItem(PREFS_USER_KEY, userId)
  } catch {
    // Without storage the settings still follow this visit.
  }
  if (hasStoredPreferences(storage, userId)) {
    preferences.value = readPreferences(storage, userId)
    applyPreferences()
  } else writePreferences(storage, userId, preferences.value)
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  preferences.value = normalize({ ...preferences.value, [key]: value })
  writePreferences(browserStorage(), currentUser, preferences.value)
  applyPreferences()
}

export function resetPreferences() {
  preferences.value = { ...DEFAULT_PREFERENCES }
  writePreferences(browserStorage(), currentUser, preferences.value)
  applyPreferences()
}

/** For script-driven motion (smooth scrolling, counters): the setting first, then the device. */
export function prefersReducedMotion(prefs: Pick<Preferences, 'motion'> = preferences.value): boolean {
  if (prefs.motion !== 'system') return prefs.motion === 'reduce'
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** `behavior` for scrollTo / scrollIntoView that honours the motion setting. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}
