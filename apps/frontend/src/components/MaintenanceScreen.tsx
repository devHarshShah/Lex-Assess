import { Link } from '@tanstack/react-router'
import { Wrench } from 'lucide-react'

export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wrench className="h-7 w-7" />
        </div>
        <p className="mb-2 text-xs tracking-[0.2em] text-muted-foreground">LEXASSESS</p>
        <h1 className="mb-3 text-2xl font-semibold">We'll be right back</h1>
        <p className="text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Try again
        </button>
        <p className="mt-10 text-xs text-muted-foreground">
          Admin? <Link to="/login" className="underline underline-offset-4">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
