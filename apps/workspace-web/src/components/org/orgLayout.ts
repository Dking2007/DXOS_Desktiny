// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
// Top-down placement of the org chart: each parent centred over its children, with elbow
// connectors. Also writes the chart as a standalone SVG for download.

export interface LayoutInput {
  id: string
  children: LayoutInput[]
}

export interface ChartBox {
  id: string
  x: number
  y: number
  depth: number
  /** Children hidden because the branch is collapsed. */
  hidden: number
}

export interface ChartEdge {
  from: string
  to: string
  path: string
}

export interface ChartLayout {
  boxes: ChartBox[]
  edges: ChartEdge[]
  width: number
  height: number
}

export interface ChartSize {
  width: number
  height: number
  gapX: number
  gapY: number
}

export const CHART_SIZE: ChartSize = { width: 248, height: 148, gapX: 24, gapY: 64 }

export function layoutChart(root: LayoutInput, collapsed: Set<string>, size: ChartSize = CHART_SIZE): ChartLayout {
  const spans = new Map<string, number>()
  const visible = (node: LayoutInput) => (collapsed.has(node.id) ? [] : node.children)
  function measure(node: LayoutInput, trail: Set<string>): number {
    // A repeated id would loop forever; the tree builder prevents it, this keeps the layout safe.
    if (trail.has(node.id)) return 0
    const next = new Set(trail).add(node.id)
    const kids = visible(node)
    const sum = kids.reduce((total, child) => total + measure(child, next), 0) + size.gapX * Math.max(0, kids.length - 1)
    const span = Math.max(size.width, sum)
    spans.set(node.id, span)
    return span
  }
  measure(root, new Set())
  const boxes: ChartBox[] = []
  const edges: ChartEdge[] = []
  const placed = new Map<string, ChartBox>()
  function place(node: LayoutInput, left: number, depth: number): ChartBox | null {
    if (placed.has(node.id)) return null
    const span = spans.get(node.id) ?? size.width
    const kids = visible(node)
    const y = depth * (size.height + size.gapY)
    const box: ChartBox = { id: node.id, x: 0, y, depth, hidden: collapsed.has(node.id) ? node.children.length : 0 }
    placed.set(node.id, box)
    boxes.push(box)
    const childBoxes: ChartBox[] = []
    if (kids.length) {
      const used = kids.reduce((total, child) => total + (spans.get(child.id) ?? size.width), 0) + size.gapX * (kids.length - 1)
      let cursor = left + (span - used) / 2
      for (const child of kids) {
        const childBox = place(child, cursor, depth + 1)
        if (childBox) childBoxes.push(childBox)
        cursor += (spans.get(child.id) ?? size.width) + size.gapX
      }
    }
    box.x = childBoxes.length
      ? (childBoxes[0].x + childBoxes[childBoxes.length - 1].x) / 2
      : left + (span - size.width) / 2
    for (const child of childBoxes) edges.push({ from: box.id, to: child.id, path: '' })
    return box
  }
  place(root, 0, 0)
  for (const edge of edges) {
    const from = placed.get(edge.from)!
    const to = placed.get(edge.to)!
    const startX = from.x + size.width / 2
    const startY = from.y + size.height
    const endX = to.x + size.width / 2
    const middle = startY + size.gapY / 2
    edge.path = `M${startX} ${startY}V${middle}H${endX}V${to.y}`
  }
  const width = boxes.reduce((most, box) => Math.max(most, box.x + size.width), 0)
  const height = boxes.reduce((most, box) => Math.max(most, box.y + size.height), 0)
  return { boxes, edges, width, height }
}

/** Scale and offset that show the whole chart inside a viewport, never enlarging past 100%. */
export function fitView(
  layout: { width: number; height: number },
  viewport: { width: number; height: number },
  padding = 24,
  limits = { min: 0.25, max: 1 },
) {
  const scale = Math.min(
    limits.max,
    Math.max(
      limits.min,
      Math.min((viewport.width - padding * 2) / Math.max(1, layout.width), (viewport.height - padding * 2) / Math.max(1, layout.height)),
    ),
  )
  return {
    scale,
    x: (viewport.width - layout.width * scale) / 2,
    y: Math.max(padding, (viewport.height - layout.height * scale) / 2),
  }
}

/** Zooms by `factor` keeping the point (px, py) of the viewport still. */
export function zoomAt(view: { scale: number; x: number; y: number }, factor: number, px: number, py: number, limits = { min: 0.25, max: 2 }) {
  const scale = Math.min(limits.max, Math.max(limits.min, view.scale * factor))
  const ratio = scale / view.scale
  return { scale, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }
}

export interface SvgCard {
  title: string
  subtitle: string
  meta: string
  warning?: string
}

export interface SvgPalette {
  background: string
  surface: string
  border: string
  text: string
  muted: string
  accent: string
  warning: string
  line: string
  font: string
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

function clip(value: string, length: number) {
  const chars = Array.from(value)
  return chars.length > length ? `${chars.slice(0, length - 1).join('')}…` : value
}

/** The chart as a standalone SVG document, for download or printing. */
export function chartSvg(layout: ChartLayout, cards: Record<string, SvgCard>, palette: SvgPalette, size: ChartSize = CHART_SIZE) {
  const pad = 24
  const width = layout.width + pad * 2
  const height = layout.height + pad * 2
  const lines = layout.edges
    .map((edge) => `<path d="${edge.path}" fill="none" stroke="${palette.line}" stroke-width="1.5"/>`)
    .join('')
  const boxes = layout.boxes
    .map((box) => {
      const card = cards[box.id]
      if (!card) return ''
      const warning = card.warning
        ? `<text x="16" y="${size.height - 16}" font-size="12" fill="${palette.warning}">${escapeXml(clip(card.warning, 34))}</text>`
        : ''
      return (
        `<g transform="translate(${box.x} ${box.y})">` +
        `<rect width="${size.width}" height="${size.height}" rx="10" fill="${palette.surface}" stroke="${palette.border}"/>` +
        `<rect width="4" height="${size.height - 20}" y="10" rx="2" fill="${palette.accent}"/>` +
        `<text x="16" y="28" font-size="15" font-weight="600" fill="${palette.text}">${escapeXml(clip(card.title, 26))}</text>` +
        `<text x="16" y="50" font-size="12" fill="${palette.muted}">${escapeXml(clip(card.subtitle, 34))}</text>` +
        `<text x="16" y="78" font-size="13" fill="${palette.text}">${escapeXml(clip(card.meta, 32))}</text>` +
        warning +
        `</g>`
      )
    })
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${escapeXml(palette.font)}">` +
    `<rect width="100%" height="100%" fill="${palette.background}"/>` +
    `<g transform="translate(${pad} ${pad})">${lines}${boxes}</g></svg>`
  )
}
