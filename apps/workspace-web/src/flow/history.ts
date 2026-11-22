// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors

/**
 * Undo/redo over whole snapshots of the canvas. Snapshots are cheap (a flow has at most a few
 * dozen steps), so every change is one entry and undoing never has to know what kind it was.
 */
export class UndoHistory<T> {
  private past: T[] = []
  private future: T[] = []
  private present: T | undefined

  constructor(
    private readonly limit = 50,
    private readonly same: (a: T, b: T) => boolean = (a, b) => a === b,
  ) {}

  /** Starts over from a state, e.g. when a flow has just been opened or saved elsewhere. */
  reset(state: T) {
    this.past = []
    this.future = []
    this.present = state
  }

  /** Remembers a new state; returns false when nothing changed since the last one. */
  record(state: T): boolean {
    if (this.present === undefined) {
      this.present = state
      return false
    }
    if (this.same(this.present, state)) return false
    this.past.push(this.present)
    if (this.past.length > this.limit) this.past.splice(0, this.past.length - this.limit)
    this.present = state
    this.future = []
    return true
  }

  /** Swaps the present state without a new entry, e.g. when restoring re-normalises it. */
  replace(state: T) {
    this.present = state
  }

  undo(): T | undefined {
    const previous = this.past.pop()
    if (previous === undefined) return undefined
    if (this.present !== undefined) this.future.push(this.present)
    this.present = previous
    return previous
  }

  redo(): T | undefined {
    const next = this.future.pop()
    if (next === undefined) return undefined
    if (this.present !== undefined) this.past.push(this.present)
    this.present = next
    return next
  }

  get current() {
    return this.present
  }
  get canUndo() {
    return this.past.length > 0
  }
  get canRedo() {
    return this.future.length > 0
  }
  get size() {
    return this.past.length
  }
}
