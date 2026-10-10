export const USER_KEY = 'lexassess_user'
export const ACTIVE_ROLE_KEY = 'lexassess_active_role'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export const UNAUTHORIZED_EVENT = 'lexassess_unauthorized'
// Fired with { detail: message } when the API answers 503 MAINTENANCE
export const MAINTENANCE_EVENT = 'lexassess_maintenance'

export function getApiBaseUrl() {
  return API_BASE_URL
}

/**
 * The JWT now lives in an httpOnly cookie and is intentionally not readable by
 * JS. We use the presence of the cached user object as the client-side "logged
 * in" hint; the server cookie remains the source of truth for authorization.
 */
export function isAuthenticated() {
  return localStorage.getItem(USER_KEY) != null
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ACTIVE_ROLE_KEY)
}
