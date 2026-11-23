// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useDebounced } from './debounced'

describe('useDebounced', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts with the current value and follows only after the pause', async () => {
    const text = ref('a')
    const value = useDebounced(text, 250)
    expect(value.value).toBe('a')
    text.value = 'ab'
    await nextTick()
    vi.advanceTimersByTime(200)
    text.value = 'abc'
    await nextTick()
    vi.advanceTimersByTime(200)
    expect(value.value).toBe('a')
    vi.advanceTimersByTime(50)
    expect(value.value).toBe('abc')
  })

  it('accepts a getter as its source', async () => {
    const text = ref(' x ')
    const value = useDebounced(() => text.value.trim(), 100)
    expect(value.value).toBe('x')
    text.value = ' y '
    await nextTick()
    vi.advanceTimersByTime(100)
    expect(value.value).toBe('y')
  })

  it('drops a pending update once its scope is gone', async () => {
    const text = ref('a')
    const scope = effectScope()
    const value = scope.run(() => useDebounced(text, 100))!
    text.value = 'b'
    await nextTick()
    scope.stop()
    vi.advanceTimersByTime(500)
    expect(value.value).toBe('a')
  })
})
