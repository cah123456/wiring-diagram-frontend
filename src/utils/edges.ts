import type { DiagramEdge, DiagramNode, Point } from '../types/diagram'
import { getNodePort, orthogonalRoute, pointAlongPolyline, roundedPath } from './geometry'

export interface RoutedEdge {
  points: Point[]
  path: string
  labelPosition: Point
  startDirection: string
  endDirection: string
}

export const getEdgeRoute = (
  edge: DiagramEdge,
  nodeLookup: Map<string, DiagramNode>,
): RoutedEdge | null => {
  const fromNode = nodeLookup.get(edge.from.nodeId)
  const toNode = nodeLookup.get(edge.to.nodeId)
  if (!fromNode || !toNode) return null
  const fromPort = getNodePort(fromNode, edge.from.portId)
  const toPort = getNodePort(toNode, edge.to.portId)
  if (!fromPort || !toPort) return null

  const points = orthogonalRoute(
    { x: fromPort.x, y: fromPort.y },
    fromPort.dir,
    { x: toPort.x, y: toPort.y },
    toPort.dir,
  )

  return {
    points,
    path: roundedPath(points),
    labelPosition: pointAlongPolyline(points, 0.5),
    startDirection: fromPort.dir,
    endDirection: toPort.dir,
  }
}

export const buildNodeLookup = (nodes: DiagramNode[]): Map<string, DiagramNode> =>
  new Map(nodes.map((node) => [node.id, node]))
