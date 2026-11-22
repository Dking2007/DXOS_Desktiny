// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { dayLabel } from './upload'

/** Messages from one sender less than this far apart read as one block. */
export const GROUP_GAP_MS = 5 * 60_000

export interface MessageRow<T> {
  message: T
  /** The day separator shown above this message, when it starts a new day. */
  day: string | null
  /** First and last message of a block from one sender. */
  first: boolean
  last: boolean
}

/**
 * Lays out a conversation: a day separator where the day changes, and consecutive messages
 * from one person within five minutes on the same day grouped as one block. Each date is parsed
 * once and the (slow, locale-formatted) day label is built only where a separator shows.
 */
export function messageRows<T extends { sender_id: string; created_at: string }>(
  messages: readonly T[],
  label: (iso: string) => string = dayLabel,
): MessageRow<T>[] {
  const times = messages.map((message) => new Date(message.created_at))
  const days = times.map((time) => time.toDateString())
  const close = (a: number, b: number) =>
    a >= 0 &&
    b < messages.length &&
    messages[a].sender_id === messages[b].sender_id &&
    days[a] === days[b] &&
    Math.abs(times[b].getTime() - times[a].getTime()) < GROUP_GAP_MS
  return messages.map((message, index) => ({
    message,
    day: index === 0 || days[index - 1] !== days[index] ? label(message.created_at) : null,
    first: !close(index - 1, index),
    last: !close(index, index + 1),
  }))
}
