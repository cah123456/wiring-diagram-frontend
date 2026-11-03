import type { DiagramNode } from '../types/diagram'
import { getSymbol } from '../data/symbols'
import { getNodeBounds } from './geometry'

export interface LabelLine {
  text: string
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
  size: number
  weight: number
  color: string
  mono?: boolean
}

export const getNodeLabelLines = (node: DiagramNode): LabelLine[] => {
  const def = getSymbol(node.type)
  if (!node.showLabel) return []

  if (node.type === 'text') {
    const content = node.props.text || node.label || ''
    if (!content) return []
    const requested = Number(node.props.fontSize)
    const size =
      Number.isFinite(requested) && requested > 0 ? Math.min(96, Math.max(6, requested)) : 16
    const lineHeight = size * 1.25
    const lines = content.split('\n').slice(0, 3)
    return lines.map((line, index) => ({
      text: line,
      x: node.x,
      y: node.y + (index - (lines.length - 1) / 2) * lineHeight + 1,
      anchor: 'middle' as const,
      size,
      weight: 500,
      color: '#25343b',
    }))
  }

  const bounds = getNodeBounds(node)
  const tag = node.label.trim()
  const name = node.name.trim()
  if (!tag && !name) return []

  const result: LabelLine[] = []
  const placement = def.labelPlacement
  if (placement === 'none') return []

  if (placement === 'top-left') {
    if (tag) {
      result.push({
        text: tag,
        x: bounds.minX + 2,
        y: bounds.minY - 24,
        anchor: 'start',
        size: 13,
        weight: 700,
        color: '#16262e',
        mono: true,
      })
    }
    if (name) {
      result.push({
        text: name,
        x: bounds.minX + 2,
        y: bounds.minY - 9,
        anchor: 'start',
        size: 12,
        weight: 500,
        color: '#54636a',
      })
    }
    return result
  }

  if (placement === 'bottom') {
    if (tag) {
      result.push({
        text: tag,
        x: node.x,
        y: bounds.maxY + 22,
        anchor: 'middle',
        size: 13,
        weight: 700,
        color: '#16262e',
        mono: true,
      })
    }
    if (name) {
      result.push({
        text: name,
        x: node.x,
        y: bounds.maxY + (tag ? 38 : 22),
        anchor: 'middle',
        size: 12,
        weight: 500,
        color: '#54636a',
      })
    }
    return result
  }

  if (placement === 'center') {
    if (tag) {
      result.push({
        text: tag,
        x: node.x,
        y: node.y - (name ? 7 : 0),
        anchor: 'middle',
        size: 13,
        weight: 700,
        color: '#16262e',
        mono: true,
      })
    }
    if (name) {
      result.push({
        text: name,
        x: node.x,
        y: node.y + 11,
        anchor: 'middle',
        size: 12,
        weight: 500,
        color: '#54636a',
      })
    }
    return result
  }

  const labelX = bounds.maxX + 11
  if (tag) {
    result.push({
      text: tag,
      x: labelX,
      y: node.y - (name ? 7 : 0),
      anchor: 'start',
      size: 13,
      weight: 700,
      color: '#16262e',
      mono: true,
    })
  }
  if (name) {
    result.push({
      text: name,
      x: labelX,
      y: node.y + 10,
      anchor: 'start',
      size: 12,
      weight: 500,
      color: '#54636a',
    })
  }
  return result
}
