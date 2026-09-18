import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding IPR law practice area...');

  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'Intellectual Property Rights' },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const paper = await prisma.questionPaper.upsert({
    where: {
      id:
        (
          await prisma.questionPaper.findFirst({
            where: { title: 'Intellectual Property Rights Law Assessment Examination', specializationId: specialization.id },
          })
        )?.id || 'placeholder-id-for-create',
    },
    update: {
      description: 'Comprehensive assessment covering Trade Marks, Patents, Copyright, and intermediary liability under the IT Act.',
    },
    create: {
      specializationId: specialization.id,
      title: 'Intellectual Property Rights Law Assessment Examination',
      description: 'Comprehensive assessment covering Trade Marks, Patents, Copyright, and intermediary liability under the IT Act.',
    },
  });

  console.log(`Using paper: ${paper.title} (${paper.id})`);

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
This section tests your foundational knowledge of Intellectual Property Rights Law.

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
- Four descriptive questions (Attempt any 4 out of 5)
- 20 marks each
- Total: 80 marks

### Time Allocation
- Total paper time: 3 hours
- Suggested Section B: 170 minutes

### Key Rules
- Research is permitted. Internet, legal databases, and statutes may be consulted.
- Maximum 200 words per answer unless otherwise specified.
- Any four of the five questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: Trade Marks Act 1999, Patents Act 1970, Copyright Act 1957, Information Technology Act 2000.
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
      description: 'Knowledge Test - 10 MCQs | 20 Marks. This section tests your foundational knowledge of IPR Law. Closed-book, proctored.',
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
      title: 'SECTION B — DESCRIPTIVE / APPLIED QUESTIONS',
      description: 'Research & Analysis - Attempt any 4 questions | 80 Marks. Research is permitted and expected.',
      order: 2,
      rules: {
        allowTabSwitching: true,
        allowExternalResources: true,
        wordLimit: 200,
        questionsToAttempt: 4,
      },
    },
  });

  const mcqs = [
    {
      text: 'Under the Trade Marks Act, 1999, a registered trademark can be removed from the register for non-use if it has not been used for a continuous period of:',
      options: ['2 years', '3 years', '5 years', '7 years'],
      answer: '5 years',
      order: 1,
    },
    {
      text: "The 'doctrine of exhaustion' (first sale doctrine) under the Trade Marks Act, 1999 means:",
      options: [
        'A trademark owner cannot control the resale of genuine goods put in the market by them or with their consent',
        'A trademark registration expires automatically after 10 years',
        'Parallel imports are always permitted in India',
        'A trademark is exhausted once it becomes generic',
      ],
      answer: 'A trademark owner cannot control the resale of genuine goods put in the market by them or with their consent',
      order: 2,
    },
    {
      text: 'Under Section 3(k) of the Patents Act, 1970, which of the following is NOT patentable in India?',
      options: [
        'A new chemical compound with industrial application',
        'A computer program per se',
        'A micro-organism that is novel and non-obvious',
        'A process for producing a pharmaceutical drug',
      ],
      answer: 'A computer program per se',
      order: 3,
    },
    {
      text: "Under the Copyright Act, 1957, the term 'fair dealing' is governed by:",
      options: ['Section 14', 'Section 52', 'Section 57', 'Section 63'],
      answer: 'Section 52',
      order: 4,
    },
    {
      text: 'The term of protection for a patent under the Patents Act, 1970 is:',
      options: [
        '10 years from the date of filing',
        '14 years from the date of grant',
        '20 years from the date of filing of the application',
        '25 years from the priority date',
      ],
      answer: '20 years from the date of filing of the application',
      order: 5,
    },
    {
      text: "An 'ex-parte ad-interim injunction' in a trademark infringement suit is governed under which provision of the Code of Civil Procedure, 1908?",
      options: ['Order XXXVIII Rule 5', 'Order XXXIX Rule 3', 'Order XXXIX Rule 1 and 2', 'Section 151 CPC only'],
      answer: 'Order XXXIX Rule 3',
      order: 6,
    },
    {
      text: 'Under the Information Technology Act, 2000, an intermediary such as an e-commerce platform is exempt from liability for third-party content under:',
      options: ['Section 66A', 'Section 69B', 'Section 79', 'Section 43A'],
      answer: 'Section 79',
      order: 7,
    },
    {
      text: 'Under Section 17 of the Copyright Act, 1957, the first owner of copyright in a work made by an author in the course of employment under a contract of service is:',
      options: [
        'The author of the work',
        'The employer, in the absence of any agreement to the contrary',
        'Both the author and the employer jointly',
        'The Central Government',
      ],
      answer: 'The employer, in the absence of any agreement to the contrary',
      order: 8,
    },
    {
      text: "The concept of 'passing off' in Indian law primarily protects:",
      options: [
        'Registered trademarks only',
        'Unregistered marks and goodwill in a trade name or get-up',
        'Patented inventions against imitation',
        'Copyrighted works against reproduction',
      ],
      answer: 'Unregistered marks and goodwill in a trade name or get-up',
      order: 9,
    },
    {
      text: "Under the Trade Marks Act, 1999, a trademark is deemed to be 'well-known' under:",
      options: [
        'Section 2(1)(zg) read with Section 11(6)',
        'Section 9(1) read with Section 11(1)',
        'Section 29(4) read with Section 47',
        'Section 2(1)(z) read with Section 28',
      ],
      answer: 'Section 2(1)(zg) read with Section 11(6)',
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
      text: "A software company seeks your advice: 'We have built an AI model. Can we patent the algorithm?' Your senior requires a concise research note on the current patentability position for AI and software-based inventions in India.",
      order: 1,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nWhat does Section 3(k) of the Patents Act, 1970 provide regarding the patentability of software? Has the Indian Patent Office's Guidelines for Examination of Computer Related Inventions (CRI Guidelines) altered this position? Mention the source of your research and provide the URL.", marks: 6, order: 1 },
        { text: '### (b)\nUnder the 2017 CRI Guidelines (revised), what is the test for determining the patentability of a computer-implemented invention? State the relevant page number, rule number, and URL, and explain the test in approximately 150 words.', marks: 8, order: 2 },
        { text: '### (c)\nCan the AI algorithm be patented? If yes, cite a judgment supporting patentability. If no, identify the specific alternative forms of intellectual property protection available, citing the exact section numbers under the applicable statute(s).', marks: 6, order: 3 },
      ],
    },
    {
      text: "A YouTuber used 10 seconds of a Bollywood song in a review video. The music label has issued a copyright takedown notice. The YouTuber contends it constitutes 'fair use'. Your senior asks you to research the current Indian legal position.",
      order: 2,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nIs there a 'fair use' doctrine in India? What is the correct legal term used in Indian copyright law, and which section of the Copyright Act, 1957 governs exceptions applicable to online review content?", marks: 6, order: 1 },
        { text: '### (b)\nHas any Indian court or the Copyright Board specifically addressed the use of copyrighted content on YouTube or similar platforms? Identify and briefly analyse one authority decided in or after 2018. Provide the URL of the decision.', marks: 7, order: 2 },
        { text: '### (c)\nDoes the use of a 10-second clip in a review video fall within the statutory exception? Give reasons for your answer. What is the legal risk of ignoring the takedown notice? Advise the YouTuber in three concise lines.', marks: 7, order: 3 },
      ],
    },
    {
      text: "Your client has discovered a competitor selling identical goods under a confusingly similar trademark. Your senior instructs: 'We need an ex-parte injunction from the Delhi High Court today. Research the requirements and tell me what we need to file.'",
      order: 3,
      marks: 20,
      subQuestions: [
        { text: '### (a) Step 1 — Legal Requirements\nWhat are the three conditions that must be satisfied for the grant of an ex-parte ad-interim injunction in a trademark infringement suit under the Code of Civil Procedure, 1908 read with the Trade Marks Act, 1999? Cite the exact section and order/rule numbers.', marks: 7, order: 1 },
        { text: '### (b) Step 2 — Documents Required\nList every document your client must provide to you today in order to file the injunction application before the Delhi High Court. Be specific and comprehensive.', marks: 7, order: 2 },
        { text: '### (c) Step 3 — Prayer Clause\nDraft the exact prayer clause of the injunction application, setting out what the court is being asked to order, against whom, and for what duration. Use hypothetical party names if required.', marks: 6, order: 3 },
      ],
    },
    {
      text: "A global fashion brand (your client) has discovered that a small Indian seller on Amazon India is selling products described as 'inspired by [Brand]'. The brand seeks urgent legal advice.",
      order: 4,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nIs the seller's conduct trademark infringement, passing off, or both under Indian law? What is the fastest available legal action against both the seller and Amazon India? Answer in a maximum of 200 words.", marks: 7, order: 1 },
        { text: "### (b)\nIdentify one relevant case law (with URL) that supports your client's position, and explain in under 150 words how and in what respect it supports the client's stance.", marks: 6, order: 2 },
        { text: "### (c)\nIs Amazon India liable for the seller's listings? Which provision of the Information Technology Act, 2000 governs intermediary liability, and how does it apply to this situation? Answer in approximately 200 words.", marks: 7, order: 3 },
      ],
    },
    {
      text: "Your client, TechStart, developed a mobile application over 18 months. No intellectual property was registered. A former co-founder, who left the company two years ago, is now claiming 50% ownership of the application's copyright and threatening to initiate legal proceedings. Your senior asks you to advise urgently.",
      order: 5,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nWho owns the copyright in software created by an employee in the course of employment — the company or the individual employee? Identify the relevant section or judgment and provide reasoned analysis in approximately 150 words.', marks: 8, order: 1 },
        { text: "### (b)\nDoes the former co-founder's claim of 50% copyright ownership have legal merit under Indian law? Support your answer with the relevant statutory provision or judicial authority.", marks: 6, order: 2 },
        { text: "### (c)\nDraft a three-line legal update for the client clearly stating: (i) whether the co-founder's claim is legally sustainable; (ii) the strongest ground of defence available to TechStart; and (iii) the immediate step TechStart should take to protect its position.", marks: 6, order: 3 },
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
