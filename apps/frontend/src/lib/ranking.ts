import { api } from './api-client'

export interface LeaderboardEntry {
  rank: number
  anonymizedId: string
  practiceArea: string
}

export interface FullLeaderboardEntry extends LeaderboardEntry {
  studentId: string
  testScore: number
  testMaxScore: number
  normalizedTest: number
  interviewMarks: number
  commonScore: number
}

export async function fetchPublicLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
  return api.get<LeaderboardEntry[]>(`/ranking/leaderboard${limit ? `?limit=${limit}` : ''}`)
}

export async function fetchFullLeaderboard(): Promise<FullLeaderboardEntry[]> {
  return api.get<FullLeaderboardEntry[]>('/ranking/leaderboard/full')
}
