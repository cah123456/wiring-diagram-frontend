import type { DrawingMeta, PaperSettings } from '../types/diagram'

export const PAGE_OUTER_MARGIN = 24
export const PAGE_INNER_MARGIN = 34
export const TITLE_BLOCK_WIDTH = 680
export const TITLE_BLOCK_HEIGHT = 154

export interface TitleBlockLine {
  x1: number
  y1: number
  x2: number
  y2: number
  weight: number
}

export interface TitleBlockText {
  x: number
  y: number
  text: string
  size: number
  weight: number
  anchor: 'start' | 'middle' | 'end'
  color: string
  mono?: boolean
}

export interface TitleBlockLayout {
  x: number
  y: number
  width: number
  height: number
  lines: TitleBlockLine[]
  texts: TitleBlockText[]
}

export const getPageFrameLines = (paper: PaperSettings): TitleBlockLine[] => [
  { x1: PAGE_OUTER_MARGIN, y1: PAGE_OUTER_MARGIN, x2: paper.width - PAGE_OUTER_MARGIN, y2: PAGE_OUTER_MARGIN, weight: 1.8 },
  { x1: paper.width - PAGE_OUTER_MARGIN, y1: PAGE_OUTER_MARGIN, x2: paper.width - PAGE_OUTER_MARGIN, y2: paper.height - PAGE_OUTER_MARGIN, weight: 1.8 },
  { x1: paper.width - PAGE_OUTER_MARGIN, y1: paper.height - PAGE_OUTER_MARGIN, x2: PAGE_OUTER_MARGIN, y2: paper.height - PAGE_OUTER_MARGIN, weight: 1.8 },
  { x1: PAGE_OUTER_MARGIN, y1: paper.height - PAGE_OUTER_MARGIN, x2: PAGE_OUTER_MARGIN, y2: PAGE_OUTER_MARGIN, weight: 1.8 },
  { x1: PAGE_INNER_MARGIN, y1: PAGE_INNER_MARGIN, x2: paper.width - PAGE_INNER_MARGIN, y2: PAGE_INNER_MARGIN, weight: 0.7 },
  { x1: paper.width - PAGE_INNER_MARGIN, y1: PAGE_INNER_MARGIN, x2: paper.width - PAGE_INNER_MARGIN, y2: paper.height - PAGE_INNER_MARGIN, weight: 0.7 },
  { x1: paper.width - PAGE_INNER_MARGIN, y1: paper.height - PAGE_INNER_MARGIN, x2: PAGE_INNER_MARGIN, y2: paper.height - PAGE_INNER_MARGIN, weight: 0.7 },
  { x1: PAGE_INNER_MARGIN, y1: paper.height - PAGE_INNER_MARGIN, x2: PAGE_INNER_MARGIN, y2: PAGE_INNER_MARGIN, weight: 0.7 },
]

export const getTitleBlockLayout = (
  paper: PaperSettings,
  meta: DrawingMeta,
): TitleBlockLayout => {
  const width = TITLE_BLOCK_WIDTH
  const height = TITLE_BLOCK_HEIGHT
  const x = paper.width - PAGE_INNER_MARGIN - width
  const y = paper.height - PAGE_INNER_MARGIN - height
  const xInfo = x + 470
  const row1 = y + 32
  const row2 = y + 110
  const rightRow1 = y + 58
  const rightRow2 = y + 84

  const lines: TitleBlockLine[] = [
    { x1: x, y1: y, x2: x + width, y2: y, weight: 1 },
    { x1: x, y1: y + height, x2: x + width, y2: y + height, weight: 1 },
    { x1: x, y1: y, x2: x, y2: y + height, weight: 1 },
    { x1: x + width, y1: y, x2: x + width, y2: y + height, weight: 1 },
    { x1: x, y1: row1, x2: x + width, y2: row1, weight: 0.8 },
    { x1: x, y1: row2, x2: x + width, y2: row2, weight: 0.8 },
    { x1: x + 430, y1: y, x2: x + 430, y2: row1, weight: 0.8 },
    { x1: xInfo, y1: row1, x2: xInfo, y2: row2, weight: 0.8 },
    { x1: xInfo, y1: rightRow1, x2: x + width, y2: rightRow1, weight: 0.6 },
    { x1: xInfo, y1: rightRow2, x2: x + width, y2: rightRow2, weight: 0.6 },
    { x1: xInfo, y1: row2, x2: xInfo, y2: y + height, weight: 0.8 },
    { x1: x + 560, y1: row2, x2: x + 560, y2: y + height, weight: 0.6 },
  ]

  const mono = (text: string, fallback: string) => text || fallback

  const texts: TitleBlockText[] = [
    { x: x + 12, y: y + 22, text: '项目名称', size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
    { x: x + 70, y: y + 22, text: mono(meta.project, '—'), size: 12, weight: 500, anchor: 'start', color: '#24343b' },
    { x: x + 442, y: y + 22, text: '图号 DWG No.', size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
    { x: x + 540, y: y + 22, text: mono(meta.drawingNo, '—'), size: 11, weight: 600, anchor: 'start', color: '#24343b', mono: true },

    { x: x + 16, y: y + 62, text: '图名', size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
    { x: x + 62, y: y + 84, text: mono(meta.title, '未命名接线图'), size: 23, weight: 600, anchor: 'start', color: '#14262e' },
    { x: x + 16, y: y + 101, text: meta.voltageLevel || '—', size: 11, weight: 500, anchor: 'start', color: '#627178' },

    { x: xInfo + 12, y: y + 45, text: '设计', size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
    { x: xInfo + 92, y: y + 45, text: mono(meta.designer, '—'), size: 12, weight: 500, anchor: 'start', color: '#24343b' },
    { x: xInfo + 12, y: y + 71, text: '校核', size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
    { x: xInfo + 92, y: y + 71, text: mono(meta.checker, '—'), size: 12, weight: 500, anchor: 'start', color: '#24343b' },
    { x: xInfo + 12, y: y + 97, text: '日期', size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
    { x: xInfo + 92, y: y + 97, text: mono(meta.date, '—'), size: 11, weight: 500, anchor: 'start', color: '#24343b' },

    { x: x + 12, y: y + 135, text: '设计单位', size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
    { x: x + 72, y: y + 135, text: mono(meta.company, '—'), size: 12, weight: 500, anchor: 'start', color: '#24343b' },
    { x: xInfo + 12, y: y + 135, text: '比例', size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
    { x: xInfo + 52, y: y + 135, text: mono(meta.scale, 'NTS'), size: 11, weight: 500, anchor: 'start', color: '#24343b', mono: true },
    { x: x + 572, y: y + 135, text: `幅面 ${paper.size}`, size: 10, weight: 500, anchor: 'start', color: '#6a777d' },
  ]

  return { x, y, width, height, lines, texts }
}
