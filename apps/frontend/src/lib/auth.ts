import { api } from './api-client'
import {
  USER_KEY,
  ACTIVE_ROLE_KEY,
  getApiBaseUrl,
  isAuthenticated,
  clearAuth,
  UNAUTHORIZED_EVENT,
} from './auth-storage'
import { isPublicEmailProvider } from './utils'

export type Role = 'SUPERADMIN' | 'ADMIN' | 'COMPANY' | 'USER' | 'INTERVIEWER'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  roles?: Role[]
  avatarUrl: string | null
  profileCompleted: boolean
  hasActiveSubscription: boolean
  profile?: UserProfile
}

export interface AuthResponse {
  // The access token is delivered as an httpOnly cookie, not in the body.
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

export type NotificationPlacement = 'BANNER' | 'CARD'

export interface NotificationRecord {
  id: string
  placement: NotificationPlacement
  label: string | null
  title: string
  description: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
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
  internshipGoal: string | null
  internshipDuration: string | null
  internshipPeriod: string | null
  rollNumber: string | null
  cvScore: number | null
}

export interface ProfileOptions {
  colleges: string[]
  degrees: string[]
  years: string[]
  specializations: string[]
  internshipGoals: string[]
  internshipDurations: string[]
}

export { getApiBaseUrl, isAuthenticated, clearAuth, UNAUTHORIZED_EVENT }

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
  // The access token is set as an httpOnly cookie by the server; we only cache
  // the (non-secret) user object for UI rendering.
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  syncActiveRole(data.user)
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', undefined, { skipToast: true })
  } catch {
    // Even if the server call fails, clear local state below.
  }
  clearAuth()
}

export function storeUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  syncActiveRole(user)
}

export async function exchangeGoogleCode(code: string, state?: string | null): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/google/exchange', { code, state }, { skipToast: true })
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return api.get<AuthUser>('/auth/me', { skipToast: true })
}

export async function registerWithPassword(input: {
  name: string
  email: string
  password: string
  role?: Role
}): Promise<AuthResponse> {
  if (input.role === 'COMPANY' && isPublicEmailProvider(input.email)) {
    throw new Error('Please use a company email address to register as a company.')
  }
  return api.post<AuthResponse>('/auth/register', input, { skipToast: true })
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { email, password }, { skipToast: true })
}

export async function setPasswordWithToken(token: string, password: string): Promise<void> {
  return api.post('/auth/set-password', { token, password }, { skipToast: true })
}

export async function fetchAllUsersForSuperadmin(): Promise<ManagedUser[]> {
  return api.get<ManagedUser[]>('/superadmin/users')
}

export async function updateUserForSuperadmin(
  userId: string,
  input: {
    name?: string
    role?: Role
  },
): Promise<ManagedUser> {
  return api.patch<ManagedUser>(`/superadmin/users/${userId}`, input)
}

export async function deleteUserForSuperadmin(userId: string): Promise<void> {
  return api.delete(`/superadmin/users/${userId}`)
}

export async function assignAdminForSuperadmin(email: string): Promise<void> {
  return api.post('/auth/assign-admin', { email })
}

export async function fetchProfileOptions(): Promise<ProfileOptions> {
  return api.get<ProfileOptions>('/profile/options')
}

export async function fetchMyProfile(): Promise<UserProfile | null> {
  return api.get<UserProfile | null>('/profile/me')
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
  internshipGoal?: string
  internshipDuration?: string
  internshipPeriod?: string
}) {
  return api.patch<UserProfile>('/profile/me', input)
}

export async function saveProfileVerification(input: { verificationType: VerificationType; verificationDocUrl: string }) {
  return api.patch<UserProfile>('/profile/verification', input)
}

export async function uploadProfileAsset(
  file: File,
  kind: 'profile_photo' | 'resume' | 'verification_doc' | 'operator_id_card',
) {
  const formData = new FormData()
  formData.append('kind', kind)
  formData.append('file', file)

  return api.post<{ url: string; objectKey: string }>('/uploads', formData)
}

export async function fetchSuperadminSpecializations(): Promise<{ id: string; name: string; isActive: boolean; sortOrder: number }[]> {
  return api.get<{ id: string; name: string; isActive: boolean; sortOrder: number }[]>('/superadmin/specializations')
}

export async function createSuperadminSpecialization(name: string) {
  return api.post('/superadmin/specializations', { name })
}

export async function updateSuperadminSpecialization(
  id: string,
  input: { name?: string; isActive?: boolean; sortOrder?: number },
) {
  return api.patch(`/superadmin/specializations/${id}`, input)
}

export async function deleteSuperadminSpecialization(id: string) {
  return api.delete(`/superadmin/specializations/${id}`)
}

export async function fetchSuperadminColleges(): Promise<{ id: string; name: string }[]> {
  return api.get<{ id: string; name: string }[]>('/superadmin/colleges')
}

export async function createSuperadminCollege(name: string) {
  return api.post('/superadmin/colleges', { name })
}

export async function updateSuperadminCollege(id: string, name: string) {
  return api.patch(`/superadmin/colleges/${id}`, { name })
}

export async function deleteSuperadminCollege(id: string) {
  return api.delete(`/superadmin/colleges/${id}`)
}

export async function fetchSuperadminDegrees(): Promise<{ id: string; name: string }[]> {
  return api.get<{ id: string; name: string }[]>('/superadmin/degrees')
}

export async function createSuperadminDegree(name: string) {
  return api.post('/superadmin/degrees', { name })
}

export async function updateSuperadminDegree(id: string, name: string) {
  return api.patch(`/superadmin/degrees/${id}`, { name })
}

export async function deleteSuperadminDegree(id: string) {
  return api.delete(`/superadmin/degrees/${id}`)
}

export async function fetchSuperadminProfiles(): Promise<ManagedUserProfileRecord[]> {
  return api.get<ManagedUserProfileRecord[]>('/superadmin/profiles')
}

export async function verifySuperadminProfile(userId: string, verified: boolean) {
  return api.patch(`/superadmin/profiles/${userId}/verify`, { verified })
}

export async function setCvScoreForSuperadmin(userId: string, score: number) {
  return api.patch(`/superadmin/profiles/${userId}/cv-score`, { score })
}

export async function fetchPublicNotifications(): Promise<NotificationRecord[]> {
  return api.get<NotificationRecord[]>('/notifications')
}

export async function fetchAdminNotifications(): Promise<NotificationRecord[]> {
  return api.get<NotificationRecord[]>('/admin/notifications')
}

export async function createAdminNotification(input: {
  placement: NotificationPlacement
  label?: string
  title: string
  description?: string
}) {
  return api.post<NotificationRecord>('/admin/notifications', input)
}

export async function updateAdminNotification(
  id: string,
  input: {
    placement?: NotificationPlacement
    label?: string
    title?: string
    description?: string
    isActive?: boolean
    sortOrder?: number
  },
) {
  return api.patch<NotificationRecord>(`/admin/notifications/${id}`, input)
}

export async function deleteAdminNotification(id: string) {
  return api.delete(`/admin/notifications/${id}`)
}

export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  const hierarchy: Record<Role, number> = {
    USER: 1,
    INTERVIEWER: 2,
    COMPANY: 3,
    ADMIN: 4,
    SUPERADMIN: 5,
  }

  return requiredRoles.some((requiredRole) => hierarchy[userRole] >= hierarchy[requiredRole])
}
