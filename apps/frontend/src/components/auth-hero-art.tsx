import { Eye, Scale, ShieldCheck } from 'lucide-react'

export function AuthHeroArt({ variant = 'login' }: { variant?: 'login' | 'signup' }) {
  const glowClass = variant === 'login' ? 'from-primary/30 via-primary/15 to-transparent' : 'from-primary/35 via-primary/20 to-transparent'

  return (
    <div className="relative mx-auto mt-6 h-[25rem] w-full max-w-3xl">
      <div className={`absolute left-1/2 top-4 h-56 w-56 -translate-x-1/2 rounded-[2.5rem] bg-gradient-to-br ${glowClass} shadow-[0_40px_120px_-20px_hsl(var(--primary)/0.45)] ring-1 ring-primary/30 [transform:rotateX(20deg)_rotateY(-24deg)_rotateZ(10deg)]`} />
      <div className="absolute left-1/2 top-20 h-40 w-[28rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-2xl border bg-background/95 px-6 py-4 shadow-xl [transform:rotateX(10deg)_rotateY(-20deg)]">
        <div className="flex items-center gap-3">
          <Scale className="size-5 text-primary" />
          <p className="text-base font-semibold">Merit over pedigree</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Your score determines visibility.</p>
      </div>

      <div className="absolute left-[10%] top-44 rounded-2xl border bg-background/95 px-5 py-4 shadow-lg [transform:rotateX(8deg)_rotateY(18deg)_rotateZ(-8deg)]">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          <p className="text-sm font-semibold">Radical transparency</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Public, earned rankings only.</p>
      </div>

      <div className="absolute right-[8%] top-48 rounded-2xl border bg-background/95 px-5 py-4 shadow-lg [transform:rotateX(8deg)_rotateY(-18deg)_rotateZ(7deg)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <p className="text-sm font-semibold">Trust as infrastructure</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Verified students and firms.</p>
      </div>

      <div className="absolute left-1/2 top-[18rem] h-4 w-[32rem] -translate-x-1/2 rounded-full bg-foreground/10 blur-lg" />
    </div>
  )
}
