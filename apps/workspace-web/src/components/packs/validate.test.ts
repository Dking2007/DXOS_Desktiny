// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import { packMetaProblem } from './validate'

describe('pack builder checks', () => {
  const ok = { packId: 'local.co-quan', name: 'Giao diện', version: '1.0.0' }
  it('accepts a well-formed local pack', () => {
    expect(packMetaProblem(ok)).toBe('')
  })
  it('explains the first problem', () => {
    expect(packMetaProblem({ ...ok, packId: 'co-quan' })).toMatch(/local\.ten-goi/)
    expect(packMetaProblem({ ...ok, packId: 'local.Cơ-quan' })).toMatch(/local\.ten-goi/)
    expect(packMetaProblem({ ...ok, packId: 'local.-x' })).toMatch(/local\.ten-goi/)
    expect(packMetaProblem({ ...ok, name: '   ' })).toBe('Nhập tên gói.')
    expect(packMetaProblem({ ...ok, version: '1.0' })).toMatch(/1\.0\.0/)
  })
})
