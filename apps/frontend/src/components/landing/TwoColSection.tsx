import { firmSteps, studentSteps } from './data'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function Column({
  tag,
  title,
  description,
  steps,
  buttonLabel,
  filled,
}: {
  tag: string
  title: string
  description: string
  steps: string[]
  buttonLabel: string
  filled?: boolean
}) {
  return (
    <Card className="flex flex-col h-full bg-card p-10 border-border/60 shadow-sm rounded-none border-x-0 border-t-0 md:border-r md:last:border-r-0 lg:border-t lg:border-x">
      <div className="mb-8 flex items-center gap-4">
        <span className="h-px w-6 bg-primary" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          {tag}
        </span>
      </div>
      <h3 className="mb-6 font-heading text-3xl font-extrabold leading-tight tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mb-10 text-base leading-relaxed text-muted-foreground flex-grow">
        {description}
      </p>
      <div className="mb-10 flex flex-col gap-4">
        {steps.map((step) => (
          <div key={step} className="flex items-center gap-4">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <span className="text-sm font-medium text-foreground">{step}</span>
          </div>
        ))}
      </div>
      <Button
        size="lg"
        variant={filled ? 'default' : 'outline'}
        className="w-full h-14 text-xs font-bold uppercase tracking-widest rounded-sm"
      >
        {buttonLabel}
      </Button>
    </Card>
  )
}

export function TwoColSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-12">
      <div className="grid overflow-hidden rounded-xl border border-border/60 bg-background lg:grid-cols-2">
        <Column
          tag="For Students"
          title="Stop Sending Cold Emails."
          description="Your resume is not your ceiling. On Legal Reckoning, your score is your identity. Attempt the paper, earn your rank, clear the interview - and let top law firms discover you on merit alone."
          steps={studentSteps}
          buttonLabel="Begin Your Assessment"
          filled
        />
        <Column
          tag="For Law Firms"
          title="Stop Guessing. Start Hiring Right."
          description="Every candidate has been assessed, ranked and interviewed before you see them. Browse a verified directory filtered by score, practice area and location. Hire with complete confidence."
          steps={firmSteps}
          buttonLabel="Access the Directory"
        />
      </div>
    </section>
  )
}
