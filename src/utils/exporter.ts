import { getSymbol } from '../data/symbols'
import { getEdgeStyle } from '../data/wireStyles'
import type { DiagramDocument, DiagramNode } from '../types/diagram'
import { buildNodeLookup, getEdgeRoute } from './edges'
import { getNodeLabelLines } from './labels'
import {
  getPageFrameLines,
  getTitleBlockLayout,
  PAGE_INNER_MARGIN,
  type TitleBlockLine,
  type TitleBlockText,
} from './titleBlock'

export interface ExportOptions {
  includeGrid?: boolean
  includeTitleBlock?: boolean
}

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const frameLineSvg = (line: TitleBlockLine): string =>
  `<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" stroke="#53636a" stroke-width="${line.weight}"/>`

const titleTextSvg = (text: TitleBlockText): string =>
  `<text x="${text.x}" y="${text.y}" font-family="${text.mono ? "'Cascadia Mono', Consolas, monospace" : "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif"}" font-size="${text.size}" font-weight="${text.weight}" fill="${text.color}" text-anchor="${text.anchor}">${escapeXml(text.text)}</text>`

const safeColor = (value?: string): string =>
  value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : ''

const nodeGlyphSvg = (node: DiagramNode): string => {
  const def = getSymbol(node.type)
  const sx = node.width / def.width
  const sy = node.height / def.height
  const transform = `translate(${node.x} ${node.y}) rotate(${node.rotation}) translate(${-node.width / 2} ${-node.height / 2}) scale(${sx} ${sy})`
  const color = safeColor(node.color) || safeColor(def.defaultColor)
  const accent = safeColor(node.props.accentColor)
  const vars = [
    color ? `--sym-ink:${color}` : '',
    accent ? `--sym-accent:${accent}` : '',
  ].filter(Boolean)
  const style = vars.length > 0 ? ` style="${vars.join(';')}"` : ''
  const glyph =
    node.props.includeBreaker === 'false' && def.glyphNoBreaker ? def.glyphNoBreaker : def.glyph
  return `<g transform="${transform}"${style}>${glyph}</g>`
}

const nodeLabelSvg = (node: DiagramNode, showDeviceLabels: boolean): string => {
  if (node.type !== 'text' && !showDeviceLabels) return ''
  return getNodeLabelLines(node)
    .map(
      (line) =>
        `<text x="${line.x}" y="${line.y}" font-family="${
          line.mono
            ? "'Cascadia Mono', Consolas, monospace"
            : "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif"
        }" font-size="${line.size}" font-weight="${line.weight}" fill="${safeColor(node.color) || line.color}" text-anchor="${line.anchor}" dominant-baseline="central">${escapeXml(line.text)}</text>`,
    )
    .join('')
}

const edgeSvg = (
  doc: DiagramDocument,
  index: number,
): { body: string; marker: string } => {
  const edge = doc.edges[index]
  const lookup = buildNodeLookup(doc.nodes)
  const route = getEdgeRoute(edge, lookup)
  if (!route) return { body: '', marker: '' }
  const style = getEdgeStyle(edge)
  const markerId = `arrow-${index}`
  const marker = edge.arrow
    ? `<marker id="${markerId}" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse"><path d="M0 0 L9 4.5 L0 9 Z" fill="${style.color}"/></marker>`
    : ''
  const markerEnd = edge.arrow ? ` marker-end="url(#${markerId})"` : ''
  const label = edge.label
    ? (() => {
        const width = Math.max(28, edge.label.length * 8 + 12)
        return `<g><rect x="${route.labelPosition.x - width / 2}" y="${route.labelPosition.y - 22}" width="${width}" height="17" rx="2" fill="#ffffff" fill-opacity="0.92"/><text x="${route.labelPosition.x}" y="${route.labelPosition.y - 13}" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="11" fill="#526068" text-anchor="middle">${escapeXml(edge.label)}</text></g>`
      })()
    : ''
  const body = `<path d="${route.path}" fill="none" stroke="${style.color}" stroke-width="${style.width}" ${style.dash ? `stroke-dasharray="${style.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"${markerEnd}/>${label}`
  return { body, marker }
}

export const buildDiagramSvg = (
  doc: DiagramDocument,
  options: ExportOptions = {},
): string => {
  const { includeGrid = false, includeTitleBlock = doc.settings.showTitleBlock } = options
  const { width, height } = doc.paper
  const markers: string[] = []
  const edges = doc.edges.map((_, index) => {
    const result = edgeSvg(doc, index)
    if (result.marker) markers.push(result.marker)
    return result.body
  })

  const titleBlock = includeTitleBlock ? getTitleBlockLayout(doc.paper, doc.meta) : null
  const frames = getPageFrameLines(doc.paper)
  const gridPattern = includeGrid
    ? `<defs><pattern id="smallGrid" width="${doc.settings.gridSize}" height="${doc.settings.gridSize}" patternUnits="userSpaceOnUse"><path d="M ${doc.settings.gridSize} 0 L 0 0 0 ${doc.settings.gridSize}" fill="none" stroke="#dbe4e4" stroke-width="0.6"/></pattern></defs><rect x="${PAGE_INNER_MARGIN}" y="${PAGE_INNER_MARGIN}" width="${width - PAGE_INNER_MARGIN * 2}" height="${height - PAGE_INNER_MARGIN * 2}" fill="url(#smallGrid)"/>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .sym-conductor { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
      .sym-inner { stroke-width: 2.2; }
      .sym-thin { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
      .sym-box { fill: #ffffff; stroke: var(--sym-ink, #26363e); stroke-width: 2.2; stroke-linejoin: round; }
      .sym-ring { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 2.4; }
      .sym-dashed { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 1.5; stroke-dasharray: 5 4; }
      .sym-terminal { fill: var(--sym-ink, #26363e); stroke: none; }
      .sym-protection { stroke: var(--sym-accent, #c53b32); }
      .sym-protection-fill { fill: var(--sym-accent, #c53b32); }
      .sym-arc { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 1.5; }
      .sym-arrow-head { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .sym-earth { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 2.2; stroke-linecap: round; }
      .sym-earth.sym-small { stroke-width: 1.4; }
      .sym-coil { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 1.7; }
      .sym-plate { stroke-width: 3.2; }
      .sym-wave { fill: none; stroke: var(--sym-ink, #26363e); stroke-width: 1.8; }
      .sym-glyph-text { fill: var(--sym-ink, #26363e); font-family: 'Cascadia Mono', Consolas, monospace; font-size: 22px; font-weight: 600; text-anchor: middle; dominant-baseline: central; }
      .sym-glyph-text-small { font-size: 18px; }
      .sym-busbar { fill: none; stroke: var(--sym-ink, #1b2a31); stroke-width: 18; stroke-linecap: butt; }
      .sym-busbar-core { fill: none; stroke: #f3f6f7; stroke-width: 1.2; opacity: 0.3; }
      .sym-junction-dot { fill: var(--sym-ink, #1b2a31); }
    </style>
    ${markers.join('')}
  </defs>
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  ${gridPattern}
  ${frames.map(frameLineSvg).join('')}
  ${titleBlock ? `<g>${titleBlock.lines.map(frameLineSvg).join('')}${titleBlock.texts.map(titleTextSvg).join('')}</g>` : ''}
  <g class="wires">${edges.join('')}</g>
  <g class="symbols">${doc.nodes.map((node) => `<g>${nodeGlyphSvg(node)}${nodeLabelSvg(node, doc.settings.showLabels !== false)}</g>`).join('')}</g>
</svg>`
}

const svgToImage = (svg: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('SVG 渲染失败'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })

export const svgToPngDataUrl = async (
  svg: string,
  width: number,
  height: number,
  targetWidth: number,
): Promise<string> => {
  const image = await svgToImage(svg)
  const scale = Math.min(targetWidth / width, 4)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器不支持 Canvas')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export const renderThumbnail = async (doc: DiagramDocument): Promise<string> => {
  const svg = buildDiagramSvg(doc, { includeGrid: false })
  return svgToPngDataUrl(svg, doc.paper.width, doc.paper.height, 640)
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const safeFilename = (name: string): string =>
  (name || 'wiring-diagram')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

export const exportSvg = (doc: DiagramDocument, name: string) => {
  const svg = buildDiagramSvg(doc)
  downloadBlob(
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    `${safeFilename(name)}.svg`,
  )
}

export const exportPng = async (doc: DiagramDocument, name: string) => {
  const svg = buildDiagramSvg(doc)
  const dataUrl = await svgToPngDataUrl(svg, doc.paper.width, doc.paper.height, 3200)
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = `${safeFilename(name)}.png`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
