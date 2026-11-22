// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
// Checks the pack builder runs before "Lưu gói", so the button can say what is missing instead of
// failing after the click. The server validates again; these only mirror its rules.

export const LOCAL_PACK_ID = /^local\.[a-z0-9][a-z0-9-]*$/
export const PACK_VERSION = /^\d+\.\d+\.\d+$/

export interface PackMeta {
  packId: string
  name: string
  version: string
}

/** The first problem with a pack's identity fields, or '' when they can be saved. */
export function packMetaProblem(meta: PackMeta): string {
  if (!LOCAL_PACK_ID.test(meta.packId.trim()))
    return 'Mã gói phải có dạng local.ten-goi (chữ thường không dấu, số, gạch nối).'
  if (!meta.name.trim()) return 'Nhập tên gói.'
  if (!PACK_VERSION.test(meta.version.trim())) return 'Phiên bản phải có dạng 1.0.0.'
  return ''
}
