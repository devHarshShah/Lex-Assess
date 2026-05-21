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
            What Sets Us Apart
          </span>
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="mb-8 font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold leading-tight tracking-tight text-foreground"
        >
          Six Pillars.
          <br />
          <span className="text-primary">One Standard.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-16 max-w-xl text-lg leading-relaxed text-muted-foreground"
        >
          Every feature of LexAssess exists to eliminate one thing - the gap
          between legal talent and legal opportunity in India.
        </motion.p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <Card className="flex h-full flex-col p-8 border-border/50 bg-background shadow-sm hover:shadow-md transition-shadow rounded-md">
                  <div className="mb-6 inline-flex text-primary">
                    <Icon className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
