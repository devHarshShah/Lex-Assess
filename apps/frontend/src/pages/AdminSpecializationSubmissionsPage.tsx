import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { fetchSubmissionsBySpecialization } from '@/lib/question-papers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, ChevronRight } from 'lucide-react'

export function AdminSpecializationSubmissionsPage() {
  const { specializationId } = useParams({ from: '/dashboard/submissions/specialization/$specializationId' })

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', specializationId],
    queryFn: () => fetchSubmissionsBySpecialization(specializationId)
  })

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard/submissions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {submissions?.[0]?.version?.paper?.specializationId ? 'Submissions' : 'Submissions'}
          </h1>
          <p className="text-muted-foreground">
            List of student attempts for this practice area.
          </p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Paper</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions?.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell>
                  <div className="font-medium">{submission.user.name}</div>
                  <div className="text-xs text-muted-foreground">{submission.user.email}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{submission.version.paper.title}</div>
                  <div className="text-xs text-muted-foreground">{submission.version.versionName}</div>
                </TableCell>
                <TableCell>
                  {submission.endTime ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(submission.endTime)) : 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="font-bold">
                    {submission.score !== null ? submission.score : 'Not Scored'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    to="/dashboard/submissions/$submissionId/score"
                    params={{ submissionId: submission.id }}
                  >
                    <Button variant="ghost" size="sm">
                      Score <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {submissions?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No submissions found for this practice area.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
