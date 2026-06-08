import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Sparkles, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { NotificationRecord } from '@/lib/auth'

import { pipelineSteps } from './data'

function PipelineStep({
  number,
  pill,
  title,
  description,
  index,
}: {
  number: string
  pill: string
  title: string
  description: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.15 + index * 0.08 }}
      className="group flex gap-4 border-b border-border/60 py-4 last:border-0"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/6 text-sm font-bold tracking-tight text-primary">
        {number}
      </div>
      <div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
          {pill}
        </div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </motion.div>
  )
}

export function HeroSection({
  notifications,
}: {
  notifications: NotificationRecord[]
}) {
  const bannerItems = notifications.filter((item) => item.placement === 'BANNER')
  const marqueeItems = bannerItems.length > 0 ? [...bannerItems, ...bannerItems] : []
  const bannerLead = bannerItems[0]

  return (
    <section
      id="process"
      className="relative isolate flex min-h-screen w-full scroll-mt-24 flex-col justify-center overflow-hidden pb-20 pt-28 md:pt-32"
    >
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,_rgba(217,119,6,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(17,17,17,0.06),_transparent_25%),linear-gradient(to_bottom,_rgba(255,255,255,0.9),_rgba(249,249,246,0.96))]" />
      <div className="absolute left-1/2 top-12 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-12 right-10 -z-10 h-72 w-72 rounded-full bg-foreground/[0.04] blur-3xl" />

      {bannerItems.length > 0 ? (
        <div className="mx-auto mb-8 w-full max-w-7xl px-6 md:px-12">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-card/90 shadow-[0_24px_80px_-40px_rgba(217,119,6,0.5)] backdrop-blur">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(217,119,6,0.12),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(17,17,17,0.04),_transparent_30%)]" />
            <div className="relative grid gap-5 px-6 py-5 md:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] md:items-center md:px-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Latest updates
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="max-w-3xl text-[clamp(1.8rem,2.4vw,2.4rem)] font-semibold leading-tight tracking-tight text-foreground">
                    {bannerLead?.title || 'Merit-based legal hiring, made visible.'}
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {bannerLead?.description ||
                      'LexAssess connects law students and firms through demonstrated ability, transparent scoring, and a premium experience that feels worthy of the work itself.'}
                  </p>
                </div>
              </div>

              <div className="flex w-full max-w-[24rem] flex-wrap items-center justify-end gap-2 md:justify-self-end md:text-right">
                {(bannerItems.length > 0 ? bannerItems : []).slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-2 text-xs text-foreground shadow-sm"
                  >
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      {item.label || 'Update'}
                    </span>
                    <span className="max-w-[14rem] truncate">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {marqueeItems.length > 0 ? (
              <div className="relative border-t border-border/60 bg-background/55">
                <div className="flex min-w-max items-center gap-10 px-6 py-3 md:px-8 animate-marquee">
                  {marqueeItems.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex items-center gap-3 text-sm text-foreground/80"
                    >
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-primary-foreground">
                        {item.label || 'Update'}
                      </span>
                      <span className="whitespace-nowrap">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 md:px-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <div className="flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/85 px-4 py-2 shadow-sm backdrop-blur"
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Merit-first law placements
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="max-w-3xl"
            >
              <h1 className="text-[clamp(2.9rem,4.8vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-foreground">
                Where legal talent
                <br />
                meets{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-primary">opportunity.</span>
                  <span className="absolute bottom-3 left-0 right-0 -z-10 h-4 rounded-full bg-primary/16" />
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
            >
              LexAssess connects law students and young lawyers with leading firms,
              senior advocates, and legal teams through demonstrated ability,
              not college name or personal connections. One assessment. One
              interview. Real merit.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-8 flex flex-col gap-4 sm:flex-row"
            >
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full bg-primary px-8 text-sm font-semibold uppercase tracking-[0.22em] shadow-[0_18px_40px_-20px_rgba(217,119,6,0.9)] hover:bg-primary/90"
              >
                <Link to="/signup">
                  Give the Assessment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-border/70 bg-background/90 px-8 text-sm font-semibold uppercase tracking-[0.22em] text-foreground hover:bg-muted/60"
              >
                <Link to="/directory">For Law Firms</Link>
              </Button>
            </motion.div>

          </div>

          <div className="relative justify-self-end lg:pl-12">
            {pipelineSteps.map((step, idx) => (
              <PipelineStep key={step.number} {...step} index={idx} />
            ))}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 0.6 },
          y: {
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeInOut',
          },
        }}
        className="group absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-1 pointer-events-auto"
        onClick={() => {
          window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth',
          })
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-foreground">
          Scroll Down
        </span>
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
      </motion.div>
    </section>
  )
}
