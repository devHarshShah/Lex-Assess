import { getAuthHeaders, getApiBaseUrl } from './auth'

export interface PaperAuthor {
  id: string
  name: string
  email: string
}

export interface QuestionPaper {
  id: string
  specializationId: string
  title: string
  description?: string
  versions?: QuestionPaperVersion[]
  createdBy?: PaperAuthor | null
  createdAt: string
  updatedAt: string
}

export interface QuestionPaperWithMeta extends Omit<QuestionPaper, 'versions'> {
  specialization: { id: string; name: string }
  createdBy: PaperAuthor | null
  versions: (Pick<QuestionPaperVersion, 'id' | 'versionName' | 'status' | 'createdAt'> & { _count: { questions: number } })[]
}

export interface QuestionPaperVersion {
  id: string
  paperId: string
  versionName: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  timeLimitMinutes: number
  questions?: Question[]
  _count?: { questions: number }
  createdAt: string
  updatedAt: string
}

export interface Question {
  id: string
  versionId: string
  type: 'MCQ' | 'SUBJECTIVE' | 'SUBJECTIVE_WITH_ANSWER'
  text: string
  marks: number
  options?: any
  answer?: string
  order: number
  timeLimitSeconds?: number
  createdAt: string
  updatedAt: string
}

export interface TestAttempt {
  id: string
  userId: string
  versionId: string
  startTime: string
  endTime?: string
  status: 'STARTED' | 'SUBMITTED' | 'EXPIRED'
  answers?: any
  score?: number
}

const API_BASE_URL = getApiBaseUrl()

export async function fetchPapers(specializationId: string): Promise<QuestionPaper[]> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/${specializationId}/papers`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch papers')
  return res.json()
}

export async function createPaper(specializationId: string, title: string, description?: string): Promise<QuestionPaper> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/${specializationId}/papers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, description }),
  })
  if (!res.ok) throw new Error('Failed to create paper')
  return res.json()
}

export async function fetchVersions(paperId: string): Promise<QuestionPaperVersion[]> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/papers/${paperId}/versions`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch versions')
  return res.json()
}

export async function createVersion(paperId: string, versionName: string): Promise<QuestionPaperVersion> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/papers/${paperId}/versions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ versionName }),
  })
  if (!res.ok) throw new Error('Failed to create version')
  return res.json()
}

export async function fetchVersionDetails(versionId: string): Promise<QuestionPaperVersion & { paper: QuestionPaper & { specialization: any } }> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/versions/${versionId}`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch version details')
  return res.json()
}

export async function updateVersion(versionId: string, data: { status?: string, timeLimitMinutes?: number, questions?: any[] }): Promise<QuestionPaperVersion> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/versions/${versionId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update version')
  return res.json()
}

export async function fetchAllPapers(): Promise<QuestionPaperWithMeta[]> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/all-papers`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch all papers')
  return res.json()
}

export async function fetchStudentPapers(): Promise<QuestionPaper[]> {
  const res = await fetch(`${API_BASE_URL}/student/papers`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch student papers')
  return res.json()
}

export async function updatePaper(specializationId: string, paperId: string, data: { title?: string; description?: string }): Promise<QuestionPaper> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/${specializationId}/papers/${paperId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update paper')
  return res.json()
}

export async function deletePaper(specializationId: string, paperId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/${specializationId}/papers/${paperId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete paper')
}

export async function renameVersion(versionId: string, versionName: string): Promise<QuestionPaperVersion> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/versions/${versionId}/rename`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ versionName }),
  })
  if (!res.ok) throw new Error('Failed to rename version')
  return res.json()
}

export async function deleteVersion(versionId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/specializations/versions/${versionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete version')
}

export async function startTestAttempt(versionId: string): Promise<TestAttempt> {
  const res = await fetch(`${API_BASE_URL}/student/papers/${versionId}/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to start test attempt')
  }
  return res.json()
}

export async function submitTestAttempt(versionId: string, answers: Record<string, any>): Promise<TestAttempt> {
  const res = await fetch(`${API_BASE_URL}/student/papers/${versionId}/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to submit test attempt')
  }
  return res.json()
}

export async function fetchAttemptStatus(versionId: string): Promise<TestAttempt | null> {
  const res = await fetch(`${API_BASE_URL}/student/papers/${versionId}/status`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) return null
  return res.json()
}
