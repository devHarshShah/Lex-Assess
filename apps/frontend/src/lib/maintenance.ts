import { api } from './api-client'

export interface MaintenanceStatus {
  enabled: boolean
  message: string
}

export interface MaintenanceSettings extends MaintenanceStatus {
  updatedAt: string | null
}

export function fetchMaintenanceStatus(): Promise<MaintenanceStatus> {
  return api.get<MaintenanceStatus>('/maintenance', { skipToast: true })
}

export function fetchMaintenanceSettings(): Promise<MaintenanceSettings> {
  return api.get<MaintenanceSettings>('/superadmin/maintenance')
}

export function updateMaintenanceSettings(input: { enabled: boolean; message?: string }): Promise<MaintenanceSettings> {
  return api.put<MaintenanceSettings>('/superadmin/maintenance', input)
}
