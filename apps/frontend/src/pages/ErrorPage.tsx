import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function ErrorPage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Unexpected error'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl rounded-3xl border bg-card p-10 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">500</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Something Went Wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/login">Login Again</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
