import { motion } from 'framer-motion';
import { pillars } from './data';

export function ConvictionSection() {
  return (
    <section className="w-full bg-card py-16 border-y border-border/40">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
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
                The Assessment Paper
              </span>
            </div>
            <h2 className="mb-8 font-heading text-[clamp(2rem,3vw,3rem)] font-extrabold leading-tight tracking-tight text-foreground">
              Built for How Law is <span className="text-primary">Actually Practised</span>
            </h2>
            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p>
                Our assessments are not examinations of bare-act memory. They are structured simulations of real legal work — research under time pressure, drafting at short notice, and advising a senior on a nuanced question. AI tools are permitted because they are part of modern legal practice.
              </p>
              <p>
                Every paper is authored and reviewed by NLU faculty and senior practicing lawyers. A live research module requires candidates to find real case URLs and paste actual excerpts — making the paper impossible to complete without genuine engagement with legal databases.
              </p>
            </div>
          </motion.div>

          {/* Right Column */}
          <div>
            <div className="border-t border-border/60">
              {pillars.map((pillar, idx) => {
                return (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className="flex items-start gap-6 border-b border-border/60 py-8"
                  >
                    <div className="mt-1 text-primary shrink-0 text-xl font-bold font-serif w-6">
                      {pillar.num}
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
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
