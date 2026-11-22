// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors

/** What a key press on the canvas asks for. */
export type CanvasAction =
  | { type: 'save' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'copy' }
  | { type: 'cut' }
  | { type: 'paste' }
  | { type: 'duplicate' }
  | { type: 'select-all' }
  | { type: 'delete' }
  | { type: 'escape' }
  | { type: 'help' }
  | { type: 'add-step' }
  | { type: 'fit' }
  | { type: 'layout' }
  | { type: 'nudge'; dx: number; dy: number }

export interface KeyLike {
  key: string
  code?: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

/** Arrow keys move selected steps by this much; with Shift ten times as far (one grid square). */
export const NUDGE = 2

/** The letter on the key, whatever the keyboard layout or Shift state. */
function letter(event: KeyLike) {
  return event.code?.startsWith('Key') ? event.code.slice(3).toLowerCase() : event.key.toLowerCase()
}

export function shortcutFor(event: KeyLike): CanvasAction | null {
  const mod = !!(event.ctrlKey || event.metaKey)
  if (event.altKey) return null
  if (mod) {
    switch (letter(event)) {
      case 's':
        return { type: 'save' }
      case 'z':
        return { type: event.shiftKey ? 'redo' : 'undo' }
      case 'y':
        return event.shiftKey ? null : { type: 'redo' }
      case 'c':
        return event.shiftKey ? null : { type: 'copy' }
      case 'x':
        return event.shiftKey ? null : { type: 'cut' }
      case 'v':
        return event.shiftKey ? null : { type: 'paste' }
      case 'd':
        return event.shiftKey ? null : { type: 'duplicate' }
      case 'a':
        return event.shiftKey ? null : { type: 'select-all' }
    }
    return null
  }
  switch (event.key) {
    case 'Delete':
    case 'Backspace':
      return { type: 'delete' }
    case 'Escape':
      return { type: 'escape' }
    case '?':
      return { type: 'help' }
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'ArrowUp':
    case 'ArrowDown': {
      const step = event.shiftKey ? NUDGE * 10 : NUDGE
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
      return { type: 'nudge', dx, dy }
    }
  }
  if (event.shiftKey && (event.code === 'Digit1' || event.key === '!')) return { type: 'fit' }
  if (event.shiftKey && letter(event) === 'l') return { type: 'layout' }
  if (!event.shiftKey && letter(event) === 'n') return { type: 'add-step' }
  return null
}

/** True while people type: shortcuts must leave text fields, lists and rich text alone. */
export function isTypingTarget(target: unknown): boolean {
  const element = target as { tagName?: string; isContentEditable?: boolean; closest?: (s: string) => unknown } | null
  if (!element || typeof element !== 'object') return false
  if (element.isContentEditable) return true
  const tag = String(element.tagName ?? '').toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return !!element.closest?.('[contenteditable=""], [contenteditable="true"]')
}

/** Shortcut list shown in the help popover and the flow's guide, with Ctrl swapped for ⌘ on a Mac. */
export function shortcutHelp(mac = false): { group: string; items: { keys: string[]; label: string }[] }[] {
  const mod = mac ? '⌘' : 'Ctrl'
  return [
    {
      group: 'Chỉnh sửa',
      items: [
        { keys: [mod, 'C'], label: 'Sao chép các bước đang chọn' },
        { keys: [mod, 'X'], label: 'Cắt các bước đang chọn' },
        { keys: [mod, 'V'], label: 'Dán (tại vị trí con trỏ chuột)' },
        { keys: [mod, 'D'], label: 'Nhân bản bước đang chọn' },
        { keys: ['Delete'], label: 'Xóa bước hoặc đường nối đang chọn' },
        { keys: [mod, 'Z'], label: 'Hoàn tác' },
        { keys: [mod, 'Shift', 'Z'], label: 'Làm lại (hoặc Ctrl Y)' },
        { keys: [mod, 'S'], label: 'Lưu luồng' },
      ],
    },
    {
      group: 'Chọn và di chuyển',
      items: [
        { keys: [mod, 'A'], label: 'Chọn tất cả các bước' },
        { keys: ['Shift', 'Kéo'], label: 'Quét chọn nhiều bước' },
        { keys: [mod, 'Bấm'], label: 'Thêm/bớt một bước khỏi vùng chọn' },
        { keys: ['← ↑ → ↓'], label: 'Dịch chuyển bước đang chọn (giữ Shift: xa hơn)' },
        { keys: ['Esc'], label: 'Bỏ chọn, đóng bảng cấu hình' },
      ],
    },
    {
      group: 'Canvas',
      items: [
        { keys: ['N'], label: 'Thêm bước (nối sau bước đang chọn)' },
        { keys: ['Shift', 'L'], label: 'Sắp xếp tự động' },
        { keys: ['Shift', '1'], label: 'Vừa màn hình' },
        { keys: ['Chuột phải'], label: 'Mở menu thao tác nhanh' },
        { keys: ['?'], label: 'Mở/đóng bảng phím tắt' },
      ],
    },
  ]
}

export function isMac() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
}
