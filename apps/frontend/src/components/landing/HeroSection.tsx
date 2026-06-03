import { motion } from 'framer-motion';

export function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 relative overflow-hidden bg-white">
      {/* Top Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[linear-gradient(90deg,transparent_0%,var(--gold)_30%,var(--gold-light)_50%,var(--gold)_70%,transparent_100%)]" />
      
      {/* Background Text */}
      <div className="absolute font-serif text-[clamp(120px,18vw,220px)] font-bold text-gold-pale top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none select-none opacity-45 tracking-[-4px] z-0">
        LEX
      </div>

      <div className="relative z-10 max-w-[860px]">
        <motion.p 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-sans text-[10px] font-semibold tracking-[3px] uppercase text-gold mb-7"
        >
          India's Merit-Based Legal Internship Platform
        </motion.p>
        
        <motion.h1 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="font-serif text-[clamp(44px,7vw,80px)] font-semibold leading-[1.1] text-ink mb-2.5 tracking-[-1px]"
        >
          Where Legal Talent<br />Meets <em className="not-italic text-gold italic">Opportunity</em>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.38 }}
          className="font-serif text-[clamp(18px,2.5vw,26px)] font-normal italic text-ink-muted mb-8 leading-[1.4]"
        >
          Earn your internship. Prove your skill.
        </motion.p>

        <motion.p 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-[15px] font-light text-ink-mid max-w-[600px] mx-auto mb-11 leading-[1.8]"
        >
          LexAssess connects law students and young lawyers with leading firms, senior advocates, and legal teams — not through connections or college names, but through demonstrated legal ability. One assessment. One interview. Real merit.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.62 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <a href="#apply" className="text-[11px] font-semibold tracking-[2px] uppercase bg-gold text-white px-10 py-4 no-underline transition-all hover:bg-ink hover:-translate-y-0.5">
            Take the Assessment
          </a>
          <a href="#how" className="text-[11px] font-semibold tracking-[2px] uppercase bg-transparent text-gold border border-gold-line px-10 py-[15px] no-underline transition-all hover:bg-gold-pale">
            How It Works
          </a>
        </motion.div>
        
        <div className="w-[60px] h-px bg-gold-line mx-auto mt-14" />
      </div>
    </section>
  );
}
