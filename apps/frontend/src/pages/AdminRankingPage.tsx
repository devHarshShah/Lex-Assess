import * as React from 'react'
import { toast } from 'sonner'

import {
  fetchFullLeaderboard,
  fetchReleasePreview,
  fetchReleases,
  releaseRanks,
  type FullLeaderboard,
  type RankReleaseHistoryItem,
  type RankReleasePreview,
} from '@/lib/ranking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export function AdminRankingPage() {
  const [leaderboard, setLeaderboard] = React.useState<FullLeaderboard | null>(null)
  const [history, setHistory] = React.useState<RankReleaseHistoryItem[]>([])
  const [preview, setPreview] = React.useState<RankReleasePreview | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [releasing, setReleasing] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const [board, releases, pending] = await Promise.all([
        fetchFullLeaderboard(),
        fetchReleases(),
        fetchReleasePreview(),
      ])
      setLeaderboard(board)
      setHistory(releases)
      setPreview(pending)
    } catch {
      toast.error('Could not load rankings')
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  async function handleRelease() {
    setReleasing(true)
    try {
      const release = await releaseRanks()
      toast.success(`Ranks released for ${release.label}`)
      setConfirmOpen(false)
      await load()
    } catch {
      // The API client already toasts the error message.
    } finally {
      setReleasing(false)
    }
  }

  const release = leaderboard?.release ?? null
  const rows = leaderboard?.entries ?? []
  const canRelease = (preview?.eligibleCandidates ?? 0) > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Common Rank Leaderboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              {release
                ? `Showing the ${release.label} release: ${release.candidateCount} candidates, released ${formatDateTime(release.releasedAt)}. Ranks stay fixed until you release again.`
                : 'No ranks have been released yet. Candidates and the public leaderboard show "yet to be generated" until you release.'}
            </p>
            {preview && (
              <p className="text-sm text-muted-foreground">
                {preview.eligibleCandidates} eligible now, {preview.newCandidates} not in the latest release.
              </p>
            )}
          </div>
          <Button onClick={() => setConfirmOpen(true)} disabled={!canRelease || releasing}>
            Release ranks
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Practice Area</TableHead>
                <TableHead>Test Score</TableHead>
                <TableHead>Interview Marks</TableHead>
                <TableHead>CV Score</TableHead>
                <TableHead>Common Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentId} className={row.softDeleted ? 'opacity-60' : undefined}>
                  <TableCell className="font-semibold">
                    {row.softDeleted ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        Soft deleted (was #{row.releasedRank}) · access ended
                      </span>
                    ) : (
                      <>#{row.rank}</>
                    )}
                  </TableCell>
                  <TableCell>{row.anonymizedId}</TableCell>
                  <TableCell>{row.practiceArea}</TableCell>
                  <TableCell>
                    {row.testScore} / {row.testMaxScore} ({row.normalizedTest.toFixed(1)}%)
                  </TableCell>
                  <TableCell>{row.interviewMarks}</TableCell>
                  <TableCell>{row.cvScore}</TableCell>
                  <TableCell className="font-semibold">{row.commonScore.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Release history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Release</TableHead>
                  <TableHead>Released at</TableHead>
                  <TableHead>Released by</TableHead>
                  <TableHead>Candidates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>{formatDateTime(item.releasedAt)}</TableCell>
                    <TableCell>{item.releasedByName}</TableCell>
                    <TableCell>{item.candidateCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release ranks?</AlertDialogTitle>
            <AlertDialogDescription>
              This ranks all {preview?.eligibleCandidates ?? 0} eligible candidates
              {preview ? ` (${preview.newCandidates} not in the latest release)` : ''} and publishes the result to the
              public leaderboard, candidates and certificate QR pages. Ranks stay fixed until the next release.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={releasing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={releasing}
              onClick={(event) => {
                event.preventDefault()
                void handleRelease()
              }}
            >
              {releasing ? 'Releasing...' : 'Release'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
