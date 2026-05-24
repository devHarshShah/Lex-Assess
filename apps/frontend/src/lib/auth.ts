export type Role = 'SUPERADMIN' | 'ADMIN' | 'COMPANY' | 'USER'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  roles?: Role[]
  avatarUrl: string | null
  profileCompleted: boolean
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

export interface ManagedUserProfileRecord {
  id: string
  email: string
  name: string
  role: Role
  avatarUrl: string | null
  profile: UserProfile | null
}

export type VerificationType = 'ONGOING' | 'GRADUATED'

export interface UserProfile {
  fullName: string
  college: string
  degree: string
  currentYear: string
  specialization: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  countryCode: string | null
  mobileNumber: string | null
  linkedinUrl: string | null
  resumeUrl: string | null
  profilePhotoUrl: string | null
  verificationType: VerificationType | null
  verificationDocUrl: string | null
  isComplete: boolean
}

export interface ProfileOptions {
  colleges: string[]
  degrees: string[]
  years: string[]
  specializations: string[]
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

export async function fetchProfileOptions(): Promise<ProfileOptions> {
  const response = await fetch(`${API_BASE_URL}/profile/options`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch profile options')
  }

  return response.json() as Promise<ProfileOptions>
}

export async function fetchMyProfile(): Promise<UserProfile | null> {
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }

  return response.json() as Promise<UserProfile | null>
}

export async function saveProfileStepOne(input: {
  fullName: string
  college: string
  degree: string
  currentYear: string
  specialization: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  countryCode: string
  mobileNumber: string
  linkedinUrl?: string
  resumeUrl?: string
  profilePhotoUrl?: string
}) {
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Failed to save profile')
  }

  return response.json() as Promise<UserProfile>
}

export async function saveProfileVerification(input: { verificationType: VerificationType; verificationDocUrl: string }) {
  const response = await fetch(`${API_BASE_URL}/profile/verification`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Failed to save verification')
  }

  return response.json() as Promise<UserProfile>
}

export async function uploadProfileAsset(file: File, kind: 'profile_photo' | 'resume' | 'verification_doc') {
  const token = getStoredToken()
  if (!token) {
    throw new Error('Missing token')
  }

  const formData = new FormData()
  formData.append('kind', kind)
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  return response.json() as Promise<{ url: string; objectKey: string }>
}

export async function fetchSuperadminSpecializations(): Promise<{ id: string; name: string; isActive: boolean; sortOrder: number }[]> {
  const response = await fetch(`${API_BASE_URL}/superadmin/specializations`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch specializations')
  return response.json() as Promise<{ id: string; name: string; isActive: boolean; sortOrder: number }[]>
}

export async function createSuperadminSpecialization(name: string) {
  const response = await fetch(`${API_BASE_URL}/superadmin/specializations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error('Failed to create specialization')
}

export async function updateSuperadminSpecialization(
  id: string,
  input: { name?: string; isActive?: boolean; sortOrder?: number },
) {
  const response = await fetch(`${API_BASE_URL}/superadmin/specializations/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error('Failed to update specialization')
}

export async function deleteSuperadminSpecialization(id: string) {
  const response = await fetch(`${API_BASE_URL}/superadmin/specializations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to delete specialization')
}

export async function fetchSuperadminColleges(): Promise<{ id: string; name: string }[]> {
  const response = await fetch(`${API_BASE_URL}/superadmin/colleges`, { headers: getAuthHeaders() })
  if (!response.ok) throw new Error('Failed to fetch colleges')
  return response.json() as Promise<{ id: string; name: string }[]>
}

export async function createSuperadminCollege(name: string) {
  const response = await fetch(`${API_BASE_URL}/superadmin/colleges`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error('Failed to create college')
}

export async function updateSuperadminCollege(id: string, name: string) {
  const response = await fetch(`${API_BASE_URL}/superadmin/colleges/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error('Failed to update college')
}

export async function deleteSuperadminCollege(id: string) {
  const response = await fetch(`${API_BASE_URL}/superadmin/colleges/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to delete college')
}

export async function fetchSuperadminDegrees(): Promise<{ id: string; name: string }[]> {
  const response = await fetch(`${API_BASE_URL}/superadmin/degrees`, { headers: getAuthHeaders() })
  if (!response.ok) throw new Error('Failed to fetch degrees')
  return response.json() as Promise<{ id: string; name: string }[]>
}

export async function createSuperadminDegree(name: string) {
  const response = await fetch(`${API_BASE_URL}/superadmin/degrees`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error('Failed to create degree')
}

export async function updateSuperadminDegree(id: string, name: string) {
  const response = await fetch(`${API_BASE_URL}/superadmin/degrees/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error('Failed to update degree')
}

export async function deleteSuperadminDegree(id: string) {
  const response = await fetch(`${API_BASE_URL}/superadmin/degrees/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to delete degree')
}

export async function fetchSuperadminProfiles(): Promise<ManagedUserProfileRecord[]> {
  const response = await fetch(`${API_BASE_URL}/superadmin/profiles`, { headers: getAuthHeaders() })
  if (!response.ok) throw new Error('Failed to fetch profiles')
  return response.json() as Promise<ManagedUserProfileRecord[]>
}

export async function verifySuperadminProfile(userId: string, verified: boolean) {
  const response = await fetch(`${API_BASE_URL}/superadmin/profiles/${userId}/verify`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ verified }),
  })
  if (!response.ok) throw new Error('Failed to update verification status')
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
