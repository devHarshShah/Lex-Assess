import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
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
  );
}

const faqs = [
  {
    question: 'Who can apply?',
    answer:
      'Any law student enrolled in a recognised 3-year LLB or 5-year integrated programme, or a recently qualified lawyer within 2 years of enrolment. There is no restriction on college or university.',
  },
  {
    question: 'Who sets and reviews the assessment papers?',
    answer:
      'Papers are authored and reviewed by NLU professors and senior practicing professionals with a minimum of 10 years of active practice in the relevant field. No paper is set by a generalist.',
  },
  {
    question: 'Who conducts the interview?',
    answer:
      'Every candidate who completes the assessment is scheduled for an interview with a practicing professional in their specific practice area — not a general HR panel. A Banking & Finance applicant is interviewed by a Banking & Finance lawyer.',
  },
  {
    question: 'Are AI tools really permitted in the assessment?',
    answer:
      'Yes. Candidates may use any AI tool, legal database, or online resource. The questions are designed to test legal judgment and applied reasoning — not the ability to recall section numbers.',
  },
  {
    question: 'How is the final result determined?',
    answer:
      'Your cumulative score combines the written assessment and expert interview. All criteria are published in advance. There are no undisclosed factors.',
  },
  {
    question: 'What do I receive on completing the internship?',
    answer:
      'A verified completion certificate, a supervisor performance evaluation, and your LexAssess score report with detailed feedback — all suitable for your CV and professional portfolio.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full bg-card py-16 border-y border-border/40" id="eligibility">
      <div className="mx-auto w-full max-w-4xl px-6 md:px-12 lg:py-8">
        <div className="mb-12 text-center">
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
            Common Questions
          </div>
          <h2 className="font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold tracking-tight text-foreground mb-4">
            Everything You Need to Know
          </h2>
          <div className="mx-auto h-0.5 w-10 bg-primary mt-6 mb-8"></div>
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
  );
}
