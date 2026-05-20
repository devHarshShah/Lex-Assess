import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border-b border-border/60 py-4">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between py-2 text-left font-bold text-foreground hover:text-primary transition-colors text-base md:text-lg"
      >
        <span>{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className="overflow-hidden"
          >
            <p className="pb-4 pt-2 text-sm leading-relaxed text-muted-foreground">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const faqs = [
  {
    question: "What is Legal Reckoning?",
    answer: "Legal Reckoning is India's premier independent assessment and merit-based ranking platform designed to discover, evaluate, and showcase the sharpest legal minds. We aim to replace gatekeeping with pure meritocracy by ranking law students on actual capability rather than connections or college tags."
  },
  {
    question: "How is the assessment structured?",
    answer: "The assessment evaluates core competencies required for elite law practices, including commercial drafting, legal research precision, real-world case analysis, and structured logic. It is meticulously designed and benchmarked by industry veterans."
  },
  {
    question: "Is there a fee to take the assessment?",
    answer: "No. High-quality talent discovery should have zero barriers. Taking the core assessment and entering the rank-list is completely free for all verified law students in India."
  },
  {
    question: "How do recruiters and law firms use the platform?",
    answer: "Partnering law firms and corporate legal chambers gain direct access to our verified merit list, complete with breakdown scores, validated drafts, and comparative performance rankings, enabling them to hire the top 1% of legal talent directly."
  },
  {
    question: "How often are assessments conducted?",
    answer: "Assessments are run in seasonal cohorts. Once you register, you will be notified of the upcoming assessment date. Your score remains valid on the leaderboard for a single cohort cycle, and you can re-attempt in subsequent cycles to improve your rank."
  }
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="w-full bg-card py-16 border-y border-border/40">
      <div className="mx-auto w-full max-w-4xl px-6 md:px-12 lg:py-8">
        <div className="mb-12 text-center">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Everything you need to know about India's first standardized legal talent framework.
          </p>
        </div>

      <div className="flex flex-col border-t border-border/60">
        {faqs.map((faq, idx) => (
          <FAQItem
            key={idx}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === idx}
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
          />
        ))}
        </div>
      </div>
    </section>
  )
}
