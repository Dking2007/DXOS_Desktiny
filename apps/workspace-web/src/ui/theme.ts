// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
// Light, dark or follow the device. The choice is one of the personal settings (ui/preferences.ts);
// this module keeps the small API the top bar toggle and the command palette use.
import { computed, ref } from 'vue'
import { preferences, setPreference, type ThemeChoice } from './preferences'

export type { ThemeChoice }

export const theme = computed(() => preferences.value.theme)

// Follows the operating system live, so "system" re-renders the toggle when the OS switches.
const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined
export const systemDark = ref(media?.matches ?? false)
const onSystemTheme = (event: MediaQueryListEvent) => (systemDark.value = event.matches)
media?.addEventListener?.('change', onSystemTheme)
import.meta.hot?.dispose(() => media?.removeEventListener?.('change', onSystemTheme))

/** `data-theme` is only set for an explicit choice; "system" falls back to prefers-color-scheme. */
export function applyTheme(choice: ThemeChoice) {
  setPreference('theme', choice)
}

export function isDark() {
  if (theme.value !== 'system') return theme.value === 'dark'
  return systemDark.value
}

export function cycleTheme() {
  applyTheme(isDark() ? 'light' : 'dark')
}
