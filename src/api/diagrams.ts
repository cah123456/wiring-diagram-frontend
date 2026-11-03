import { ensureSuccess, http, unwrap, type ApiResponse } from './http'
import type {
  DiagramDetail,
  DiagramDocument,
  DiagramStats,
  DiagramSummary,
  PageVO,
} from '../types/diagram'

export interface CreateDiagramPayload {
  name: string
  voltageLevel?: string
  description?: string
  document: DiagramDocument
}

export interface SaveDiagramPayload {
  document: DiagramDocument
  thumbnail?: string
}

/**
 * 以下所有接口都经过统一 R 包装：
 * - 请求泛型统一写 ApiResponse<业务类型>；
 * - 通过 unwrap 取出 data.result，页面层继续拿到原来的业务对象；
 * - 删除接口没有 result，用 ensureSuccess 只校验 success。
 */
export const listDiagrams = async (params: {
  keyword?: string
  pageNum?: number
  pageSize?: number
}): Promise<PageVO<DiagramSummary>> => {
  const response = await http.get<ApiResponse<PageVO<DiagramSummary>>>('/diagrams', { params })
  return unwrap(response.data)
}

export const getDiagramStats = async (): Promise<DiagramStats> => {
  const response = await http.get<ApiResponse<DiagramStats>>('/diagrams/stats')
  return unwrap(response.data)
}

export const getDiagram = async (id: number): Promise<DiagramDetail> => {
  const response = await http.get<ApiResponse<DiagramDetail>>(`/diagrams/${id}`)
  return unwrap(response.data)
}

export const createDiagram = async (payload: CreateDiagramPayload): Promise<DiagramDetail> => {
  const response = await http.post<ApiResponse<DiagramDetail>>('/diagrams', payload)
  return unwrap(response.data)
}

export const saveDiagram = async (
  id: number,
  payload: SaveDiagramPayload,
): Promise<DiagramDetail> => {
  const response = await http.put<ApiResponse<DiagramDetail>>(`/diagrams/${id}`, payload)
  return unwrap(response.data)
}

export const updateDiagramMeta = async (
  id: number,
  payload: { name: string; voltageLevel?: string; description?: string },
): Promise<DiagramDetail> => {
  const response = await http.patch<ApiResponse<DiagramDetail>>(`/diagrams/${id}`, payload)
  return unwrap(response.data)
}

export const duplicateDiagram = async (id: number): Promise<DiagramDetail> => {
  const response = await http.post<ApiResponse<DiagramDetail>>(`/diagrams/${id}/duplicate`)
  return unwrap(response.data)
}

export const deleteDiagram = async (id: number): Promise<void> => {
  const response = await http.delete<ApiResponse<null>>(`/diagrams/${id}`)
  ensureSuccess(response.data)
}
