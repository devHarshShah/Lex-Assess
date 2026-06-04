import { api } from './api-client'

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

export interface SectionRules {
  allowTabSwitching?: boolean
  allowExternalResources?: boolean
  maxViolations?: number
  wordLimit?: number
  timeLimitSeconds?: number
  questionsToAttempt?: number
  allowedResources?: string[]
  blockedResources?: string[]
}

export interface PaperSection {
  id: string
  versionId: string
  title: string
  description?: string
  order: number
  rules?: SectionRules
  questions?: Question[]
  createdAt: string
  updatedAt: string
}

export interface QuestionPaperVersion {
  id: string
  paperId: string
  versionName: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  timeLimitMinutes: number
  instructions?: string
  sections?: PaperSection[]
  questions?: Question[]
  _count?: { questions: number }
  createdAt: string
  updatedAt: string
}

export interface Question {
  id: string
  versionId: string
  sectionId?: string
  parentId?: string | null
  subQuestions?: Question[]
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
  questionScores?: Record<string, number>
}

export interface SubmissionSummary {
  id: string
  name: string
  submissionCount: number
}

export interface SubmissionDetails extends TestAttempt {
  user: {
    id: string
    name: string
    email: string
    profile?: any
  }
  version: QuestionPaperVersion & {
    paper: QuestionPaper
  }
}

export async function fetchPapers(specializationId: string): Promise<QuestionPaper[]> {
  return api.get<QuestionPaper[]>(`/admin/specializations/${specializationId}/papers`)
}

export async function createPaper(specializationId: string, title: string, description?: string): Promise<QuestionPaper> {
  return api.post<QuestionPaper>(`/admin/specializations/${specializationId}/papers`, { title, description })
}

export async function fetchVersions(paperId: string): Promise<QuestionPaperVersion[]> {
  return api.get<QuestionPaperVersion[]>(`/admin/specializations/papers/${paperId}/versions`)
}

export async function createVersion(paperId: string, versionName: string): Promise<QuestionPaperVersion> {
  return api.post<QuestionPaperVersion>(`/admin/specializations/papers/${paperId}/versions`, { versionName })
}

export async function fetchVersionDetails(versionId: string): Promise<QuestionPaperVersion & { paper: QuestionPaper & { specialization: any } }> {
  return api.get<QuestionPaperVersion & { paper: QuestionPaper & { specialization: any } }>(`/admin/specializations/versions/${versionId}`)
}

export async function fetchStudentVersionDetails(versionId: string): Promise<QuestionPaperVersion & { paper: QuestionPaper & { specialization: any } }> {
  return api.get<QuestionPaperVersion & { paper: QuestionPaper & { specialization: any } }>(`/student/papers/${versionId}/details`)
}

export async function updateVersion(versionId: string, data: { status?: string, timeLimitMinutes?: number, instructions?: string, sections?: any[], questions?: any[] }): Promise<QuestionPaperVersion> {
  return api.put<QuestionPaperVersion>(`/admin/specializations/versions/${versionId}`, data)
}

export async function fetchAllPapers(): Promise<QuestionPaperWithMeta[]> {
  return api.get<QuestionPaperWithMeta[]>('/admin/specializations/all-papers')
}

export async function fetchStudentPapers(): Promise<QuestionPaper[]> {
  return api.get<QuestionPaper[]>('/student/papers')
}

export async function updatePaper(specializationId: string, paperId: string, data: { title?: string; description?: string }): Promise<QuestionPaper> {
  return api.put<QuestionPaper>(`/admin/specializations/${specializationId}/papers/${paperId}`, data)
}

export async function deletePaper(specializationId: string, paperId: string): Promise<void> {
  return api.delete(`/admin/specializations/${specializationId}/papers/${paperId}`)
}

export async function renameVersion(versionId: string, versionName: string): Promise<QuestionPaperVersion> {
  return api.put<QuestionPaperVersion>(`/admin/specializations/versions/${versionId}/rename`, { versionName })
}

export async function deleteVersion(versionId: string): Promise<void> {
  return api.delete(`/admin/specializations/versions/${versionId}`)
}

export async function startTestAttempt(versionId: string): Promise<TestAttempt> {
  return api.post<TestAttempt>(`/student/papers/${versionId}/start`)
}

export async function saveTestAnswers(versionId: string, answers: Record<string, any>): Promise<TestAttempt> {
  return api.post<TestAttempt>(`/student/papers/${versionId}/save-answers`, { answers }, { skipToast: true })
}


export async function submitTestAttempt(versionId: string, answers: Record<string, any>): Promise<TestAttempt> {
  return api.post<TestAttempt>(`/student/papers/${versionId}/submit`, { answers })
}

export async function fetchAttemptStatus(versionId: string): Promise<TestAttempt | null> {
  return api.get<TestAttempt | null>(`/student/papers/${versionId}/status`, { skipToast: true })
}

export async function fetchSubmissionsSummary(): Promise<SubmissionSummary[]> {
  return api.get<SubmissionSummary[]>('/admin/submissions/summary')
}

export async function fetchSubmissionsBySpecialization(specializationId: string): Promise<SubmissionDetails[]> {
  return api.get<SubmissionDetails[]>(`/admin/submissions/specialization/${specializationId}`)
}

export async function fetchSubmissionDetails(id: string): Promise<SubmissionDetails> {
  return api.get<SubmissionDetails>(`/admin/submissions/${id}`)
}

export async function updateSubmissionScore(id: string, questionScores: Record<string, number>): Promise<TestAttempt> {
  return api.patch<TestAttempt>(`/admin/submissions/${id}/score`, { questionScores })
}
