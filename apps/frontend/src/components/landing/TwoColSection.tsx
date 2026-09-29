import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

function Column({
  tag,
  title,
  description,
  steps,
  buttonLabel,
  filled,
}: {
  tag: string;
  title: string;
  description: string;
  steps: string[];
  buttonLabel?: string;
  filled?: boolean;
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
      {buttonLabel && (
        <Button
          asChild
          size="lg"
          variant={filled ? 'default' : 'outline'}
          className="w-full h-14 text-xs font-bold uppercase tracking-widest rounded-sm"
        >
          <Link to="/signup">{buttonLabel}</Link>
        </Button>
      )}
    </Card>
  );
}

export function TwoColSection() {
  return (
    <section
      id="internships"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-6 py-16 md:px-12"
    >
      <div className="mb-6 flex items-center justify-center gap-4">
        <span className="h-px w-12 bg-primary" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary text-center">
          Internship Formats
        </span>
        <span className="h-px w-12 bg-primary" />
      </div>
      <motion.h2 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold leading-tight tracking-tight text-foreground"
      >
        Two Ways to Intern.<br />
        <span className="text-primary">One Standard of Merit.</span>
      </motion.h2>
      <div className="grid overflow-hidden rounded-xl border border-border/60 bg-background lg:grid-cols-2">
        <Column
          tag="Online Internship"
          title="Remote Legal Work"
          description="Contribute to high-level research and drafting from anywhere. Ideal for students unable to travel but ready to deliver top-tier work."
          steps={[]}
          buttonLabel="Apply for Online"
          filled
        />
        <Column
          tag="Physical Internship"
          title="In-Chamber / In-Office"
          description="Work directly with practitioners in their chambers or firm offices. Experience the reality of legal practice on the ground."
          steps={[]}
        />
      </div>
    </section>
  );
}
