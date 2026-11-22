// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors

import { ref } from 'vue'

/**
 * Whether the sidebar is folded to its icon rail.
 *
 * Ordinary pages use one remembered choice. Canvas pages (`meta.wide`) start folded so the
 * canvas gets the room, but once the person unfolds (or folds) the sidebar there, that choice
 * is remembered separately and always wins over the default.
 */
export interface SidebarPrefs {
  normal: boolean
  /** null: no choice made on wide pages yet, so the default (folded) applies. */
  wide: boolean | null
}

export const SIDEBAR_KEY = 'dx-workspace-sidebar-collapsed'
export const SIDEBAR_WIDE_KEY = 'dx-workspace-sidebar-collapsed-wide'
/** Wide pages fold the sidebar until the person says otherwise. */
export const WIDE_DEFAULT_COLLAPSED = true

type Reader = Pick<Storage, 'getItem'>
type Writer = Pick<Storage, 'setItem'>

export function isCollapsed(prefs: SidebarPrefs, wide: boolean): boolean {
  return wide ? (prefs.wide ?? WIDE_DEFAULT_COLLAPSED) : prefs.normal
}

/** Flips what the person currently sees, recording it for the kind of page they are on. */
export function toggled(prefs: SidebarPrefs, wide: boolean): SidebarPrefs {
  const next = !isCollapsed(prefs, wide)
  return wide ? { ...prefs, wide: next } : { ...prefs, normal: next }
}

export function readPrefs(storage?: Reader | null): SidebarPrefs {
  try {
    const wide = storage?.getItem(SIDEBAR_WIDE_KEY)
    return {
      normal: storage?.getItem(SIDEBAR_KEY) === '1',
      wide: wide === '1' ? true : wide === '0' ? false : null,
    }
  } catch {
    // Private windows may block storage; fall back to the defaults.
    return { normal: false, wide: null }
  }
}

export function writePrefs(storage: Writer | null | undefined, prefs: SidebarPrefs) {
  try {
    storage?.setItem(SIDEBAR_KEY, prefs.normal ? '1' : '0')
    if (prefs.wide !== null) storage?.setItem(SIDEBAR_WIDE_KEY, prefs.wide ? '1' : '0')
  } catch {
    // The choice still holds for this visit.
  }
}

export function toggleLabel(collapsed: boolean) {
  return collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'
}

function browserStorage(): (Reader & Writer) | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** The one live copy of the choice: the shell's button and Cài đặt cá nhân both read and write it. */
export const sidebarPrefs = ref<SidebarPrefs>(readPrefs(browserStorage()))

export function toggleSidebar(wide: boolean) {
  sidebarPrefs.value = toggled(sidebarPrefs.value, wide)
  writePrefs(browserStorage(), sidebarPrefs.value)
}

/** Sets the folded state for ordinary pages (the wide-page choice stays as it is). */
export function setSidebarCollapsed(collapsed: boolean) {
  sidebarPrefs.value = { ...sidebarPrefs.value, normal: collapsed }
  writePrefs(browserStorage(), sidebarPrefs.value)
}
