const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const apiUrl = (path) => `${baseUrl}${path}`

export async function apiRequest(path, options = {}) {
  const controller = new AbortController()
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const timer = window.setTimeout(() => controller.abort(), isFormData ? 120000 : 15000)
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      signal: options.signal ?? controller.signal,
      headers: {
        ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    if (response.status === 204) return null
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const message = Array.isArray(data?.message) ? data.message.join('；') : data?.message
      throw new ApiError(message || '请求失败，请稍后重试。', response.status, data?.error?.code)
    }
    return data
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('请求超时，请检查网络或服务端状态。', 0)
    if (error instanceof TypeError)
      throw new ApiError('无法连接文库服务。请确认 API 服务已启动。', 0)
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}

export const api = {
  get: (path, query) => apiRequest(`${path}${query ? `?${new URLSearchParams(query)}` : ''}`),
  post: (path, body) =>
    apiRequest(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  upload: (path, formData) => apiRequest(path, { method: 'POST', body: formData }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
}
