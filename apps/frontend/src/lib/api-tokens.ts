import { api } from './api-client'

export interface ApiToken {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string; role: string }
}

export interface CreatedApiToken {
  id: string
  name: string
  prefix: string
  token: string
  connectorUrl: string
  expiresAt: string | null
  owner: { id: string; name: string | null; email: string }
}

export interface ApiTokenInput {
  name: string
  ownerEmail?: string
  expiresInDays?: number
}

export const fetchApiTokens = () => api.get<ApiToken[]>('/superadmin/api-tokens')
export const createApiToken = (data: ApiTokenInput) => api.post<CreatedApiToken>('/superadmin/api-tokens', data)
export const revokeApiToken = (id: string) => api.delete<{ success: boolean }>(`/superadmin/api-tokens/${id}`)
