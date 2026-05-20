import { motion } from 'framer-motion'
import { pillars } from './data'

export function ConvictionSection() {
  return (
    <section className="w-full bg-card py-16 border-y border-border/40">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-12">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-24">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 flex items-center gap-4">
              <span className="h-px w-12 bg-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Our Conviction
              </span>
            </div>
            <h2 className="mb-8 font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold leading-tight tracking-tight text-foreground">
              Built to Fix<br />
              What Was<br />
              <span className="text-primary">Always Broken.</span>
            </h2>
            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p>
                The gap between legal talent and legal opportunity in India is not
                accidental - it is structural. Resume-first hiring, college-name bias
                and opaque internship processes have for decades kept genuinely
                talented students invisible.
              </p>
              <p>
                Legal Reckoning is not a workaround. It is a replacement. A merit
                pipeline from assessment to ranked profile to internship offer - where
                every step is earned, every claim is verified, and every door is
                opened by performance alone.
              </p>
            </div>
          </motion.div>

          {/* Right Column */}
          <div>
            <div className="border-t border-border/60">
              {pillars.map((pillar, idx) => {
                const Icon = pillar.icon
                return (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className="flex items-start gap-6 border-b border-border/60 py-8"
                  >
                    <div className="mt-1 text-primary shrink-0">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground">
                        {pillar.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {pillar.description}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
