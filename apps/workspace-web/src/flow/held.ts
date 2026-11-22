// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'

/**
 * A computed value that stands still while `paused` is true: it keeps its last value and stops
 * tracking what `read` depends on, so e.g. dragging steps (which moves them on every pointer
 * move) does not re-serialise the whole graph each frame. It catches up as soon as the pause ends.
 */
export function heldWhile<T>(paused: Ref<boolean>, read: () => T): ComputedRef<T> {
  return computed<T>((previous) => (paused.value && previous !== undefined ? previous : read()))
}
