import * as React from 'react'
import { toast } from 'sonner'

import { fetchFullLeaderboard, type FullLeaderboardEntry } from '@/lib/ranking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AdminRankingPage() {
  const [rows, setRows] = React.useState<FullLeaderboardEntry[]>([])

  React.useEffect(() => {
    async function load() {
      try {
        setRows(await fetchFullLeaderboard())
      } catch {
        toast.error('Could not load leaderboard')
      }
    }
    void load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Common Rank Leaderboard</CardTitle>
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
              <TableHead>Common Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.studentId}>
                <TableCell className="font-semibold">#{row.rank}</TableCell>
                <TableCell>{row.studentId}</TableCell>
                <TableCell>{row.practiceArea}</TableCell>
                <TableCell>
                  {row.testScore} / {row.testMaxScore} ({row.normalizedTest.toFixed(1)}%)
                </TableCell>
                <TableCell>{row.interviewMarks}</TableCell>
                <TableCell className="font-semibold">{row.commonScore.toFixed(1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
