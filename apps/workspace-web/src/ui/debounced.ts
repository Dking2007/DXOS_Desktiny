// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { getCurrentScope, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { ShallowRef, WatchSource } from 'vue'

/**
 * A copy of `source` that follows it only once it has stopped changing for `delay` ms, e.g. a
 * search box feeding a query key, so typing a word sends one request instead of one per key.
 * The copy can be set directly (to clear it at once); a pending update is dropped when the
 * component or scope that created it goes away.
 */
export function useDebounced<T>(source: WatchSource<T>, delay: number): ShallowRef<T> {
  const value = shallowRef(toValue(source)) as ShallowRef<T>
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(source, (next) => {
    clearTimeout(timer)
    timer = setTimeout(() => (value.value = next), delay)
  })
  if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer))
  return value
}
