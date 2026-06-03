import { Button } from '@/components/ui/button';

export function ManifestoSection() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-muted/20 text-center">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:px-12 relative z-10">
        <div className="mb-10 text-xs font-bold uppercase tracking-widest text-primary">
          — The LexAssess Founding Principle
        </div>
        <div className="mx-auto mb-16 max-w-4xl font-heading text-[clamp(2rem,3vw,2.5rem)] leading-tight font-bold text-foreground italic opacity-90">
          &ldquo;The best junior lawyer in the room should not be the one with the most connections. They should be the one with the sharpest mind. LexAssess exists to make that true.&rdquo;
        </div>
        
        <div className="mt-20 pt-16 border-t border-border/50">
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
            Ready to Begin?
          </div>
          <h2 className="mb-6 font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold leading-tight tracking-tight text-foreground">
            Prove What You Know.<br />
            Earn What You <span className="text-primary italic">Deserve.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Join law students across India who chose merit over connections.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              className="h-14 px-8 text-sm font-bold uppercase tracking-widest rounded-sm"
            >
              Register & Apply
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-sm font-bold uppercase tracking-widest rounded-sm border-2 border-border text-foreground hover:bg-muted"
            >
              Browse Practice Areas
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
