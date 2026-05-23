export type Role = 'SUPERADMIN' | 'ADMIN' | 'COMPANY' | 'USER'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

const TOKEN_KEY = 'lexassess_access_token'
const USER_KEY = 'lexassess_user'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function storeAuth(data: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, data.accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
}

export function storeUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function exchangeGoogleCode(code: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!response.ok) {
    throw new Error('Google sign-in failed')
  }

  return response.json() as Promise<AuthResponse>
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const token = getStoredToken()
  if (!token) {
    throw new Error('Missing token')
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Session expired')
  }

  return response.json() as Promise<AuthUser>
}

export async function registerWithPassword(input: {
  name: string
  email: string
  password: string
  role?: Role
}): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Registration failed')
  }

  return response.json() as Promise<AuthResponse>
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Invalid credentials')
  }

  return response.json() as Promise<AuthResponse>
}

export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  const hierarchy: Record<Role, number> = {
    USER: 1,
    COMPANY: 2,
    ADMIN: 3,
    SUPERADMIN: 4,
  }

  return requiredRoles.some((requiredRole) => hierarchy[userRole] >= hierarchy[requiredRole])
}
