export const TOKEN_KEY = 'lexassess_access_token'
export const USER_KEY = 'lexassess_user'
export const ACTIVE_ROLE_KEY = 'lexassess_active_role'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export const UNAUTHORIZED_EVENT = 'lexassess_unauthorized'

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ACTIVE_ROLE_KEY)
}
