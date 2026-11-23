// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
// The organisation as a tree built from each department's parent, with what needs attention.
// Pure functions: bad data (a loop between departments, a parent that no longer exists, a
// leader who left) is shown as a warning on the department, never thrown.
import { fold } from '@dx/web-shared/text.ts'
import type { Department, User } from '@dx/web-shared/types.ts'

/** Id of the organisation itself, the node above every top-level department. */
export const ROOT_ID = '__org__'
/** Id of the bucket holding people who belong to no department. */
export const UNASSIGNED_ID = '__unassigned__'

export type OrgWarning = 'no_leader' | 'no_members' | 'cycle' | 'missing_parent'

export const WARNING_LABELS: Record<OrgWarning, string> = {
  no_leader: 'Chưa có lãnh đạo',
  no_members: 'Không có thành viên',
  cycle: 'Phòng cha tạo vòng lặp',
  missing_parent: 'Phòng cha không còn tồn tại',
}

export interface OrgNode {
  id: string
  department: Department
  /** The parent this node is drawn under; null for a top-level department. */
  parentId: string | null
  children: OrgNode[]
  /** People whose department is this one (not its sub-departments). */
  members: User[]
  leader: User | null
  /** 1 for a top-level department. */
  depth: number
  /** People in this department and every department below it. */
  totalMembers: number
  /** Number of departments below this one, at any depth. */
  descendantCount: number
  warnings: OrgWarning[]
}

export interface OrgTree {
  roots: OrgNode[]
  byId: Map<string, OrgNode>
  /** Every director leads the organisation itself, even one who also sits in a department. */
  board: User[]
  /** Everyone else without a department, or whose department no longer exists. */
  unassigned: User[]
  maxDepth: number
  users: User[]
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'vi')
const byDisplayName = (a: User, b: User) => a.display_name.localeCompare(b.display_name, 'vi')

/** Departments whose chain of parents comes back to themselves. */
function cycleMembers(departments: Map<string, Department>): Set<string> {
  const result = new Set<string>()
  for (const id of departments.keys()) {
    const seen = new Set<string>()
    let current = departments.get(id)?.parent_id ?? null
    while (current && departments.has(current) && !seen.has(current)) {
      if (current === id) {
        result.add(id)
        break
      }
      seen.add(current)
      current = departments.get(current)?.parent_id ?? null
    }
  }
  return result
}

export function buildOrgTree(departments: Department[], users: User[]): OrgTree {
  const source = new Map<string, Department>()
  for (const item of departments) if (!source.has(item.id)) source.set(item.id, item)
  const cycles = cycleMembers(source)
  const people = new Map(users.map((user) => [user.id, user]))
  const byId = new Map<string, OrgNode>()
  for (const department of source.values()) {
    const warnings: OrgWarning[] = []
    let parentId = department.parent_id || null
    if (cycles.has(department.id)) {
      warnings.push('cycle')
      parentId = null
    } else if (parentId && !source.has(parentId)) {
      warnings.push('missing_parent')
      parentId = null
    }
    const leader = department.manager_id ? (people.get(department.manager_id) ?? null) : null
    byId.set(department.id, {
      id: department.id,
      department,
      parentId,
      children: [],
      members: [],
      leader,
      depth: 1,
      totalMembers: 0,
      descendantCount: 0,
      warnings,
    })
  }
  const board: User[] = []
  const unassigned: User[] = []
  for (const user of users) {
    const home = user.department_id ? byId.get(user.department_id) : undefined
    // A director heads the whole organisation; one who also has a department still counts there.
    if (user.role === 'director') board.push(user)
    if (home) home.members.push(user)
    else if (!user.department_id && user.role === 'director') continue
    else unassigned.push(user)
  }
  const roots: OrgNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  let maxDepth = 0
  // Children are attached only along parents outside any loop, so this walk always ends.
  function walk(node: OrgNode, depth: number) {
    node.depth = depth
    maxDepth = Math.max(maxDepth, depth)
    node.children.sort((a, b) => byName(a.department, b.department))
    node.members.sort(byDisplayName)
    let total = node.members.length
    let below = 0
    for (const child of node.children) {
      walk(child, depth + 1)
      total += child.totalMembers
      below += 1 + child.descendantCount
    }
    node.totalMembers = total
    node.descendantCount = below
    if (!node.leader) node.warnings.push('no_leader')
    if (total === 0) node.warnings.push('no_members')
  }
  roots.sort((a, b) => byName(a.department, b.department))
  for (const root of roots) walk(root, 1)
  board.sort(byDisplayName)
  unassigned.sort(byDisplayName)
  return { roots, byId, board, unassigned, maxDepth, users }
}

export interface OrgStats {
  departments: number
  members: number
  unassigned: number
  withoutLeader: number
  empty: number
  /** Loops and missing parents: data that should be fixed. */
  broken: number
  maxDepth: number
}

export function orgStats(tree: OrgTree): OrgStats {
  let withoutLeader = 0
  let empty = 0
  let broken = 0
  for (const node of tree.byId.values()) {
    if (node.warnings.includes('no_leader')) withoutLeader++
    if (node.warnings.includes('no_members')) empty++
    if (node.warnings.includes('cycle') || node.warnings.includes('missing_parent')) broken++
  }
  return {
    departments: tree.byId.size,
    members: tree.users.length,
    unassigned: tree.unassigned.length,
    withoutLeader,
    empty,
    broken,
    maxDepth: tree.maxDepth,
  }
}

/** The departments above `id`, nearest first. */
export function ancestorsOf(tree: OrgTree, id: string): string[] {
  const result: string[] = []
  let current = tree.byId.get(id)?.parentId ?? null
  while (current && !result.includes(current)) {
    result.push(current)
    current = tree.byId.get(current)?.parentId ?? null
  }
  return result
}

/** Every department below `id`, at any depth. */
export function descendantsOf(tree: OrgTree, id: string): Set<string> {
  const result = new Set<string>()
  const stack = [...(tree.byId.get(id)?.children ?? [])]
  while (stack.length) {
    const node = stack.pop()!
    if (result.has(node.id)) continue
    result.add(node.id)
    stack.push(...node.children)
  }
  return result
}

/**
 * Departments that may become the parent of `id`: not itself and not one of its own
 * sub-departments, which would make a loop. Every department may parent a new one (id null).
 */
export function allowedParents(tree: OrgTree, id: string | null): Set<string> {
  const blocked = id ? descendantsOf(tree, id) : new Set<string>()
  if (id) blocked.add(id)
  return new Set([...tree.byId.keys()].filter((key) => !blocked.has(key)))
}

/** Departments in tree order with their depth, for indented pickers. */
export function flatten(tree: OrgTree): OrgNode[] {
  const result: OrgNode[] = []
  const visit = (node: OrgNode) => {
    result.push(node)
    node.children.forEach(visit)
  }
  tree.roots.forEach(visit)
  return result
}

export interface OrgSearch {
  /** Departments whose name, code or leader matches. */
  departments: Set<string>
  /** People whose name, title or e-mail matches. */
  members: Set<string>
  /** Departments to open so every match can be seen. */
  expand: Set<string>
}

function personText(user: User) {
  return [user.display_name, user.job_title, user.contact_email].filter(Boolean).join(' ')
}

/** Finds departments and people, ignoring case and Vietnamese accents. */
export function searchOrg(tree: OrgTree, query: string): OrgSearch {
  const needle = fold(query.trim())
  const result: OrgSearch = { departments: new Set(), members: new Set(), expand: new Set() }
  if (!needle) return result
  const open = (id: string) => {
    for (const ancestor of ancestorsOf(tree, id)) result.expand.add(ancestor)
  }
  for (const node of tree.byId.values()) {
    const text = [node.department.name, node.department.code, node.leader?.display_name].filter(Boolean).join(' ')
    if (fold(text).includes(needle)) {
      result.departments.add(node.id)
      open(node.id)
    }
  }
  for (const user of tree.users) {
    if (!fold(personText(user)).includes(needle)) continue
    result.members.add(user.id)
    const home = user.department_id ? tree.byId.get(user.department_id) : undefined
    if (home) {
      result.expand.add(home.id)
      open(home.id)
    }
  }
  return result
}

/** The given departments plus everything above them: what a filtered tree must still show. */
export function withAncestors(tree: OrgTree, ids: Iterable<string>): Set<string> {
  const result = new Set<string>()
  for (const id of ids) {
    if (!tree.byId.has(id)) continue
    result.add(id)
    for (const ancestor of ancestorsOf(tree, id)) result.add(ancestor)
  }
  return result
}

/** Departments with at least one warning. */
export function needingAttention(tree: OrgTree): Set<string> {
  return new Set([...tree.byId.values()].filter((node) => node.warnings.length).map((node) => node.id))
}

export interface TextPart {
  text: string
  hit: boolean
}

/** Splits `text` around the first accent-insensitive match of `query`, for highlighting. */
export function highlightParts(text: string, query: string): TextPart[] {
  const needle = fold(query.trim())
  if (!needle || !text) return [{ text, hit: false }]
  // Fold character by character so positions in the folded text map back to the original.
  const chars = Array.from(text)
  let folded = ''
  const origin: number[] = []
  chars.forEach((char, index) => {
    for (const piece of fold(char)) {
      folded += piece
      origin.push(index)
    }
  })
  const at = folded.indexOf(needle)
  if (at < 0) return [{ text, hit: false }]
  const start = origin[at]
  const end = origin[at + needle.length - 1] + 1
  return [
    { text: chars.slice(0, start).join(''), hit: false },
    { text: chars.slice(start, end).join(''), hit: true },
    { text: chars.slice(end).join(''), hit: false },
  ].filter((part) => part.text)
}
