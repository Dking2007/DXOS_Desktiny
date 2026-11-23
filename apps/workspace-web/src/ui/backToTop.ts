// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors

/** The "Lên đầu trang" button appears once the page has scrolled past about one screen. */
export const SHOW_AFTER_SCREENS = 1
/** …and goes away a little earlier on the way up, so it does not flicker at the threshold. */
export const HIDE_BELOW_SCREENS = 0.75

export interface ScrollState {
  /** Pixels scrolled from the top. */
  top: number
  /** Height of the visible part of the scroller. */
  height: number
}

/** Whether the button should be shown, given whether it is shown now (hysteresis). */
export function nextVisible(visible: boolean, state: ScrollState): boolean {
  if (state.height <= 0) return false
  const limit = state.height * (visible ? HIDE_BELOW_SCREENS : SHOW_AFTER_SCREENS)
  return state.top > limit
}

/**
 * The page may scroll as a whole (window) or inside the main pane; the one that has
 * actually moved is the one to report and to bring back to the top.
 */
export function mostScrolled<T extends ScrollState>(states: readonly T[]): T | undefined {
  let best: T | undefined
  for (const state of states) if (!best || state.top > best.top) best = state
  return best
}

export type Glide = 'auto' | 'smooth'

export function scrollBehavior(reducedMotion: boolean): Glide {
  return reducedMotion ? 'auto' : 'smooth'
}

/** Canvas pages (process designer) manage their own viewport; the button would only get in the way. */
export function allowedOn(meta: { wide?: unknown }): boolean {
  return !meta.wide
}
