import { motion } from 'framer-motion';
import { features } from './data';
import { Card } from '@/components/ui/card';

export function FeaturesSection() {
  return (
    <section className="w-full bg-card py-16 border-y border-border/40">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-12">
        <div className="mb-6 flex items-center gap-4">
          <span className="h-px w-12 bg-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            How Your Score Is Calculated
          </span>
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="mb-8 font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold leading-tight tracking-tight text-foreground"
        >
          Assessment + Interview =
          <br />
          <span className="text-primary">Your Result.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-16 max-w-xl text-lg leading-relaxed text-muted-foreground"
        >
          Two independent evaluations. One cumulative score. Fully transparent at every stage.
        </motion.p>

        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          {features.map((feature, idx) => {
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <Card className="flex h-full flex-col p-8 border-border/50 bg-background shadow-sm hover:shadow-md transition-shadow rounded-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-12 bg-primary"></div>
                  <div className="mb-4 text-primary text-4xl font-bold font-serif opacity-30">
                    {feature.number}
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-6 flex-grow">
                    {feature.description}
                  </p>
                  <div className="inline-block border border-primary/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary w-fit">
                    {feature.tag}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
