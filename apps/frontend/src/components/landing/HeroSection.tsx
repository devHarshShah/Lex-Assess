import { motion } from 'framer-motion';
import { pipelineSteps } from './data';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

function PipelineStep({
  number,
  pill,
  title,
  description,
  index,
}: {
  number: string;
  pill: string;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
      className="flex gap-6 border-b border-border/60 py-6 first:pt-0 last:border-0"
    >
      <div className="shrink-0 text-3xl font-bold tracking-tighter text-primary">
        {number}
      </div>
      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            {pill}
          </span>
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen w-full flex-col justify-center items-center overflow-hidden px-6 pt-28 pb-20 md:px-12">
      <div className="mx-auto w-full max-w-6xl flex-1 flex items-center">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24 w-full">
          {/* Left Column: Headlines */}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-[clamp(3.5rem,6vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
                Where Legal Talent
                <br />
                Meets
                <br />
                <span className="relative inline-block mt-2">
                  <span className="relative z-10 text-primary">Opportunity.</span>
                  <span className="absolute bottom-2 left-0 right-0 -z-10 h-3 bg-primary/20 rounded-full" />
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-10 max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              LexAssess connects law students and young lawyers with leading firms, senior advocates, and legal teams — not through connections or college names, but through demonstrated legal ability. One assessment. One interview. Real merit.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="h-14 px-8 text-sm font-bold uppercase tracking-widest rounded-sm"
              >
                Give the Assessment
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-sm font-bold uppercase tracking-widest rounded-sm border-2 border-foreground/10 text-foreground hover:bg-foreground/5"
              >
                For Law Firms
              </Button>
            </motion.div>
          </div>

          {/* Right Column: Steps */}
          <div className="relative lg:pl-12">
            {pipelineSteps.map((step, idx) => (
              <PipelineStep key={step.number} {...step} index={idx} />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
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
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer pointer-events-auto z-20 group"
        onClick={() => {
          window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth',
          });
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
          Scroll Down
        </span>
        <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </motion.div>
    </section>
  );
}
