import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { fetchSubmissionsSummary } from '@/lib/question-papers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ClipboardList } from 'lucide-react'

export function AdminSubmissionsSummaryPage() {
  const { data: summaries, isLoading } = useQuery({
    queryKey: ['submissions-summary'],
    queryFn: fetchSubmissionsSummary
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
        <p className="text-muted-foreground">
          View and score student submissions grouped by specialization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries?.map((spec) => (
          <Link
            key={spec.id}
            to="/dashboard/submissions/specialization/$specializationId"
            params={{ specializationId: spec.id }}
          >
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {spec.name}
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{spec.submissionCount}</div>
                <p className="text-xs text-muted-foreground">
                  Total submissions
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {summaries?.length === 0 && (
          <div className="col-span-full flex h-[200px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">No specializations found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
