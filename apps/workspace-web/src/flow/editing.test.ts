// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import { CLIP_TAG, copyNodes, parseClip, pasteClip, serializeClip } from './clipboard'
import { UndoHistory } from './history'
import { alignBoxes, autoLayout, makeRoom } from './layout'
import { isTypingTarget, NUDGE, shortcutFor, shortcutHelp } from './shortcuts'
import type { ApiGraph } from './nodes'

const graph: ApiGraph = {
  nodes: [
    { id: 'trigger', type: 'trigger', label: '', position: { x: 0, y: 0 }, data: { event: 'case.submitted' } },
    {
      id: 'approval_a1',
      type: 'approval',
      label: 'Trưởng phòng duyệt',
      position: { x: 360, y: 0 },
      data: { resolver: 'manager', nested: { list: [1, 2] } },
    },
    {
      id: 'notify_b2',
      type: 'notify',
      label: '',
      position: { x: 720, y: 40 },
      data: { message: 'Kết quả: {approval_a1.decision}', recipients: ['creator'] },
    },
    { id: 'if_c3', type: 'if', label: '', position: { x: 720, y: 200 }, data: { output_name: 'kiem_tra' } },
  ],
  edges: [
    { id: 'trigger->approval_a1', source: 'trigger', target: 'approval_a1', branch: null },
    { id: 'approval_a1:approve->notify_b2', source: 'approval_a1', target: 'notify_b2', branch: 'approve' },
    { id: 'approval_a1:reject->if_c3', source: 'approval_a1', target: 'if_c3', branch: 'reject' },
  ],
}
function ids() {
  let n = 0
  return (kind: string) => `${kind}_new${++n}`
}

describe('copy and paste of steps', () => {
  it('copies the chosen steps with only the connections among them', () => {
    const { clip, skipped } = copyNodes(graph, ['approval_a1', 'notify_b2'])
    expect(skipped).toBe(0)
    expect(clip.nodes.map((n) => n.id)).toEqual(['approval_a1', 'notify_b2'])
    expect(clip.edges.map((e) => e.id)).toEqual(['approval_a1:approve->notify_b2'])
  })

  it('never copies the trigger and says so', () => {
    const { clip, skipped } = copyNodes(graph, ['trigger', 'if_c3'])
    expect(skipped).toBe(1)
    expect(clip.nodes.map((n) => n.type)).toEqual(['if'])
  })

  it('deep-copies settings so editing the copy leaves the original alone', () => {
    const { clip } = copyNodes(graph, ['approval_a1'])
    ;(clip.nodes[0]!.data.nested as { list: number[] }).list.push(3)
    expect((graph.nodes[1]!.data.nested as { list: number[] }).list).toEqual([1, 2])
  })

  it('pastes with fresh ids, kept internal edges and renamed references', () => {
    const { clip } = copyNodes(graph, ['approval_a1', 'notify_b2'])
    const result = pasteClip(clip, { existing: graph.nodes, newId: ids(), offset: { x: 40, y: 40 } })
    expect(result.nodes.map((n) => n.id)).toEqual(['approval_new1', 'notify_new2'])
    expect(result.nodes[0]!.position).toEqual({ x: 400, y: 40 })
    expect(result.nodes[0]!.label).toBe('Trưởng phòng duyệt')
    expect(result.edges).toEqual([
      { id: 'approval_new1:approve->notify_new2', source: 'approval_new1', target: 'notify_new2', branch: 'approve' },
    ])
    expect(result.nodes[1]!.data.message).toBe('Kết quả: {approval_new1.decision}')
    expect(result.ids).toEqual({ approval_a1: 'approval_new1', notify_b2: 'notify_new2' })
  })

  it('keeps references to steps that were not copied', () => {
    const { clip } = copyNodes(graph, ['notify_b2'])
    const [node] = pasteClip(clip, { existing: graph.nodes, newId: ids() }).nodes
    expect(node!.data.message).toBe('Kết quả: {approval_a1.decision}')
  })

  it('places the group at the pointer and keeps result names unique', () => {
    const { clip } = copyNodes(graph, ['if_c3', 'notify_b2'])
    const result = pasteClip(clip, { existing: graph.nodes, newId: ids(), at: { x: 1000, y: 500 } })
    const positions = Object.fromEntries(result.nodes.map((n) => [n.type, n.position]))
    expect(positions).toEqual({ notify: { x: 1000, y: 500 }, if: { x: 1000, y: 660 } })
    expect(result.nodes.find((n) => n.type === 'if')!.data.output_name).toBe('kiem_tra_2')
  })

  it('respects the room left in the flow and drops pasted triggers', () => {
    const clip = { ...copyNodes(graph, ['approval_a1', 'notify_b2', 'if_c3']).clip }
    clip.nodes = [graph.nodes[0]!, ...clip.nodes]
    const result = pasteClip(clip, { existing: graph.nodes, newId: ids(), room: 2 })
    expect(result.triggers).toBe(1)
    expect(result.overflow).toBe(1)
    expect(result.nodes).toHaveLength(2)
  })

  it('never reuses an id already on the canvas', () => {
    const { clip } = copyNodes(graph, ['if_c3'])
    const result = pasteClip(clip, { existing: graph.nodes, newId: () => 'if_c3' })
    expect(result.nodes[0]!.id).not.toBe('if_c3')
  })

  it('round-trips through clipboard text and rejects anything else', () => {
    const { clip } = copyNodes(graph, ['approval_a1', 'notify_b2'])
    expect(parseClip(serializeClip(clip))).toEqual(clip)
    expect(parseClip('xin chào')).toBeNull()
    expect(parseClip(`{"tag":"${CLIP_TAG}"`)).toBeNull()
    expect(parseClip(JSON.stringify({ tag: CLIP_TAG, nodes: [{ id: 'x', type: 'bogus' }], edges: [] }))).toBeNull()
    expect(parseClip(null)).toBeNull()
  })
})

describe('undo history', () => {
  it('undoes and redoes snapshots in order', () => {
    const history = new UndoHistory<string>()
    history.reset('a')
    expect(history.record('a')).toBe(false)
    history.record('b')
    history.record('c')
    expect(history.undo()).toBe('b')
    expect(history.undo()).toBe('a')
    expect(history.undo()).toBeUndefined()
    expect(history.redo()).toBe('b')
    expect(history.canRedo).toBe(true)
    history.record('d')
    expect(history.canRedo).toBe(false)
    expect(history.undo()).toBe('b')
  })

  it('keeps at most the configured number of steps', () => {
    const history = new UndoHistory<number>(3)
    history.reset(0)
    for (let i = 1; i <= 10; i += 1) history.record(i)
    expect(history.size).toBe(3)
    expect([history.undo(), history.undo(), history.undo(), history.undo()]).toEqual([9, 8, 7, undefined])
  })
})

describe('auto layout', () => {
  const at = (id: string, x = 0, y = 0, extra = {}) => ({ id, x, y, ...extra })

  it('lays a chain out left to right on one row, keeping the top-left corner', () => {
    const result = autoLayout(
      [at('c', 900, 300), at('a', 100, 100, { start: true }), at('b', 40, 500)],
      [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    )
    expect(result.a!.x).toBe(40)
    expect(result.b!.x).toBeGreaterThan(result.a!.x)
    expect(result.c!.x).toBeGreaterThan(result.b!.x)
    expect(new Set([result.a!.y, result.b!.y, result.c!.y]).size).toBe(1)
    expect(result.a!.y).toBe(100)
  })

  it('stacks branches in exit order in the same column without overlapping', () => {
    const result = autoLayout(
      [at('s', 0, 0, { start: true }), at('ok'), at('back'), at('no')],
      [
        { source: 's', target: 'no', order: 2 },
        { source: 's', target: 'ok', order: 0 },
        { source: 's', target: 'back', order: 1 },
      ],
    )
    expect(result.ok!.x).toBe(result.no!.x)
    expect(result.ok!.y).toBeLessThan(result.back!.y)
    expect(result.back!.y).toBeLessThan(result.no!.y)
    expect(result.back!.y - result.ok!.y).toBeGreaterThanOrEqual(80)
  })

  it('ignores connections that loop back', () => {
    const result = autoLayout(
      [at('s', 0, 0, { start: true }), at('review'), at('fix')],
      [
        { source: 's', target: 'review' },
        { source: 'review', target: 'fix' },
        { source: 'fix', target: 'review' },
      ],
    )
    expect(result.s!.x).toBeLessThan(result.review!.x)
    expect(result.review!.x).toBeLessThan(result.fix!.x)
  })

  it('places a step after the furthest step leading to it and snaps to the grid', () => {
    const result = autoLayout(
      [at('s', 3, 7, { start: true }), at('a'), at('b'), at('join')],
      [
        { source: 's', target: 'a' },
        { source: 'a', target: 'b' },
        { source: 'b', target: 'join' },
        { source: 's', target: 'join' },
      ],
    )
    expect(result.join!.x).toBeGreaterThan(result.b!.x)
    for (const point of Object.values(result)) {
      expect(Math.abs(point.x % 20)).toBe(0)
      expect(Math.abs(point.y % 20)).toBe(0)
    }
  })

  it('handles loose steps and empty flows', () => {
    expect(autoLayout([], [])).toEqual({})
    const result = autoLayout([at('a', 0, 0), at('b', 0, 0)], [])
    expect(result.a!.y).not.toBe(result.b!.y)
  })
})

describe('align and make room', () => {
  const boxes = [
    { id: 'a', x: 0, y: 0, width: 100, height: 50 },
    { id: 'b', x: 300, y: 40, width: 100, height: 50 },
    { id: 'c', x: 100, y: 200, width: 100, height: 50 },
  ]
  it('aligns edges and centres', () => {
    expect(alignBoxes(boxes, 'left').b).toEqual({ x: 0, y: 40 })
    expect(alignBoxes(boxes, 'top').c).toEqual({ x: 100, y: 0 })
    expect(alignBoxes(boxes, 'middle').a!.y).toBe(alignBoxes(boxes, 'middle').c!.y)
  })
  it('spreads steps evenly', () => {
    const result = alignBoxes(boxes, 'distribute-h')
    expect([result.a!.x, result.c!.x, result.b!.x]).toEqual([0, 150, 300])
  })
  it('moves only downstream steps right of the gap', () => {
    const nodes = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 360, y: 0 },
      { id: 'c', x: 720, y: 0 },
      { id: 'other', x: 360, y: 300 },
    ]
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'a' },
    ]
    const { at, moved } = makeRoom(nodes, edges, nodes[0]!, nodes[1]!)
    expect(at).toEqual({ x: 360, y: 0 })
    expect(moved).toEqual({ b: { x: 720, y: 0 }, c: { x: 1080, y: 0 } })
  })
  it('uses free room without moving anything', () => {
    const { at, moved } = makeRoom([], [], { id: 'a', x: 0, y: 0 }, { id: 'b', x: 1000, y: 100 })
    expect(at).toEqual({ x: 500, y: 50 })
    expect(moved).toEqual({})
  })
})

describe('shortcuts', () => {
  const key = (key: string, extra = {}) => ({ key, ...extra })
  it('maps editing keys with Ctrl or ⌘', () => {
    expect(shortcutFor(key('c', { ctrlKey: true, code: 'KeyC' }))).toEqual({ type: 'copy' })
    expect(shortcutFor(key('v', { metaKey: true, code: 'KeyV' }))).toEqual({ type: 'paste' })
    expect(shortcutFor(key('Z', { ctrlKey: true, shiftKey: true, code: 'KeyZ' }))).toEqual({ type: 'redo' })
    expect(shortcutFor(key('y', { ctrlKey: true }))).toEqual({ type: 'redo' })
    expect(shortcutFor(key('d', { ctrlKey: true }))).toEqual({ type: 'duplicate' })
    expect(shortcutFor(key('a', { ctrlKey: true }))).toEqual({ type: 'select-all' })
    expect(shortcutFor(key('k', { ctrlKey: true }))).toBeNull()
    expect(shortcutFor(key('c', { ctrlKey: true, altKey: true }))).toBeNull()
  })
  it('maps plain keys', () => {
    expect(shortcutFor(key('Delete'))).toEqual({ type: 'delete' })
    expect(shortcutFor(key('Escape'))).toEqual({ type: 'escape' })
    expect(shortcutFor(key('?', { shiftKey: true }))).toEqual({ type: 'help' })
    expect(shortcutFor(key('ArrowLeft'))).toEqual({ type: 'nudge', dx: -NUDGE, dy: 0 })
    expect(shortcutFor(key('ArrowDown', { shiftKey: true }))).toEqual({ type: 'nudge', dx: 0, dy: NUDGE * 10 })
    expect(shortcutFor(key('!', { shiftKey: true, code: 'Digit1' }))).toEqual({ type: 'fit' })
    expect(shortcutFor(key('L', { shiftKey: true, code: 'KeyL' }))).toEqual({ type: 'layout' })
    expect(shortcutFor(key('n', { code: 'KeyN' }))).toEqual({ type: 'add-step' })
    expect(shortcutFor(key('x'))).toBeNull()
  })
  it('recognises places where people type', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true)
    expect(isTypingTarget({ tagName: 'textarea' })).toBe(true)
    expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true)
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(isTypingTarget({ tagName: 'BUTTON', closest: () => null })).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
  it('lists shortcuts with the platform modifier', () => {
    const help = shortcutHelp(true)
    expect(help.flatMap((g) => g.items).some((item) => item.keys.includes('⌘'))).toBe(true)
    expect(shortcutHelp(false).flatMap((g) => g.items).some((item) => item.keys.includes('⌘'))).toBe(false)
  })
})
