import { toast } from 'sonner'
import { getApiBaseUrl, MAINTENANCE_EVENT, UNAUTHORIZED_EVENT } from './auth-storage'

interface RequestOptions extends RequestInit {
  skipToast?: boolean
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipToast = false, ...fetchOptions } = options
  const API_BASE_URL = getApiBaseUrl()

  const headers = new Headers(fetchOptions.headers || {})
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      // Send/receive the httpOnly auth cookie on every request.
      credentials: 'include',
    })

    const isNoContent = response.status === 204
    const data = isNoContent ? ({} as T) : await response.json().catch(() => ({} as T))

    if (!response.ok) {
      const isUnauthorized = response.status === 401
      if (isUnauthorized) {
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
      }

      const errorData = data as any
      const message = errorData.message || response.statusText || 'An unexpected error occurred'

      // RootLayout swaps the whole app for the maintenance screen; no toast needed.
      const isMaintenance = response.status === 503 && errorData.code === 'MAINTENANCE'
      if (isMaintenance) {
        window.dispatchEvent(new CustomEvent(MAINTENANCE_EVENT, { detail: message }))
      }
      
      // 401s are handled by the redirect to /login; a toast is just noise.
      if (!skipToast && !isUnauthorized && !isMaintenance) {
        toast.error(message)
      }
      
      throw new Error(message)
    }

    return data as T
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      const msg = 'Network error. Please check your connection.'
      if (!skipToast) toast.error(msg)
      throw new Error(msg)
    }
    throw error
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  
  put: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  
  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
}
