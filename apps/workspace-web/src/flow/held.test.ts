// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import { nextTick, reactive, ref, watch } from 'vue'
import { heldWhile } from './held'

describe('heldWhile', () => {
  it('follows its source while not paused', () => {
    const paused = ref(false)
    const source = reactive({ x: 1 })
    const value = heldWhile(paused, () => source.x * 10)
    expect(value.value).toBe(10)
    source.x = 2
    expect(value.value).toBe(20)
  })

  it('keeps the last value and does not re-read while paused, then catches up', () => {
    const paused = ref(false)
    const source = reactive({ x: 1 })
    let reads = 0
    const value = heldWhile(paused, () => {
      reads += 1
      return source.x
    })
    expect(value.value).toBe(1)
    paused.value = true
    for (let i = 2; i < 50; i += 1) {
      source.x = i
      expect(value.value).toBe(1)
    }
    expect(reads).toBe(1)
    paused.value = false
    expect(value.value).toBe(49)
    expect(reads).toBe(2)
  })

  it('does not wake watchers while paused', async () => {
    const paused = ref(false)
    const source = reactive({ x: 1 })
    const value = heldWhile(paused, () => source.x)
    const seen: number[] = []
    watch(value, (next) => seen.push(next))
    paused.value = true
    source.x = 2
    await nextTick()
    source.x = 3
    await nextTick()
    expect(seen).toEqual([])
    paused.value = false
    await nextTick()
    expect(seen).toEqual([3])
  })

  it('reads at least once even if created while paused', () => {
    const value = heldWhile(ref(true), () => 'first')
    expect(value.value).toBe('first')
  })
})
