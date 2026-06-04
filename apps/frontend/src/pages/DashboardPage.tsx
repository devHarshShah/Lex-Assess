import React from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getActiveRole, hasRole } from '@/lib/auth'
import { fetchStudentPapers, type QuestionPaper } from '@/lib/question-papers'
import { Clock, BookOpen, ChevronRight } from 'lucide-react'

export function DashboardPage() {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  })

  const [papers, setPapers] = React.useState<QuestionPaper[]>([])
  const [loading, setLoading] = React.useState(false)

  const role = user ? getActiveRole(user) : 'USER'
  const isStudent = role === 'USER'

  React.useEffect(() => {
    if (isStudent) {
      setLoading(true)
      fetchStudentPapers()
        .then(setPapers)
        .finally(() => setLoading(false))
    }
  }, [isStudent])

  if (!user) return null

  const adminCards = [
    { title: 'Role', value: role, show: true },
    { title: 'Superadmin Controls', value: 'Enabled', show: hasRole(role, ['SUPERADMIN']) },
    { title: 'Admin Controls', value: 'Enabled', show: hasRole(role, ['ADMIN']) },
    { title: 'Company Controls', value: 'Enabled', show: hasRole(role, ['COMPANY']) },
  ].filter((card) => card.show)

  if (!isStudent) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {adminCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}!</h2>
        <p className="text-muted-foreground">Here are the tests available for your practice area.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading available tests...</p>
        </div>
      ) : papers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper) => {
            const publishedVersion = paper.versions?.find(v => v.status === 'PUBLISHED')
            const attempt = (publishedVersion as any)?.userAttempt
            
            let statusBadge = null
            let buttonText = 'Start Test'
            let isDisabled = false

            if (attempt) {
              if (attempt.status === 'SUBMITTED') {
                statusBadge = <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">Submitted</span>
                buttonText = 'Completed'
                isDisabled = true
              } else if (attempt.status === 'EXPIRED') {
                statusBadge = <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">Expired</span>
                buttonText = 'Attempt Expired'
                isDisabled = true
              } else if (attempt.status === 'STARTED') {
                statusBadge = <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold animate-pulse">In Progress</span>
                buttonText = 'Resume Test'
              }
            }

            return (
              <Card key={paper.id} className="flex flex-col relative overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle>{paper.title}</CardTitle>
                    {statusBadge}
                  </div>
                  <CardDescription className="line-clamp-2">{paper.description || 'No description available.'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{publishedVersion?.timeLimitMinutes || 60} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen size={16} />
                      <span>{publishedVersion?._count?.questions || 0} Questions</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button 
                    className="w-full" 
                    variant={attempt?.status === 'STARTED' ? 'default' : isDisabled ? 'secondary' : 'default'} 
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        const url = `/dashboard/test-attempt/${publishedVersion?.id}`
                        const width = window.screen.availWidth
                        const height = window.screen.availHeight
                        window.open(url, 'lex-test-window', `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes`)
                      }
                    }}
                  >
                    {isDisabled ? (
                      <span className="flex items-center justify-center gap-2">
                        {buttonText}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {buttonText} <ChevronRight size={16} />
                      </span>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No tests found</h3>
            <p className="text-muted-foreground max-w-xs">
              There are no published tests for your practice area yet. Please check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
