import { getSymbol } from '../data/symbols'
import type { DiagramNode, Point, PortDirection, Rotation } from '../types/diagram'

export const BUSBAR_PORTS_PER_SIDE = 16
/** 母线导体描边宽度 18（见 .sym-busbar），端口落在导体表面而不是节点外框边缘。 */
const BUSBAR_SURFACE_OFFSET = 9

export interface NodePortLayout {
  id: string
  x: number
  y: number
  dir: PortDirection
  label?: string
}

const directionVector = (dir: PortDirection): Point => {
  switch (dir) {
    case 'up':
      return { x: 0, y: -1 }
    case 'down':
      return { x: 0, y: 1 }
    case 'left':
      return { x: -1, y: 0 }
    case 'right':
      return { x: 1, y: 0 }
  }
}

export const rotateVector = (vector: Point, rotation: Rotation): Point => {
  const radians = (rotation * Math.PI) / 180
  const cos = Math.round(Math.cos(radians))
  const sin = Math.round(Math.sin(radians))
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  }
}

const rotateDirection = (dir: PortDirection, rotation: Rotation): PortDirection => {
  const vector = rotateVector(directionVector(dir), rotation)
  if (vector.x === 1) return 'right'
  if (vector.x === -1) return 'left'
  if (vector.y === 1) return 'down'
  return 'up'
}

export const getNodePorts = (node: DiagramNode): NodePortLayout[] => {
  const def = getSymbol(node.type)
  if (def.portMode === 'none') return []

  let basePorts = def.ports
  if (def.portMode === 'busbar') {
    basePorts = []
    const centerY = def.height / 2
    for (let i = 0; i < BUSBAR_PORTS_PER_SIDE; i += 1) {
      const x = ((i + 0.5) / BUSBAR_PORTS_PER_SIDE) * def.width
      basePorts.push({
        id: `top-${i}`,
        x,
        y: centerY - BUSBAR_SURFACE_OFFSET,
        dir: 'up',
      })
      basePorts.push({
        id: `bottom-${i}`,
        x,
        y: centerY + BUSBAR_SURFACE_OFFSET,
        dir: 'down',
      })
    }
  }

  const scaleX = node.width / def.width
  const scaleY = node.height / def.height

  return basePorts.map((port) => {
    const local = {
      x: port.x * scaleX - node.width / 2,
      y: port.y * scaleY - node.height / 2,
    }
    const rotated = rotateVector(local, node.rotation)
    return {
      id: port.id,
      x: node.x + rotated.x,
      y: node.y + rotated.y,
      dir: rotateDirection(port.dir, node.rotation),
      label: port.label,
    }
  })
}

export const getNodePort = (node: DiagramNode, portId: string): NodePortLayout | undefined =>
  getNodePorts(node).find((port) => port.id === portId)

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const getNodeBounds = (node: DiagramNode): Bounds => {
  const halfW = node.width / 2
  const halfH = node.height / 2
  const corners: Point[] = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ].map((point) => {
    const rotated = rotateVector(point, node.rotation)
    return { x: node.x + rotated.x, y: node.y + rotated.y }
  })

  return {
    minX: Math.min(...corners.map((p) => p.x)),
    minY: Math.min(...corners.map((p) => p.y)),
    maxX: Math.max(...corners.map((p) => p.x)),
    maxY: Math.max(...corners.map((p) => p.y)),
  }
}

export const snapValue = (value: number, grid: number): number =>
  Math.round(value / grid) * grid

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
const scale = (vector: Point, amount: number): Point => ({
  x: vector.x * amount,
  y: vector.y * amount,
})

const dedupePoints = (points: Point[]): Point[] => {
  const result: Point[] = []
  for (const point of points) {
    const previous = result[result.length - 1]
    if (!previous || Math.abs(previous.x - point.x) > 0.01 || Math.abs(previous.y - point.y) > 0.01) {
      result.push(point)
    }
  }
  return result
}

export const orthogonalRoute = (
  start: Point,
  startDir: PortDirection,
  end: Point,
  endDir: PortDirection,
  stub = 26,
): Point[] => {
  const startVector = directionVector(startDir)
  const endVector = directionVector(endDir)
  const startStub = add(start, scale(startVector, stub))
  const endStub = add(end, scale(endVector, stub))

  const startVertical = startVector.y !== 0
  const endVertical = endVector.y !== 0
  let middle: Point[] = []

  if (startVertical && endVertical) {
    if (Math.abs(startStub.x - endStub.x) < 0.01) {
      middle = []
    } else {
      const midY = (startStub.y + endStub.y) / 2
      middle = [
        { x: startStub.x, y: midY },
        { x: endStub.x, y: midY },
      ]
    }
  } else if (!startVertical && !endVertical) {
    if (Math.abs(startStub.y - endStub.y) < 0.01) {
      middle = []
    } else {
      const midX = (startStub.x + endStub.x) / 2
      middle = [
        { x: midX, y: startStub.y },
        { x: midX, y: endStub.y },
      ]
    }
  } else if (startVertical) {
    middle = [{ x: startStub.x, y: endStub.y }]
  } else {
    middle = [{ x: endStub.x, y: startStub.y }]
  }

  return dedupePoints([start, startStub, ...middle, endStub, end])
}

export const roundedPath = (points: Point[], radius = 7): string => {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1]
    const current = points[i]
    const next = points[i + 1]
    const prevDistance = Math.hypot(current.x - previous.x, current.y - previous.y)
    const nextDistance = Math.hypot(next.x - current.x, next.y - current.y)
    const actualRadius = Math.min(radius, prevDistance / 2, nextDistance / 2)
    const before = {
      x: current.x - ((current.x - previous.x) / prevDistance) * actualRadius,
      y: current.y - ((current.y - previous.y) / prevDistance) * actualRadius,
    }
    const after = {
      x: current.x + ((next.x - current.x) / nextDistance) * actualRadius,
      y: current.y + ((next.y - current.y) / nextDistance) * actualRadius,
    }
    path += ` L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`
  }
  const last = points[points.length - 1]
  path += ` L ${last.x} ${last.y}`
  return path
}

export const polylineLength = (points: Point[]): number => {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return total
}

export const pointAlongPolyline = (points: Point[], ratio = 0.5): Point => {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]
  const target = polylineLength(points) * ratio
  let walked = 0
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1]
    const current = points[i]
    const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y)
    if (walked + segmentLength >= target) {
      const localRatio = segmentLength === 0 ? 0 : (target - walked) / segmentLength
      return {
        x: previous.x + (current.x - previous.x) * localRatio,
        y: previous.y + (current.y - previous.y) * localRatio,
      }
    }
    walked += segmentLength
  }
  return points[points.length - 1]
}

export const boundsIntersect = (a: Bounds, b: Bounds): boolean =>
  a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY

export const boundsFromPoints = (a: Point, b: Point): Bounds => ({
  minX: Math.min(a.x, b.x),
  minY: Math.min(a.y, b.y),
  maxX: Math.max(a.x, b.x),
  maxY: Math.max(a.y, b.y),
})

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export const getBusbarPortId = (
  node: DiagramNode,
  side: 'top' | 'bottom',
  targetX: number,
): string => {
  const localX = targetX - node.x + node.width / 2
  const index = Math.round(
    clamp(localX / node.width, 0, 0.999) * BUSBAR_PORTS_PER_SIDE - 0.5,
  )
  return `${side}-${clamp(index, 0, BUSBAR_PORTS_PER_SIDE - 1)}`
}
