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
  questions?: Question[]
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
  createdAt: string
  updatedAt: string
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

export async function updateVersion(versionId: string, data: { status?: string, questions?: any[] }): Promise<QuestionPaperVersion> {
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
