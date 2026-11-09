// The paper shape the MCP tools accept, and its conversion into the payload the
// paper builder already saves through (QuestionPapersService.updateVersion).
// Kept free of Nest/Prisma so it can be unit-tested directly.

import { z } from 'zod';
import { QuestionType } from '@prisma/client';
import type { SectionDto } from '../question-papers/question-papers.service';

const mcqSchema = z.object({
  type: z.literal('MCQ'),
  text: z.string().min(1).describe('Question stem, without the "Q1." label'),
  marks: z.number().int().min(0),
  options: z
    .array(z.string().min(1))
    .min(2)
    .max(8)
    .describe(
      'Option texts in order, without "(A)" labels. They become options A, B, C...',
    ),
  answer: z
    .string()
    .optional()
    .describe(
      'The correct option, copied exactly from `options` (not a letter). Omit if the source has no answer key.',
    ),
  timeLimitSeconds: z.number().int().min(1).optional(),
});

const subQuestionSchema = z.object({
  text: z
    .string()
    .min(1)
    .describe('Sub-question text, conventionally starting "### (a)\\n"'),
  marks: z.number().int().min(0),
});

const subjectiveSchema = z.object({
  type: z.literal('SUBJECTIVE'),
  text: z
    .string()
    .min(1)
    .describe('Full question text: facts and the call of the question'),
  marks: z
    .number()
    .int()
    .min(0)
    .describe(
      'Total marks; must equal the sum of subQuestions marks when there are any',
    ),
  subQuestions: z.array(subQuestionSchema).optional(),
});

const sectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  rules: z
    .object({
      allowTabSwitching: z.boolean().optional(),
      allowExternalResources: z.boolean().optional(),
      maxViolations: z.number().int().min(1).optional(),
      wordLimit: z.number().int().min(1).optional(),
      timeLimitSeconds: z.number().int().min(1).optional(),
      questionsToAttempt: z.number().int().min(1).optional(),
    })
    .optional(),
  questions: z
    .array(z.discriminatedUnion('type', [mcqSchema, subjectiveSchema]))
    .min(1),
});

export const paperContentShape = {
  title: z
    .string()
    .min(1)
    .describe('Paper title, e.g. "Legal Tech Law Assessment Examination"'),
  description: z
    .string()
    .optional()
    .describe('One-sentence summary shown on the paper card'),
  timeLimitMinutes: z.number().int().min(1).max(600),
  instructions: z
    .string()
    .min(1)
    .describe('Markdown instructions shown before the paper starts'),
  sections: z.array(sectionSchema).min(1),
};

export const paperContentSchema = z.object(paperContentShape);
export type PaperContent = z.infer<typeof paperContentSchema>;

export interface ConvertedPaper {
  sections: SectionDto[];
  summary: {
    questionCount: number;
    totalMarks: number;
    sections: {
      title: string;
      questions: number;
      marks: number;
      questionsToAttempt?: number;
    }[];
    mcqsWithoutAnswer: string[];
  };
}

/** Throws an Error listing every problem found, so Claude can fix them all in one retry. */
export function convertPaper(content: PaperContent): ConvertedPaper {
  const problems: string[] = [];
  const mcqsWithoutAnswer: string[] = [];
  let questionCount = 0;
  let totalMarks = 0;

  const sections: SectionDto[] = content.sections.map((section, sIndex) => {
    const label = `Section ${sIndex + 1} ("${section.title}")`;
    const attempt = section.rules?.questionsToAttempt;
    if (attempt && attempt > section.questions.length) {
      problems.push(
        `${label}: questionsToAttempt is ${attempt} but it has only ${section.questions.length} question(s)`,
      );
    }

    let sectionMarks = 0;
    const questions = section.questions.map((q, qIndex) => {
      const qLabel = `${label} Q${qIndex + 1}`;
      questionCount += 1;
      sectionMarks += q.marks;

      if (q.type === 'MCQ') {
        const options = q.options.map((text, i) => ({
          id: String.fromCharCode(65 + i),
          text: text.trim(),
        }));
        let answer: string | undefined;
        if (q.answer === undefined || q.answer.trim() === '') {
          mcqsWithoutAnswer.push(qLabel);
        } else {
          const index = options.findIndex((o) => o.text === q.answer!.trim());
          if (index === -1) {
            problems.push(
              `${qLabel}: answer "${q.answer}" does not exactly match any option`,
            );
          } else {
            answer = options[index]!.id;
          }
        }
        return {
          type: QuestionType.MCQ,
          text: q.text,
          marks: q.marks,
          options,
          answer,
          order: qIndex + 1,
          timeLimitSeconds: q.timeLimitSeconds,
        };
      }

      const subQuestions = q.subQuestions ?? [];
      if (subQuestions.length > 0) {
        const subTotal = subQuestions.reduce((sum, sq) => sum + sq.marks, 0);
        if (subTotal !== q.marks) {
          problems.push(
            `${qLabel}: sub-question marks add up to ${subTotal}, but the question is worth ${q.marks}`,
          );
        }
      }
      return {
        type: QuestionType.SUBJECTIVE,
        text: q.text,
        marks: q.marks,
        order: qIndex + 1,
        subQuestions: subQuestions.map((sq, i) => ({
          type: QuestionType.SUBJECTIVE,
          text: sq.text,
          marks: sq.marks,
          order: i + 1,
        })),
      };
    });

    // With "attempt any N", a candidate can score at most N of the questions.
    if (attempt && attempt < section.questions.length) {
      const top = [...section.questions]
        .map((q) => q.marks)
        .sort((a, b) => b - a)
        .slice(0, attempt);
      totalMarks += top.reduce((sum, m) => sum + m, 0);
    } else {
      totalMarks += sectionMarks;
    }

    return {
      title: section.title,
      description: section.description,
      order: sIndex + 1,
      rules: section.rules,
      questions,
    };
  });

  if (problems.length > 0) {
    throw new Error(
      `The paper has ${problems.length} problem(s):\n- ${problems.join('\n- ')}`,
    );
  }

  return {
    sections,
    summary: {
      questionCount,
      totalMarks,
      sections: content.sections.map((s) => ({
        title: s.title,
        questions: s.questions.length,
        marks: s.questions.reduce((sum, q) => sum + q.marks, 0),
        questionsToAttempt: s.rules?.questionsToAttempt,
      })),
      mcqsWithoutAnswer,
    },
  };
}

export const PAPER_FORMAT_GUIDE = `
# LexAssess paper format

Call create_paper_draft with: categoryId (from list_categories), title, description, timeLimitMinutes, instructions (markdown), sections[].

## Rules
- Copy question text faithfully from the source. Fix only obvious typos, and tell the user which ones.
- Do not number questions ("Q1.") or letter options ("(A)"). Order is taken from array position.
- MCQ: "options" is the list of option texts; "answer" is the correct option copied EXACTLY from "options". If the source has no answer key, work out the answer, then tell the user these answers are your own and need checking. Omit "answer" only if you cannot determine it.
- SUBJECTIVE with parts: put the facts in "text" and each part in subQuestions as "### (a)\\n<text>". The parent's marks must equal the sum of its parts.
- "Attempt any N of M": set rules.questionsToAttempt = N on that section.
- Drop exam-sheet furniture: roll number boxes, supervisor signature, page headers/footers, copyright lines.
- Everything is saved as a DRAFT. An admin reviews it (especially the answer key) and publishes it in the panel. You cannot publish.

## House conventions (follow unless the source says otherwise)
- Section A — MULTIPLE CHOICE QUESTIONS: closed-book and proctored. rules = { "allowTabSwitching": false, "allowExternalResources": false, "maxViolations": 5, "timeLimitSeconds": <60 x number of MCQs> }. Usually 2 marks each.
- Section B — DESCRIPTIVE QUESTIONS: research allowed. rules = { "allowTabSwitching": true, "allowExternalResources": true, "questionsToAttempt": N }.
- Descriptive question text often starts with a short title: "QUESTION 1 — <topic>\\n\\n<facts>\\n\\n<call of the question>".
- timeLimitMinutes is usually 180.
- Section descriptions look like: "Knowledge Test - 10 MCQs | 20 Marks. Closed-book, proctored." and "Research & Analysis - Attempt any 4 of 8 questions | 80 Marks. Research is permitted and expected."

## Instructions template (adapt the counts, marks, subject and prerequisites)
${'```'}markdown
# LexAssess — Assessment Instructions & Guidelines

## OVERVIEW OF THE ASSESSMENT

The LexAssess examination has been designed to evaluate you at three distinct levels:
1. Knowledge
2. Research & Analysis
3. Interview Performance

Your final rank is determined by your combined performance across all three stages.
This question paper tests the first two levels:
- Knowledge (Section A)
- Research & Analysis (Section B)

---

# SECTION A — MULTIPLE CHOICE QUESTIONS
**10 MCQs | 20 Marks**
This section tests your foundational knowledge of <Subject>.

### Format
- 10 Multiple Choice Questions (MCQs)
- 2 marks each
- Total: 20 marks

### Time Allocation
- 60 seconds per question
- Total time: 10 minutes

### Key Rules
- You cannot use external resources.
- No websites, documents, or reference materials may be opened.
- You cannot navigate away from the question paper.
- Opening another browser tab, website, or application will register as an unfair practice.
- The paper will automatically close after 5 violations.
- Section A must be attempted in one sitting.

---

# SECTION B — DESCRIPTIVE QUESTIONS
**4 Questions | 80 Marks**
This section tests your ability to apply knowledge, conduct legal research, and analyse case scenarios. Research is permitted and expected.

### Format
- <M> descriptive questions offered (Attempt any 4 out of <M>)
- 20 marks each
- Total: 80 marks

### Time Allocation
- Total paper time: 3 hours
- Suggested Section B: 170 minutes

### Key Rules
- Research is permitted. Internet, legal databases, and statutes may be consulted.
- <Any notes or common instructions from the source paper, word for word>

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: <statutes and frameworks the paper relies on>.
${'```'}
`.trim();
