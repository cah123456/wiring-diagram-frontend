import axios, { AxiosError } from 'axios'

/**
 * 后端统一响应结构，对应 Java 的 R 类型。
 *
 * 成功：{ code: 20000, message: '操作成功', success: true, data: { result: ... } }
 * 失败：{ code: 20001, message: '...', success: false, data: {} }
 * 校验：{ code: 20001, message: '提交的数据校验未通过', success: false,
 *        data: { fields: { name: '图纸名称不能为空' } } }
 */
export interface ApiResponse<T> {
  code: number
  message: string
  success: boolean
  data?: {
    result?: T
    fields?: Record<string, string>
  }
}

export interface ApiErrorBody {
  code?: number
  status?: number
  error?: string
  message?: string
  success?: boolean
  data?: {
    result?: unknown
    fields?: Record<string, string>
  }
  /** 兼容旧版错误结构；后端已统一放入 data.fields。 */
  fields?: Record<string, string>
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 取出 R 中的业务数据。
 *
 * 后端在 HTTP 2xx 时也可能返回 success=false（例如被拦截的业务失败），
 * 因此这里必须再判断一次，避免把失败响应当成正常数据继续使用。
 */
export const unwrap = <T>(body: ApiResponse<T>): T => {
  if (!body?.success) {
    throw new Error(body?.message || '操作失败')
  }
  return body.data?.result as T
}

/** 不关心返回值，只确认 R.success 为 true（删除等接口使用）。 */
export const ensureSuccess = (body: ApiResponse<unknown>): void => {
  if (!body?.success) {
    throw new Error(body?.message || '操作失败')
  }
}

/** 从 Axios 错误或普通 Error 中提取可展示的中文提示。 */
export const getApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined
    const fields = body?.data?.fields ?? body?.fields
    if (fields && Object.keys(fields).length > 0) {
      return Object.values(fields)[0]
    }
    if (body?.message) return body.message
    if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试'
    if (!error.response) return '无法连接服务器，请确认后端服务已启动'
  }
  if (error instanceof Error) return error.message
  return '操作失败，请稍后重试'
}

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
)
