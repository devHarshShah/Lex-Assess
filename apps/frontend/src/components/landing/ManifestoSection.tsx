import { Button } from '@/components/ui/button';

export function ManifestoSection() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-muted/20 text-center">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:px-12 relative z-10">
        <div className="mb-8 text-xs font-bold uppercase tracking-widest text-primary">
          Our Manifesto
        </div>
        <div className="mx-auto mb-10 max-w-3xl font-heading text-[clamp(2rem,3.5vw,3rem)] leading-tight font-bold text-foreground">
          &ldquo;The legal profession rewards the meritorious. It is time the
          path to it did too.&rdquo;
        </div>
        <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          India produces hundreds of thousands of law graduates every year. A
          fraction get access to top internships - not always because they are
          the best, but because they went to the right college or knew the right
          people. LexAssess exists to change that. A system where the only thing
          that opens doors is performance.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            size="lg"
            className="h-14 px-8 text-sm font-bold uppercase tracking-widest rounded-sm"
          >
            Begin Your Assessment
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-8 text-sm font-bold uppercase tracking-widest rounded-sm border-2 border-border text-foreground hover:bg-muted"
          >
            Access the Directory
          </Button>
        </div>
      </div>
    </section>
  );
}
