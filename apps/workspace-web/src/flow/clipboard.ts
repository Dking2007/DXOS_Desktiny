// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { KINDS, nodeReference, plainCopy } from './nodes'
import type { ApiGraph, Branch, NodeKind } from './nodes'

type ClipNode = ApiGraph['nodes'][number]
type ClipEdge = ApiGraph['edges'][number]

/** Marks clipboard text as steps copied from a Desktiny canvas, so other text is never pasted as steps. */
export const CLIP_TAG = 'desktiny/flow-steps'

export interface FlowClip {
  tag: typeof CLIP_TAG
  version: 1
  nodes: ClipNode[]
  /** Only the connections between copied steps; links to steps left behind are dropped. */
  edges: ClipEdge[]
}

/**
 * Copies the chosen steps and the connections among them. The trigger is never copied: a flow
 * has exactly one, so `skipped` tells the caller to explain why it was left out.
 */
export function copyNodes(graph: ApiGraph, ids: Iterable<string>): { clip: FlowClip; skipped: number } {
  const wanted = new Set(ids)
  const picked = graph.nodes.filter((node) => wanted.has(node.id))
  const nodes = picked.filter((node) => node.type !== 'trigger')
  const kept = new Set(nodes.map((node) => node.id))
  return {
    clip: {
      tag: CLIP_TAG,
      version: 1,
      nodes: plainCopy(nodes),
      edges: plainCopy(graph.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target))),
    },
    skipped: picked.length - nodes.length,
  }
}

export function serializeClip(clip: FlowClip): string {
  return JSON.stringify(clip)
}

function isPoint(value: unknown): value is { x: number; y: number } {
  const point = value as { x?: unknown; y?: unknown } | null
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y)
}

/** Reads clipboard text back; anything that is not a well-formed set of steps gives null. */
export function parseClip(text: string | null | undefined): FlowClip | null {
  if (!text || !text.includes(CLIP_TAG)) return null
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  const clip = value as Partial<FlowClip> | null
  if (!clip || clip.tag !== CLIP_TAG || !Array.isArray(clip.nodes) || !Array.isArray(clip.edges)) return null
  const nodes = clip.nodes.filter(
    (node): node is ClipNode =>
      !!node &&
      typeof node.id === 'string' &&
      typeof node.type === 'string' &&
      node.type in KINDS &&
      isPoint(node.position) &&
      !!node.data &&
      typeof node.data === 'object',
  )
  const ids = new Set(nodes.map((node) => node.id))
  const edges = clip.edges.filter(
    (edge): edge is ClipEdge =>
      !!edge && typeof edge.source === 'string' && ids.has(edge.source) && ids.has(edge.target),
  )
  if (!nodes.length) return null
  return {
    tag: CLIP_TAG,
    version: 1,
    nodes: nodes.map((node) => ({ ...node, label: typeof node.label === 'string' ? node.label : '' })),
    edges,
  }
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Rewrites `{old.field}` and condition fields `old.field` to the pasted step's own name. */
function renameReferences(value: unknown, names: Map<string, string>): unknown {
  if (!names.size) return value
  if (typeof value === 'string') {
    const pattern = new RegExp(`(^|[^A-Za-z0-9_.])(${[...names.keys()].map(escape).join('|')})\\.`, 'g')
    return value.replace(pattern, (_, before: string, name: string) => `${before}${names.get(name)}.`)
  }
  if (Array.isArray(value)) return value.map((item) => renameReferences(item, names))
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renameReferences(item, names)]))
  return value
}

export interface PasteOptions {
  /** Steps already on the canvas: new ids and result names must not clash with theirs. */
  existing: ApiGraph['nodes']
  newId: (kind: NodeKind) => string
  /** Top-left corner of the pasted group, in flow coordinates. */
  at?: { x: number; y: number }
  /** Used when `at` is absent: how far from the copied positions the group lands. */
  offset?: { x: number; y: number }
  /** How many steps may still be added before the flow reaches its size limit. */
  room?: number
}

export interface PasteResult {
  nodes: ClipNode[]
  edges: ClipEdge[]
  /** Copied triggers left out, since a flow has only one. */
  triggers: number
  /** Steps left out because the flow is full. */
  overflow: number
  /** Old id → new id of every pasted step. */
  ids: Record<string, string>
}

/**
 * Turns a clip into fresh steps: new ids, deep-copied settings, unique result names, references
 * between pasted steps renamed to match, and the connections among them kept.
 */
export function pasteClip(clip: FlowClip, options: PasteOptions): PasteResult {
  const candidates = clip.nodes.filter((node) => node.type !== 'trigger')
  const triggers = clip.nodes.length - candidates.length
  const room = Math.max(0, options.room ?? Infinity)
  const chosen = candidates.slice(0, room)
  const overflow = candidates.length - chosen.length

  const takenIds = new Set(options.existing.map((node) => node.id))
  const takenNames = new Set(options.existing.map((node) => nodeReference(node.id, node.data)))
  const ids: Record<string, string> = {}
  const names = new Map<string, string>()
  const configs = new Map<string, Record<string, unknown>>()
  for (const node of chosen) {
    let id = options.newId(node.type)
    for (let attempt = 2; takenIds.has(id); attempt += 1) id = `${options.newId(node.type)}_${attempt}`
    takenIds.add(id)
    ids[node.id] = id
    const config = plainCopy(node.data ?? {})
    if (config.output_name) {
      const base = String(config.output_name)
      let name = base
      for (let attempt = 2; takenNames.has(name); attempt += 1) name = `${base}_${attempt}`
      config.output_name = name
    }
    const before = nodeReference(node.id, node.data ?? {})
    const after = nodeReference(id, config)
    takenNames.add(after)
    if (before !== after) names.set(before, after)
    configs.set(node.id, config)
  }

  const left = Math.min(...chosen.map((node) => node.position.x))
  const top = Math.min(...chosen.map((node) => node.position.y))
  const shift = options.at
    ? { x: options.at.x - left, y: options.at.y - top }
    : (options.offset ?? { x: 40, y: 40 })

  const nodes = chosen.map((node) => ({
    id: ids[node.id]!,
    type: node.type,
    label: node.label ?? '',
    position: { x: Math.round(node.position.x + shift.x), y: Math.round(node.position.y + shift.y) },
    data: renameReferences(configs.get(node.id), names) as Record<string, unknown>,
  }))
  const edges = clip.edges
    .filter((edge) => ids[edge.source] && ids[edge.target])
    .map((edge) => {
      const source = ids[edge.source]!
      const target = ids[edge.target]!
      const branch = (edge.branch ?? null) as Branch | null
      return { id: `${source}${branch ? `:${branch}` : ''}->${target}`, source, target, branch }
    })
  return { nodes, edges, triggers, overflow, ids }
}
