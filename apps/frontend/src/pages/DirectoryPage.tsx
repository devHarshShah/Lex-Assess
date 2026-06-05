import { Link } from '@tanstack/react-router'

import { DirectorySection, Footer } from '../components/landing'
import { Button } from '@/components/ui/button'

export function DirectoryPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 md:px-12">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="LexAssess logo" className="h-9 w-11 object-contain" />
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">
              Lex<span className="text-primary">Assess</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 rounded-full border-border px-4 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted"
            >
              <Link to="/signup">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-6">
        <DirectorySection />
      </main>

      <Footer />
    </div>
  )
}
