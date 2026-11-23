// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
// Small checks shared by the work screens (tasks, dossiers, approvals), kept free of Vue so they
// can be tested: a button says why it is greyed out instead of failing after the click.

/** The longest approval delegation the server accepts, in days. */
export const DELEGATION_MAX_DAYS = 90

/**
 * What is wrong with a delegation period, or '' when it can be sent. `startsAt` and `endsAt` are
 * `datetime-local` values; an empty start means "now".
 */
export function delegationProblem(startsAt: string, endsAt: string, now = Date.now()): string {
  if (!endsAt) return 'Chọn thời điểm kết thúc ủy quyền.'
  const start = startsAt ? new Date(startsAt).getTime() : now
  const end = new Date(endsAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 'Thời gian chưa đúng định dạng.'
  if (end <= now) return 'Thời điểm kết thúc phải sau hiện tại.'
  if (end <= start) return 'Thời điểm kết thúc phải sau thời điểm bắt đầu.'
  if (end - start > DELEGATION_MAX_DAYS * 86_400_000)
    return `Ủy quyền tối đa ${DELEGATION_MAX_DAYS} ngày mỗi lần.`
  return ''
}

/** A reason the server requires is missing: blank or only spaces. */
export function reasonMissing(required: boolean, text: string | null | undefined): boolean {
  return required && !(text ?? '').trim()
}

/** Label of an upload button while files go up one after another. */
export function uploadLabel(done: number, total: number): string {
  if (total <= 1) return 'Đang tải lên…'
  return `Đang tải lên ${Math.min(done + 1, total)}/${total}…`
}

