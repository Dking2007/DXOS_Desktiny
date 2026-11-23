// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { describe, expect, it } from 'vitest'
import type { Department, User } from '@dx/web-shared/types.ts'
import {
  allowedParents,
  ancestorsOf,
  buildOrgTree,
  descendantsOf,
  flatten,
  highlightParts,
  needingAttention,
  orgStats,
  searchOrg,
  withAncestors,
} from './orgTree'
import { chartSvg, fitView, layoutChart, zoomAt, type LayoutInput } from './orgLayout'

const dep = (id: string, name: string, parent_id: string | null = null, manager_id: string | null = null): Department => ({
  id,
  name,
  code: id.toUpperCase(),
  parent_id,
  manager_id,
})
const person = (id: string, display_name: string, department_id: string | null, role = 'staff'): User => ({
  id,
  subject: id,
  display_name,
  department_id,
  role,
})

const departments = [
  dep('eng', 'Phòng Kỹ thuật', null, 'u-lead'),
  dep('adm', 'Phòng Hành chính'),
  dep('web', 'Tổ Web', 'eng', 'u-web'),
  dep('ops', 'Tổ Vận hành', 'eng'),
  dep('qa', 'Nhóm Kiểm thử', 'web'),
]
const users = [
  person('u-dir', 'Nguyễn Giám Đốc', null, 'director'),
  person('u-lead', 'Trần Trưởng Phòng', 'eng', 'manager'),
  person('u-web', 'Lê Đức Web', 'web'),
  person('u-qa', 'Phạm Thử', 'qa'),
  person('u-adm', 'Hoàng Văn Thư', 'adm'),
  person('u-free', 'Đỗ Chưa Xếp', null),
  person('u-gone', 'Vũ Lạc Phòng', 'deleted-department'),
]

describe('org tree', () => {
  const tree = buildOrgTree(departments, users)

  it('nests departments under their parent, sorted by name', () => {
    expect(tree.roots.map((node) => node.id)).toEqual(['adm', 'eng'])
    expect(tree.byId.get('eng')!.children.map((node) => node.id)).toEqual(['ops', 'web'])
    expect(tree.byId.get('qa')!.depth).toBe(3)
    expect(tree.maxDepth).toBe(3)
    expect(flatten(tree).map((node) => node.id)).toEqual(['adm', 'eng', 'ops', 'web', 'qa'])
  })

  it('counts direct and branch members and sub-departments', () => {
    const eng = tree.byId.get('eng')!
    expect(eng.members.map((user) => user.id)).toEqual(['u-lead'])
    expect(eng.totalMembers).toBe(3)
    expect(eng.descendantCount).toBe(3)
    expect(tree.byId.get('web')!.totalMembers).toBe(2)
  })

  it('puts the board with the organisation and keeps a bucket for people without a department', () => {
    expect(tree.board.map((user) => user.id)).toEqual(['u-dir'])
    expect(tree.unassigned.map((user) => user.id).sort()).toEqual(['u-free', 'u-gone'])
  })

  it('keeps a director who also sits in a department at the head of the organisation', () => {
    const seated = buildOrgTree(departments, [person('u-dir', 'Nguyễn Giám Đốc', 'adm', 'director')])
    expect(seated.board.map((user) => user.id)).toEqual(['u-dir'])
    expect(seated.byId.get('adm')!.members.map((user) => user.id)).toEqual(['u-dir'])
    expect(seated.unassigned).toEqual([])
  })

  it('warns about departments without a leader or people', () => {
    expect(tree.byId.get('adm')!.warnings).toEqual(['no_leader'])
    expect(tree.byId.get('ops')!.warnings).toEqual(['no_leader', 'no_members'])
    expect(tree.byId.get('eng')!.warnings).toEqual([])
    expect(tree.byId.get('eng')!.leader?.display_name).toBe('Trần Trưởng Phòng')
    expect([...needingAttention(tree)].sort()).toEqual(['adm', 'ops', 'qa'])
  })

  it('summarises the organisation', () => {
    expect(orgStats(tree)).toEqual({
      departments: 5,
      members: 7,
      unassigned: 2,
      withoutLeader: 3,
      empty: 1,
      broken: 0,
      maxDepth: 3,
    })
  })

  it('survives a loop between departments and a missing parent', () => {
    const broken = buildOrgTree(
      [dep('a', 'A', 'b'), dep('b', 'B', 'a'), dep('c', 'C', 'a'), dep('self', 'Tự trỏ', 'self'), dep('lost', 'Mồ côi', 'nowhere')],
      [person('x', 'X', 'c')],
    )
    expect(broken.roots.map((node) => node.id).sort()).toEqual(['a', 'b', 'lost', 'self'])
    expect(broken.byId.get('a')!.warnings).toContain('cycle')
    expect(broken.byId.get('self')!.warnings).toContain('cycle')
    expect(broken.byId.get('lost')!.warnings).toContain('missing_parent')
    expect(broken.byId.get('c')!.parentId).toBe('a')
    expect(broken.byId.get('a')!.totalMembers).toBe(1)
    expect(orgStats(broken).broken).toBe(4)
    expect(ancestorsOf(broken, 'c')).toEqual(['a'])
  })

  it('ignores a department listed twice', () => {
    const twice = buildOrgTree([dep('a', 'A'), dep('a', 'A again')], [])
    expect(twice.roots).toHaveLength(1)
    expect(twice.byId.get('a')!.department.name).toBe('A')
  })
})

describe('moving departments', () => {
  const tree = buildOrgTree(departments, users)

  it('lists ancestors and descendants', () => {
    expect(ancestorsOf(tree, 'qa')).toEqual(['web', 'eng'])
    expect([...descendantsOf(tree, 'eng')].sort()).toEqual(['ops', 'qa', 'web'])
  })

  it('never offers a department itself or one below it as its parent', () => {
    const allowed = allowedParents(tree, 'eng')
    expect([...allowed]).toEqual(['adm'])
    expect(allowedParents(tree, 'qa').has('web')).toBe(true)
    expect(allowedParents(tree, null).size).toBe(5)
  })
})

describe('org search', () => {
  const tree = buildOrgTree(departments, users)

  it('finds departments ignoring accents and opens their ancestors', () => {
    const result = searchOrg(tree, 'kiem thu')
    expect([...result.departments]).toEqual(['qa'])
    expect([...result.expand].sort()).toEqual(['eng', 'web'])
  })

  it('finds people and opens the department they are in', () => {
    const result = searchOrg(tree, 'duc web')
    expect([...result.members]).toEqual(['u-web'])
    expect([...result.expand].sort()).toEqual(['eng', 'web'])
  })

  it('matches a leader by name and returns nothing for an empty query', () => {
    expect(searchOrg(tree, 'trưởng').departments.has('eng')).toBe(true)
    expect(searchOrg(tree, '  ').departments.size).toBe(0)
  })

  it('keeps ancestors of filtered departments', () => {
    expect([...withAncestors(tree, ['qa', 'missing'])].sort()).toEqual(['eng', 'qa', 'web'])
  })

  it('highlights the matching part of the original text', () => {
    expect(highlightParts('Phòng Kỹ thuật', 'ky thu')).toEqual([
      { text: 'Phòng ', hit: false },
      { text: 'Kỹ thu', hit: true },
      { text: 'ật', hit: false },
    ])
    expect(highlightParts('Đỗ', 'do')).toEqual([{ text: 'Đỗ', hit: true }])
    expect(highlightParts('Tổ Web', 'xyz')).toEqual([{ text: 'Tổ Web', hit: false }])
  })
})

describe('org chart layout', () => {
  const size = { width: 100, height: 50, gapX: 10, gapY: 20 }
  const chart: LayoutInput = {
    id: 'root',
    children: [
      { id: 'a', children: [{ id: 'a1', children: [] }, { id: 'a2', children: [] }] },
      { id: 'b', children: [] },
    ],
  }

  it('centres a parent over its children', () => {
    const layout = layoutChart(chart, new Set(), size)
    const at = Object.fromEntries(layout.boxes.map((box) => [box.id, box]))
    expect(at.a1.x).toBe(0)
    expect(at.a2.x).toBe(110)
    expect(at.a.x).toBe(55)
    expect(at.b.x).toBe(220)
    expect(at.root.x).toBe((55 + 220) / 2)
    expect(at.a1.y).toBe(140)
    expect(layout.width).toBe(320)
    expect(layout.height).toBe(190)
    expect(layout.edges).toHaveLength(4)
    expect(layout.edges.find((edge) => edge.to === 'a1')!.path).toBe('M105 120V130H50V140')
  })

  it('hides a collapsed branch and remembers how many children it hides', () => {
    const layout = layoutChart(chart, new Set(['a']), size)
    expect(layout.boxes.map((box) => box.id)).toEqual(['root', 'a', 'b'])
    expect(layout.boxes.find((box) => box.id === 'a')!.hidden).toBe(2)
  })

  it('does not loop on a repeated id', () => {
    const looped: LayoutInput = { id: 'x', children: [] }
    looped.children.push(looped)
    expect(layoutChart(looped, new Set(), size).boxes).toHaveLength(1)
  })

  it('fits and zooms around a point', () => {
    expect(fitView({ width: 1000, height: 200 }, { width: 548, height: 400 })).toEqual({ scale: 0.5, x: 24, y: 150 })
    expect(fitView({ width: 100, height: 100 }, { width: 400, height: 400 }).scale).toBe(1)
    const zoomed = zoomAt({ scale: 1, x: 0, y: 0 }, 2, 100, 100)
    expect(zoomed).toEqual({ scale: 2, x: -100, y: -100 })
    expect(zoomAt({ scale: 2, x: 0, y: 0 }, 4, 0, 0).scale).toBe(2)
  })

  it('writes an escaped standalone SVG', () => {
    const layout = layoutChart({ id: 'r', children: [] }, new Set(), size)
    const palette = { background: '#fff', surface: '#fff', border: '#ccc', text: '#000', muted: '#555', accent: '#123', warning: '#a60', line: '#999', font: 'sans-serif' }
    const svg = chartSvg(layout, { r: { title: 'R&D <Lab>', subtitle: 'RD', meta: '2 người', warning: 'Chưa có lãnh đạo' } }, palette, size)
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('R&#38;D &#60;Lab&#62;')
    expect(svg).toContain('Chưa có lãnh đạo')
  })
})
