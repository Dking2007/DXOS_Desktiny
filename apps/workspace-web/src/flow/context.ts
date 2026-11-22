// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import type { InjectionKey, Ref } from 'vue'
import type { TriggerInfo } from './nodes'

export interface FlowContext {
  triggers: Ref<TriggerInfo[]>
  userName: (id: string) => string
  /** True while a test or a recorded run is painted on the canvas. */
  overlay: Ref<boolean>
  /** Opens the step picker for what follows a step; `anchor` is where the "+" was, in screen pixels. */
  addAfter: (nodeId: string, handle?: string, anchor?: { x: number; y: number }) => void
  /** Opens the step picker to put a step in the middle of a connection; absent when read-only. */
  insertOnEdge?: (edgeId: string, anchor: { x: number; y: number }) => void
  /** The connection under the pointer, which shows its "+" button. */
  hoveredEdge?: Ref<string | null>
  /** Forms a process trigger can name; absent outside process flows. */
  forms?: Ref<{ id: string; name: string }[]>
  /** A picture of a run (e.g. on a dossier): no editing affordances. */
  readonly?: boolean
}
export const FLOW_CONTEXT: InjectionKey<FlowContext> = Symbol('flow-context')
