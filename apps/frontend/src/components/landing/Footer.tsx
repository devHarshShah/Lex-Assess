import { Badge } from '@/components/ui/badge'

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="font-heading text-xl font-bold tracking-tight text-foreground">
              Legal<span className="text-primary">Reckoning</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              India's first meritocratic rank-list and assessment framework built specifically for top-tier legal talent.
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 uppercase tracking-widest font-bold text-[9px] px-3 py-1">
                Launching Soon
              </Badge>
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Platform</h4>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">The Assessment</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Leaderboard</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">For Law Firms</a>
          </div>

          {/* Links Column 2 */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Contact</h4>
            <a href="mailto:legalreckoning.official@gmail.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              legalreckoning.official@gmail.com
            </a>
            <span className="text-sm text-muted-foreground">New Delhi, India</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-border/40 pt-8 gap-4 text-center md:text-left">
          <div className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Legal Reckoning. All rights reserved.
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
