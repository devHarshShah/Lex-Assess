import { api } from './api-client'

export interface LeaderboardEntry {
  rank: number
  anonymizedId: string
  practiceArea: string
}

export interface PublicLeaderboard {
  release: { label: string; releasedAt: string } | null
  entries: LeaderboardEntry[]
}

export interface FullLeaderboardEntry extends Omit<LeaderboardEntry, 'rank'> {
  // null when the student has lost access (soft deleted from the rank list)
  rank: number | null
  releasedRank: number
  softDeleted: boolean
  studentId: string
  testScore: number
  testMaxScore: number
  normalizedTest: number
  interviewMarks: number
  cvScore: number
  commonScore: number
}

export interface RankRelease {
  id: string
  label: string
  releasedAt: string
  candidateCount: number
}

export interface FullLeaderboard {
  release: RankRelease | null
  entries: FullLeaderboardEntry[]
}

export interface RankReleaseHistoryItem extends RankRelease {
  releasedByName: string
}

export interface RankReleasePreview {
  eligibleCandidates: number
  releasedCandidates: number
  newCandidates: number
  latestRelease: RankRelease | null
}

export type RankStanding =
  | { status: 'RELEASED'; rank: number; releaseLabel: string; releasedAt: string; commonScore: number }
  | {
      status: 'PENDING'
      provisionalRank: number | null
      basedOnReleaseLabel: string | null
      commonScore: number | null
    }

export async function fetchPublicLeaderboard(limit?: number): Promise<PublicLeaderboard> {
  return api.get<PublicLeaderboard>(`/ranking/leaderboard${limit ? `?limit=${limit}` : ''}`)
}

export async function fetchFullLeaderboard(): Promise<FullLeaderboard> {
  return api.get<FullLeaderboard>('/ranking/leaderboard/full')
}

export async function fetchMyStanding(): Promise<RankStanding> {
  return api.get<RankStanding>('/ranking/me')
}

export async function fetchReleases(): Promise<RankReleaseHistoryItem[]> {
  return api.get<RankReleaseHistoryItem[]>('/ranking/releases')
}

export async function fetchReleasePreview(): Promise<RankReleasePreview> {
  return api.get<RankReleasePreview>('/ranking/releases/preview')
}

export async function releaseRanks(): Promise<RankRelease> {
  return api.post<RankRelease>('/ranking/releases')
}
