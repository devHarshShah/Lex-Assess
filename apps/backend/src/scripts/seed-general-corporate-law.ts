import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding general corporate law practice area...');

  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'General Corporate' },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const paper = await prisma.questionPaper.upsert({
    where: {
      id:
        (
          await prisma.questionPaper.findFirst({
            where: { title: 'General Corporate Law Assessment Examination', specializationId: specialization.id },
          })
        )?.id || 'placeholder-id-for-create',
    },
    update: {
      description: 'Comprehensive assessment covering the Companies Act 2013 (oppression/mismanagement, class actions, director appointment/removal) and SEBI regulations (insider trading, takeovers, fraudulent trade practices).',
    },
    create: {
      specializationId: specialization.id,
      title: 'General Corporate Law Assessment Examination',
      description: 'Comprehensive assessment covering the Companies Act 2013 (oppression/mismanagement, class actions, director appointment/removal) and SEBI regulations (insider trading, takeovers, fraudulent trade practices).',
    },
  });

  console.log(`Using paper: ${paper.title} (${paper.id})`);

  // Source PDF has no marks, no duration, and no candidate-info table anywhere (unlike every
  // other paper). Per direction, the platform's standard scheme is applied: 10 MCQs x 2 marks
  // = 20, 4 compulsory descriptive questions x 20 marks = 80, 100 total, 180-minute time limit.
  // Sub-question mark splits within each descriptive question are likewise an inferred default
  // (the source gives no marks anywhere) following the same a/b/c weighting pattern used across
  // the other papers.
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
**10 MCQs | 20 Marks**
This section tests your foundational knowledge of General Corporate Law.

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

# SECTION B — RESEARCH & ANALYSIS
**4 Questions | 80 Marks**
This section tests your ability to apply knowledge, conduct legal research, and analyse case scenarios. Research is permitted and expected.

### Format
- Four long-form questions, all compulsory
- 20 marks each
- Total: 80 marks

### Time Allocation
- Total paper time: 3 hours
- Suggested Section B: 170 minutes

### Key Rules
- Research is permitted. Internet, legal databases, and statutes may be consulted.
- Cite the applicable Act, Section, and Regulation wherever applicable.
- All four questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: Companies Act 2013, SEBI (Prohibition of Insider Trading) Regulations 2015, SEBI (SAST) Regulations 2011, SEBI (PFUTP) Regulations 2003.
  `.trim();

  const version = await prisma.questionPaperVersion.upsert({
    where: {
      paperId_versionName: {
        paperId: paper.id,
        versionName: 'V1',
      },
    },
    update: {
      status: PaperStatus.PUBLISHED,
      timeLimitMinutes: 180,
      instructions: instructions,
    },
    create: {
      paperId: paper.id,
      versionName: 'V1',
      status: PaperStatus.PUBLISHED,
      timeLimitMinutes: 180,
      instructions: instructions,
    },
  });

  await prisma.paperSection.deleteMany({ where: { versionId: version.id } });
  await prisma.question.deleteMany({ where: { versionId: version.id } });

  const sectionA = await prisma.paperSection.create({
    data: {
      versionId: version.id,
      title: 'SECTION A — MULTIPLE CHOICE QUESTIONS',
      description: 'Knowledge Test - 10 MCQs | 20 Marks. This section tests your foundational knowledge of General Corporate Law. Closed-book, proctored.',
      order: 1,
      rules: {
        allowTabSwitching: false,
        allowExternalResources: false,
        maxViolations: 5,
        timeLimitSeconds: 600,
      },
    },
  });

  const sectionB = await prisma.paperSection.create({
    data: {
      versionId: version.id,
      title: 'SECTION B — LONG-FORM QUESTIONS',
      description: 'Research & Analysis - All 4 questions compulsory | 80 Marks. Research is permitted and expected.',
      order: 2,
      rules: {
        allowTabSwitching: true,
        allowExternalResources: true,
        wordLimit: 400,
        questionsToAttempt: 4,
      },
    },
  });

  const mcqs = [
    {
      text: 'Under Section 241 of the Companies Act, 2013, a petition alleging oppression and mismanagement can be filed before which authority?',
      options: ['High Court', 'Company Law Board', 'National Company Law Tribunal (NCLT)', 'Securities Appellate Tribunal (SAT)'],
      answer: 'National Company Law Tribunal (NCLT)',
      order: 1,
    },
    {
      text: 'According to Section 244 of the Companies Act, 2013, the minimum shareholding required by members of a company (other than one having share capital) to file a petition under Section 241 is:',
      options: [
        'Not less than one-tenth of the total number of members',
        'Not less than one-fifth of the total number of members',
        'Not less than 10% of the paid-up share capital',
        'Not less than 5% of the paid-up share capital',
      ],
      answer: 'Not less than one-fifth of the total number of members',
      order: 2,
    },
    {
      text: 'A class action suit under Section 245 of the Companies Act, 2013 may be filed by:',
      options: ['Only institutional shareholders', 'Members or depositors meeting the prescribed threshold', 'Only the Central Government', 'Any single shareholder regardless of shareholding'],
      answer: 'Members or depositors meeting the prescribed threshold',
      order: 3,
    },
    {
      text: 'The appointment of an Independent Director to the board of a listed company requires approval by:',
      options: [
        'A simple majority of the Board of Directors alone',
        'A special resolution of shareholders alone',
        'A Board resolution followed by approval of shareholders at the general meeting',
        'Prior approval of SEBI',
      ],
      answer: 'A Board resolution followed by approval of shareholders at the general meeting',
      order: 4,
    },
    {
      text: "Under the SEBI (Prohibition of Insider Trading) Regulations, 2015, 'Unpublished Price Sensitive Information' (UPSI) is defined as information that is:",
      options: [
        'Generally available and likely to materially affect the price of securities',
        'Not generally available and likely to materially affect the price of securities',
        'Available only to promoters of a listed company',
        'Published in any newspaper circulated in India',
      ],
      answer: 'Not generally available and likely to materially affect the price of securities',
      order: 5,
    },
    {
      text: 'Which of the following relationships disqualifies a person from being appointed as an Independent Director under the Companies Act, 2013?',
      options: [
        'Being a distant cousin of a shareholder holding less than 1% shares',
        'Being a pecuniary relationship holder with the company exceeding the prescribed limit',
        'Being a former government officer',
        'Being a retired judge of the High Court',
      ],
      answer: 'Being a pecuniary relationship holder with the company exceeding the prescribed limit',
      order: 6,
    },
    {
      text: 'Under the SEBI (Substantial Acquisition of Shares and Takeovers) Regulations, 2011 (SAST), the threshold for mandatory open offer is triggered when an acquirer acquires shares or voting rights entitling him to exercise:',
      options: ['More than 15% of shares or voting rights', '25% or more of shares or voting rights', 'More than 26% of shares or voting rights', 'More than 51% of shares or voting rights'],
      answer: '25% or more of shares or voting rights',
      order: 7,
    },
    {
      text: 'The removal of a Managing Director under the Companies Act, 2013 requires:',
      options: [
        'A board resolution passed by a simple majority',
        'An ordinary resolution of shareholders at a general meeting with special notice',
        'A special resolution of shareholders',
        'An order of the NCLT',
      ],
      answer: 'An ordinary resolution of shareholders at a general meeting with special notice',
      order: 8,
    },
    {
      text: "Under the SEBI (Prohibition of Fraudulent and Unfair Trade Practices) Regulations, 2003, 'market manipulation' includes which of the following?",
      options: ['Legitimate hedging transactions', 'Creating a false or misleading appearance of trading in securities', 'Disclosures made to stock exchanges as required by law', 'Dividend declarations by the board of directors'],
      answer: 'Creating a false or misleading appearance of trading in securities',
      order: 9,
    },
    {
      text: "In the context of Shareholders' Agreements (SHA), the 'for cause' removal clause of a Managing Director:",
      options: [
        'Is entirely governed by the SHA and the Companies Act imposes no restriction',
        'Must be read subject to the minimum statutory protections under the Companies Act, 2013',
        'Can only be enforced by SEBI in listed companies',
        'Applies only when approved by the NCLT in advance',
      ],
      answer: 'Must be read subject to the minimum statutory protections under the Companies Act, 2013',
      order: 10,
    },
  ];

  for (const q of mcqs) {
    const formattedOptions = q.options.map((opt, i) => ({
      id: String.fromCharCode(65 + i),
      text: opt,
    }));
    const formattedAnswer = String.fromCharCode(65 + q.options.indexOf(q.answer));

    await prisma.question.create({
      data: {
        versionId: version.id,
        sectionId: sectionA.id,
        type: QuestionType.MCQ,
        text: q.text,
        marks: 2,
        options: formattedOptions,
        answer: formattedAnswer,
        order: q.order,
      },
    });
  }

  const descriptiveQuestions = [
    {
      text: 'Your senior receives a call from a client at 11 AM. The client states: "We are a private limited company with 8 shareholders. Three months ago, our minority shareholder, who holds 18%, filed a petition before the NCLT under Section 241 alleging oppression. Yesterday, he sent us a legal notice stating that he is also going to file a Section 245 class action on behalf of all shareholders. This morning, our Company Secretary informed us that the same shareholder has been sending WhatsApp messages to other shareholders asking them to join the class action. Our promoters want to know: Can he pursue all three simultaneously? And can we stop him from contacting other shareholders?" Your senior asks you to answer within 20 minutes.',
      order: 1,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nUnder the Companies Act, 2013, can a shareholder simultaneously pursue a Section 241 petition AND a Section 245 class action for the same set of grievances? What is the strategic difference between the two routes, and why would a shareholder choose to pursue both?', marks: 7, order: 1 },
        { text: '### (b)\nThe minority shareholder holds 18%. Section 244 prescribes a minimum threshold to file a Section 241 petition. Does he meet this threshold? Apply the provision to the specific facts of this company.', marks: 7, order: 2 },
        { text: '### (c)\nCan the company legally restrain the shareholder from contacting other shareholders to join the class action? What would the company need to demonstrate in order to obtain an injunction?', marks: 6, order: 3 },
      ],
    },
    {
      text: "A listed company's board met last Tuesday. The agenda contained 8 items. Item 7 was the appointment of a new Independent Director. The resolution was passed by a simple majority of the Board — 5 votes in favour, 2 against. The company filed the necessary forms with the MCA. Three weeks later, a shareholder files a complaint with SEBI alleging that the appointment is invalid. Your senior asks: \"Identify the legal defect, if any, and advise whether the shareholder's complaint has merit.\"",
      order: 2,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nIs a Board resolution sufficient for the appointment of an Independent Director, or is something further required? Give reasons with reference to the applicable provisions.', marks: 7, order: 1 },
        { text: '### (b)\nSection 149(10) of the Companies Act states that an Independent Director can be re-appointed for a second term only by a special resolution. However, this is a first appointment. Does the ordinary/special resolution distinction apply to first appointments? Research and state the exact position of law.', marks: 7, order: 2 },
        { text: "### (c)\nThe Independent Director being appointed is the brother-in-law of the company's CFO. This relationship was disclosed in the appointment form. Does this disqualify the person from serving as an Independent Director? State the exact criterion that applies, and determine whether a brother-in-law relationship falls within it.", marks: 6, order: 3 },
      ],
    },
    {
      text: `A promoter group held 55% in a listed company. Over 18 months, they sold shares in the market in small tranches of 1–2% at a time, reducing their holding to 31%. Each individual sale was disclosed as required. The company's stock fell 40% over this period.

A group of institutional shareholders collectively holding 28% is now furious. They believe the promoters knew, at the time of selling, that the company's largest contract — worth ₹800 crore and representing 60% of revenue — was about to be terminated by the client. This information was not publicly available when the promoters were selling.

The institutional shareholders approach your firm. They want to take legal action against the promoters.

For each legal cause of action available to the institutional shareholders:
- State the precise legal basis (Act, Section, and Regulation);
- Identify the essential ingredients the shareholders must prove;
- Give your honest assessment of the strength of the claim on these facts; and
- Identify the single biggest obstacle to success.

The claims to be analysed include, but are not limited to: insider trading under the SEBI (Prohibition of Insider Trading) Regulations, 2015; fraud under the SEBI (Prohibition of Fraudulent and Unfair Trade Practices) Regulations, 2003; breach of fiduciary duty; and disclosure violations under the SEBI (Substantial Acquisition of Shares and Takeovers) Regulations, 2011. Do not limit yourself to the obvious — consider all genuinely available causes of action.`,
      order: 3,
      marks: 20,
      subQuestions: [],
    },
    {
      text: `Your senior sends you the following message at 7 PM:

"I have a call tomorrow at 9 AM with a founder who wants to understand his rights. Here is the situation: he is a 30% shareholder in a private company. The other 70% is held by two investors from a 2021 funding round. The investors have passed a board resolution removing him as Managing Director. The Shareholders' Agreement (SHA) grants the investors the right to remove the MD 'for cause', and they are claiming mismanagement. The founder maintains that there was no cause and no proper inquiry was conducted. He wants to fight back.

Three things I need to know before tomorrow: (1) Can a board resolution remove an MD who is also a shareholder, or does it require a shareholder resolution? (2) The 'for cause' clause in the SHA — can the investors define 'cause' however they choose, or does the Companies Act impose a floor below which the SHA cannot go? (3) If the removal is challenged before the NCLT, what is the founder's strongest argument and what is its weakness? Draft me the note."

Draft the note your senior requires (under 400 words).`,
      order: 4,
      marks: 20,
      subQuestions: [
        { text: '### 1 — Board vs. Shareholder Resolution for MD Removal\n- The legal position (cite the exact section):\n- The specific answer on these facts (30% founder, private company):\n- One risk the founder faces even if he succeeds on this point:', marks: 7, order: 1 },
        { text: "### 2 — SHA 'For Cause' Clause vs. Companies Act Floor\n- Can the SHA define 'cause' without any statutory constraint?\n- Do Sections 196, 197, 203, or any other provision impose minimum protections?\n- Your view on whether the investors' invocation of the clause is legally challengeable:", marks: 7, order: 2 },
        { text: '### 3 — Strongest NCLT Argument and Its Weakness\n- The founder\'s strongest ground before the NCLT:\n- The single most significant weakness in that argument:', marks: 6, order: 3 },
      ],
    },
  ];

  for (const q of descriptiveQuestions) {
    const parentQuestion = await prisma.question.create({
      data: {
        versionId: version.id,
        sectionId: sectionB.id,
        type: QuestionType.SUBJECTIVE,
        text: q.text,
        marks: q.marks,
        order: q.order,
      },
    });

    for (const sub of q.subQuestions) {
      await prisma.question.create({
        data: {
          versionId: version.id,
          sectionId: sectionB.id,
          parentId: parentQuestion.id,
          type: QuestionType.SUBJECTIVE,
          text: sub.text,
          marks: sub.marks,
          order: sub.order,
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
