import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PAPER_TITLE = 'Capital Markets Law Assessment Examination';
const PAPER_DESCRIPTION =
  'Comprehensive assessment covering the SEBI Act, 1992, SAST, ICDR, PIT, PFUTP, LODR, Delisting and AIF Regulations, and the Companies Act.';

// 60 seconds per MCQ, same as the other practice-area papers.
const SECONDS_PER_MCQ = 60;
const TOTAL_MARKS = 100;

type Mcq = { text: string; options: [string, string, string, string]; answer: 'A' | 'B' | 'C' | 'D' };

// Answer key is not printed on the question paper; verify before publishing.
const mcqs: Mcq[] = [
  {
    text: 'Under Regulation 3(1) of the SEBI (SAST) Regulations, 2011, a mandatory open offer is triggered when an acquirer, together with persons acting in concert, acquires shares or voting rights entitling them to exercise at least what percentage of the voting rights in a listed target company?',
    options: ['15% or more', '20% or more', '25% or more', '26% or more'],
    answer: 'C',
  },
  {
    text: 'Under the SEBI (Delisting of Equity Shares) Regulations, 2021, where the price discovered through reverse book building is higher than the floor price (or the indicative price, if specified), the acquirer is:',
    options: [
      'Bound to accept the discovered price in all cases',
      "Required to obtain SEBI's approval for the discovered price",
      'Required to pay a premium of at least 25% over the discovered price',
      'Free to accept or reject the discovered price, and may make a counter-offer',
    ],
    answer: 'D',
  },
  {
    text: 'A voluntary delisting offer through reverse book building under the SEBI (Delisting of Equity Shares) Regulations, 2021 succeeds only if, after the offer, the shareholding of the acquirer together with persons acting in concert reaches at least:',
    options: ['90%', '75%', '51%', '95%'],
    answer: 'A',
  },
  {
    text: 'Under Regulation 29 of the SEBI (SAST) Regulations, 2011, an acquirer whose acquisition takes its holding (with existing shares) to 5% or more of the shares or voting rights in a target company must make the prescribed disclosure within:',
    options: [
      '24 hours of the acquisition',
      'Two working days of the acquisition or of receipt of intimation of allotment',
      'Seven working days of the acquisition',
      'Twenty-one days of the acquisition',
    ],
    answer: 'B',
  },
  {
    text: 'Under Regulation 7(1) of the SEBI (SAST) Regulations, 2011, an open offer to the public shareholders must be made for at least what percentage of the total shares of the target company?',
    options: ['10%', '20%', '26%', '51%'],
    answer: 'C',
  },
  {
    text: "Under Regulation 2(1)(d) of the SEBI (Prohibition of Insider Trading) Regulations, 2015, a person who is, or has been at any time during a specified look-back period before the concerned act, associated with a company in a capacity that allows access to unpublished price sensitive information is a 'connected person'. The look-back period is:",
    options: ['3 months', '12 months', '24 months', '6 months'],
    answer: 'D',
  },
  {
    text: 'Under Regulation 7(2) of the SEBI (PIT) Regulations, 2015, promoters, members of the promoter group, designated persons and directors must make continual disclosure to the company where the traded value of their trades in securities, over any calendar quarter, exceeds:',
    options: ['Rs. 1 lakh', 'Rs. 10 lakh', 'Rs. 25 lakh', 'Rs. 1 crore'],
    answer: 'B',
  },
  {
    text: 'A person aggrieved by an order of SEBI may appeal to the Securities Appellate Tribunal under Section 15T of the SEBI Act, 1992 within how many days of receiving a copy of the order (subject to condonation of delay for sufficient cause)?',
    options: ['45 days', '30 days', '60 days', '90 days'],
    answer: 'A',
  },
  {
    text: 'A further appeal against a decision or order of the Securities Appellate Tribunal lies to the Supreme Court under Section 15Z of the SEBI Act, 1992:',
    options: [
      'On any question of fact or law, within 90 days',
      'On any question of fact only, within 30 days',
      'Only by way of a special leave petition, as no statutory appeal exists',
      'On any question of law arising out of the order, within 60 days',
    ],
    answer: 'D',
  },
  {
    text: 'Under Section 15G of the SEBI Act, 1992, the penalty for insider trading is:',
    options: [
      'Rs. 1 lakh to Rs. 1 crore',
      'Rs. 5 lakh to Rs. 5 crore',
      'Not less than Rs. 10 lakh, extendable to Rs. 25 crore or three times the profit made, whichever is higher',
      'A fixed penalty of Rs. 25 crore',
    ],
    answer: 'C',
  },
  {
    text: 'Under Section 4 of the SEBI Act, 1992, the SEBI Board consists of how many members in total, including the Chairman?',
    options: ['7', '9', '11', '13'],
    answer: 'B',
  },
  {
    text: "An investor acquires, under a shareholders' agreement, the right to appoint a majority of the directors of a listed company, without acquiring shares that take it past 25%. Under the SEBI (SAST) Regulations, 2011:",
    options: [
      'No open offer is required because the 25% threshold is not crossed',
      'Only a disclosure under Regulation 29 is required',
      "An open offer is triggered under Regulation 4 irrespective of shareholding, as the investor acquires 'control'",
      'An open offer arises only if SEBI so directs',
    ],
    answer: 'C',
  },
  {
    text: 'Under Regulation 30 of the SEBI (LODR) Regulations, 2015, the outcome of a board meeting that decides on matters such as dividend or buy-back must be disclosed to the stock exchanges within:',
    options: [
      '30 minutes of the closure of the meeting',
      '2 hours of the closure of the meeting',
      '12 hours of the closure of the meeting',
      '24 hours of the closure of the meeting',
    ],
    answer: 'A',
  },
  {
    text: 'Under Regulation 33 of the SEBI (LODR) Regulations, 2015, a listed entity must submit its quarterly financial results (other than for the last quarter of the financial year) to the stock exchange within:',
    options: [
      '21 days from the end of the quarter',
      '30 days from the end of the quarter',
      '60 days from the end of the quarter',
      '45 days from the end of the quarter',
    ],
    answer: 'D',
  },
  {
    text: 'Under Regulation 18 of the SEBI (LODR) Regulations, 2015, the audit committee of a listed entity must have a minimum of:',
    options: [
      'Two directors, with a majority being independent directors',
      'Three directors, with two-thirds being independent directors',
      'Three directors, with a majority being independent directors',
      'Five directors, all being independent directors',
    ],
    answer: 'B',
  },
  {
    text: 'Under Regulation 17(1)(b) of the SEBI (LODR) Regulations, 2015, where the listed entity does not have a regular non-executive Chairperson, at least what proportion of the board must consist of independent directors?',
    options: ['One-half', 'One-third', 'Two-thirds', 'Three-fourths'],
    answer: 'A',
  },
  {
    text: 'Under Regulation 6(1) of the SEBI (ICDR) Regulations, 2018, an issuer seeking an IPO on the profitability track record route must have an average operating profit (restated and consolidated), over the preceding three years, of at least:',
    options: ['Rs. 5 crore', 'Rs. 10 crore', 'Rs. 25 crore', 'Rs. 15 crore'],
    answer: 'D',
  },
  {
    text: 'An issuer that does not satisfy the profitability track record requirement of Regulation 6(1) of the SEBI (ICDR) Regulations, 2018 may still make an IPO through book building, provided at least what percentage of the net offer is allotted to Qualified Institutional Buyers?',
    options: ['25%', '50%', '75%', '100%'],
    answer: 'C',
  },
  {
    text: 'Under the SEBI (Alternative Investment Funds) Regulations, 2012, a venture capital fund is classified as:',
    options: [
      'Category I AIF',
      'Category II AIF',
      'Category III AIF',
      'None of these, as venture capital funds are outside the AIF framework',
    ],
    answer: 'A',
  },
  {
    text: 'Under Section 68 of the Companies Act, 2013, a company may buy back its own shares, with the approval of shareholders by special resolution, up to what maximum percentage of the aggregate of its total paid-up capital and free reserves in a financial year?',
    options: ['10%', '25%', '50%', '15%'],
    answer: 'B',
  },
];

type Descriptive = {
  text: string;
  marks: number;
  subQuestions: { text: string; marks: number }[];
};

const descriptiveQuestions: Descriptive[] = [
  {
    text: "Your senior is advising a company on an IPO. The CFO asks:\n\n> 'What is the current minimum promoter contribution and lock-in requirement post-IPO? I heard SEBI changed this recently.'",
    marks: 16,
    subQuestions: [
      {
        text: '### (a)\nState the minimum promoter contribution percentage and the current lock-in period under the SEBI (ICDR) Regulations, 2018, as amended. Has SEBI reduced the lock-in period recently? If yes, mention the exact source URL with the regulation number.',
        marks: 10,
      },
      { text: '### (b)\nDraft a 3-line WhatsApp message to the CFO confirming the current position.', marks: 6 },
    ],
  },
  {
    text: "A listed company's Managing Director wants to purchase 5,000 shares of his own company. The last board meeting was 10 days ago, where the Q3 results were discussed but not approved. Your senior asks: 'Can he trade now?'",
    marks: 16,
    subQuestions: [
      {
        text: '### (a)\nUnder the SEBI (PIT) Regulations, 2015, when does the trading window close and re-open around board meetings discussing financial results? Mention the exact source of your answer.',
        marks: 6,
      },
      { text: '### (b)\nCan the MD trade today? Give a clear recommendation with reasoning.', marks: 10 },
    ],
  },
  {
    text: "Your firm's client has received a SEBI Show Cause Notice for alleged 'price manipulation' under the SEBI (Prohibition of Fraudulent and Unfair Trade Practices) Regulations, 2003 (PFUTP). Your senior asks:\n\n> 'Find me the most recent SEBI order defining manipulation in algorithmic trading.'",
    marks: 16,
    subQuestions: [
      {
        text: '### (a)\nWhat constitutes manipulation under Regulation 4 of the SEBI (PFUTP) Regulations? List the specific acts under Regulation 4(2), and explain whether and how spoofing and layering are caught.',
        marks: 5,
      },
      {
        text: '### (b)\nCite one SEBI Adjudication Order or SAT judgment from 2021 onwards on algorithmic trading manipulation. State the key finding and give the URL of the order or judgment.',
        marks: 5,
      },
      {
        text: '### (c)\nState the strongest general defence available to a company receiving a PFUTP notice for algorithmic trading, and the impact it is likely to have. (250 words maximum)',
        marks: 6,
      },
    ],
  },
  {
    text: "Your senior is advising a VC fund on investing in a start-up that may list in 2 years. She asks:\n\n> 'Research the current SEBI rules on pre-IPO placement: who can invest, lock-in period, and changes to anchor investor and QIB rules post-2021. I need a note in an hour.'",
    marks: 16,
    subQuestions: [
      {
        text: '### (a)\nWho can participate in a pre-IPO placement? What is the maximum allocation? What is the lock-in period for pre-IPO investors under the SEBI (ICDR) Regulations? Mention the exact source of your answer.',
        marks: 8,
      },
      {
        text: '### (b)\nWhat changed for anchor investor lock-in after the 2021 SEBI amendment? State the staggered lock-in periods. Mention the URL of the 2021 amendment and the exact provision from which you are answering.',
        marks: 8,
      },
    ],
  },
  {
    text: "A client's promoters have been buying shares in small quantities over 52 weeks and have crossed a threshold. SEBI has issued a creeping acquisition notice. Your senior asks you to research the creeping acquisition limits urgently.",
    marks: 16,
    subQuestions: [
      {
        text: '### (a)\nUnder the SEBI (SAST) Regulations, 2011, what is the maximum percentage a promoter holding above 25% can acquire in a financial year without triggering an open offer? Mention the exact source of your answer.',
        marks: 4,
      },
      {
        text: '### (b)\nWhat is the maximum permissible non-public shareholding? What happens if the promoter crosses it? Mention the exact source of your answer.',
        marks: 4,
      },
      {
        text: '### (c)\nAdvise the client: (i) Have they violated the rule? (ii) What is the consequence? (iii) What is the cure: voluntary open offer or compounding? (200 words maximum)',
        marks: 8,
      },
    ],
  },
];

const instructions = `
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

# SECTION A — KNOWLEDGE TEST
**20 MCQs | 20 Marks**
This section tests your foundational knowledge of Capital Markets Law.

### Format
- 20 Multiple Choice Questions (MCQs)
- 1 mark each
- Total: 20 marks
- Choose the single most correct option. No negative marking.

### Time Allocation
- 60 seconds per question
- Total time: 20 minutes

### Key Rules
- You cannot use external resources.
- No websites, documents, or reference materials may be opened.
- You cannot navigate away from the question paper.
- Opening another browser tab, website, or application will register as an unfair practice.
- The paper will automatically close after 5 violations.
- Section A must be attempted in one sitting.

---

# SECTION B — RESEARCH & ANALYSIS
**5 Questions | 80 Marks**
This section tests your ability to apply knowledge, conduct legal research, and analyse case scenarios. Research is permitted and expected.

### Format
- Five descriptive questions (all compulsory)
- 16 marks each
- Total: 80 marks

### Time Allocation
- Total paper time: 3 hours

### Key Rules
- Research is permitted. Internet, legal databases, and statutes may be consulted.
- Cite specific provisions, regulations and source URLs wherever asked. Generic theoretical answers will not receive full marks.
- Respect the word limits stated in individual questions.
- All five questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Answer in the context of Indian law, as amended up to the date of the examination, unless otherwise stated.
- Knowledge Prerequisites: SEBI Act 1992, SAST, ICDR, PIT, PFUTP, LODR Regulations, Companies Act 2013.
`.trim();

async function main() {
  console.log('Starting seeding capital markets law practice area...');

  // Attemptable marks must add up to 100 (all five Section B questions are compulsory).
  const sectionAMarks = mcqs.length;
  const sectionBMarks = descriptiveQuestions.reduce((sum, q) => sum + q.marks, 0);
  for (const q of descriptiveQuestions) {
    const subTotal = q.subQuestions.reduce((sum, s) => sum + s.marks, 0);
    if (subTotal !== q.marks) {
      throw new Error(`Sub-question marks (${subTotal}) do not match parent marks (${q.marks})`);
    }
  }
  if (sectionAMarks + sectionBMarks !== TOTAL_MARKS) {
    throw new Error(`Paper totals ${sectionAMarks + sectionBMarks} marks, expected ${TOTAL_MARKS}`);
  }

  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'Capital Markets' },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const existingPaper = await prisma.questionPaper.findFirst({
    where: { title: PAPER_TITLE, specializationId: specialization.id },
  });
  const paper = existingPaper
    ? await prisma.questionPaper.update({
        where: { id: existingPaper.id },
        data: { description: PAPER_DESCRIPTION },
      })
    : await prisma.questionPaper.create({
        data: {
          specializationId: specialization.id,
          title: PAPER_TITLE,
          description: PAPER_DESCRIPTION,
        },
      });

  console.log(`Using paper: ${paper.title} (${paper.id})`);

  const version = await prisma.questionPaperVersion.upsert({
    where: { paperId_versionName: { paperId: paper.id, versionName: 'V1' } },
    update: { status: PaperStatus.PUBLISHED, timeLimitMinutes: 180, instructions },
    create: {
      paperId: paper.id,
      versionName: 'V1',
      status: PaperStatus.PUBLISHED,
      timeLimitMinutes: 180,
      instructions,
    },
  });

  await prisma.paperSection.deleteMany({ where: { versionId: version.id } });
  await prisma.question.deleteMany({ where: { versionId: version.id } });

  const sectionA = await prisma.paperSection.create({
    data: {
      versionId: version.id,
      title: 'SECTION A — MULTIPLE CHOICE QUESTIONS',
      description:
        'Knowledge Test - 20 MCQs | 20 Marks. This section tests your foundational knowledge of Capital Markets Law. Closed-book, proctored.',
      order: 1,
      rules: {
        allowTabSwitching: false,
        allowExternalResources: false,
        maxViolations: 5,
        timeLimitSeconds: mcqs.length * SECONDS_PER_MCQ,
      },
    },
  });

  const sectionB = await prisma.paperSection.create({
    data: {
      versionId: version.id,
      title: 'SECTION B — DESCRIPTIVE / APPLIED QUESTIONS',
      description:
        'Research & Analysis - All 5 questions compulsory | 80 Marks. Research is permitted and expected.',
      order: 2,
      rules: {
        allowTabSwitching: true,
        allowExternalResources: true,
        questionsToAttempt: descriptiveQuestions.length,
      },
    },
  });

  for (const [index, q] of mcqs.entries()) {
    await prisma.question.create({
      data: {
        versionId: version.id,
        sectionId: sectionA.id,
        type: QuestionType.MCQ,
        text: q.text,
        marks: 1,
        options: q.options.map((text, i) => ({ id: String.fromCharCode(65 + i), text })),
        answer: q.answer,
        order: index + 1,
      },
    });
  }

  for (const [index, q] of descriptiveQuestions.entries()) {
    const parentQuestion = await prisma.question.create({
      data: {
        versionId: version.id,
        sectionId: sectionB.id,
        type: QuestionType.SUBJECTIVE,
        text: q.text,
        marks: q.marks,
        order: index + 1,
      },
    });

    for (const [subIndex, sub] of q.subQuestions.entries()) {
      await prisma.question.create({
        data: {
          versionId: version.id,
          sectionId: sectionB.id,
          parentId: parentQuestion.id,
          type: QuestionType.SUBJECTIVE,
          text: sub.text,
          marks: sub.marks,
          order: subIndex + 1,
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
