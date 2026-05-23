export type Role = 'SUPERADMIN' | 'ADMIN' | 'COMPANY' | 'USER'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  roles?: Role[]
  avatarUrl: string | null
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export interface ManagedUser {
  id: string
  email: string
  name: string
  role: Role
  avatarUrl: string | null
  authProvider: 'EMAIL' | 'GOOGLE'
  createdAt: string
  updatedAt: string
}

const TOKEN_KEY = 'lexassess_access_token'
const USER_KEY = 'lexassess_user'
const ACTIVE_ROLE_KEY = 'lexassess_active_role'
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

export function getAvailableRoles(user: AuthUser): Role[] {
  const roles = user.roles?.length ? user.roles : [user.role]
  return [...new Set(roles)]
}

export function getActiveRole(user: AuthUser): Role {
  const available = getAvailableRoles(user)
  const stored = localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null
  if (stored && available.includes(stored)) {
    return stored
  }
  return user.role
}

export function setActiveRole(role: Role) {
  localStorage.setItem(ACTIVE_ROLE_KEY, role)
}

function syncActiveRole(user: AuthUser) {
  const available = getAvailableRoles(user)
  const current = localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null

  if (!current || !available.includes(current)) {
    localStorage.setItem(ACTIVE_ROLE_KEY, user.role)
  }
}

export function storeAuth(data: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, data.accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  syncActiveRole(data.user)
}

export function storeUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  syncActiveRole(user)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ACTIVE_ROLE_KEY)
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

function getAuthHeaders() {
  const token = getStoredToken()
  if (!token) {
    throw new Error('Missing token')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function fetchAllUsersForSuperadmin(): Promise<ManagedUser[]> {
  const response = await fetch(`${API_BASE_URL}/superadmin/users`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  return response.json() as Promise<ManagedUser[]>
}

export async function updateUserForSuperadmin(
  userId: string,
  input: {
    name?: string
    role?: Role
  },
): Promise<ManagedUser> {
  const response = await fetch(`${API_BASE_URL}/superadmin/users/${userId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Failed to update user')
  }

  return response.json() as Promise<ManagedUser>
}

export async function deleteUserForSuperadmin(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/superadmin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to delete user')
  }
}

export async function assignAdminForSuperadmin(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/assign-admin`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error('Failed to assign admin')
  }
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
