import { motion } from 'framer-motion'
import { tracks } from './data'
import { Card } from '@/components/ui/card'

export function TracksSection() {
  return (
    <section
      id="practice-areas"
      className="w-full scroll-mt-24 bg-muted/20 py-16 border-y border-border/40"
    >
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
        <div className="mb-6 flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary text-center">
            Practice Areas
          </span>
          <span className="h-px w-12 bg-primary" />
        </div>
      <motion.h2 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
        className="mb-6 text-center font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold leading-tight tracking-tight text-foreground"
      >
        Eleven Tracks & <span className="text-primary">Growing.</span>
      </motion.h2>
      <motion.p 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto mb-16 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground"
      >
        Choose the practice area that matches your ambition. Each track has its own expert-authored paper and dedicated interview panel.
      </motion.p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track, idx) => {
          return (
            <motion.div
              key={track.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              <Card className="flex h-full flex-col p-8 border-border/50 bg-background hover:bg-muted/30 transition-colors shadow-none rounded-md">
                <div className="mb-5 text-primary text-xl font-bold font-serif">
                  {track.roman}
                </div>
                <h3 className="mb-3 text-lg font-bold tracking-tight text-foreground">{track.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {track.description}
                </p>
              </Card>
            </motion.div>
          )
        })}
        </div>
      </div>
    </section>
  )
}
