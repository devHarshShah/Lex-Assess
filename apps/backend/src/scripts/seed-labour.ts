import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding labour law practice area...');

  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'Labour' },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const paper = await prisma.questionPaper.upsert({
    where: {
      id:
        (
          await prisma.questionPaper.findFirst({
            where: { title: 'Labour Law Assessment Examination', specializationId: specialization.id },
          })
        )?.id || 'placeholder-id-for-create',
    },
    update: {
      description: 'Comprehensive assessment covering the Industrial Relations Code, Maternity Benefit Act, Code on Social Security, and service/disciplinary law.',
    },
    create: {
      specializationId: specialization.id,
      title: 'Labour Law Assessment Examination',
      description: 'Comprehensive assessment covering the Industrial Relations Code, Maternity Benefit Act, Code on Social Security, and service/disciplinary law.',
    },
  });

  console.log(`Using paper: ${paper.title} (${paper.id})`);

  // Source paper labels Section B as "80 Marks" and "Attempt ALL questions," but its own
  // 6 descriptive questions' printed marks sum to 100 (15+15+15+15+20+20), not 80 - an
  // arithmetic inconsistency in the source. Resolved as: attempt any 4 of the 6 offered
  // (matching every other paper's "any 4" pattern), keeping each question's own printed
  // marks rather than inventing a rescaled figure.
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
This section tests your foundational knowledge of Labour Law.

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
- Six descriptive/analytical questions offered (Attempt any 4 out of 6)
- Marks vary per question (15 or 20 marks each, as indicated against each question)
- Total: 80 marks

### Time Allocation
- Total paper time: 3 hours
- Suggested Section B: 170 minutes

### Key Rules
- Research is permitted. Internet, legal databases, and statutes may be consulted.
- Cite relevant statutory provisions, rules, and judicial precedents wherever applicable.
- Any four of the six questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: Industrial Relations Code 2020, Maternity Benefit Act 1961, Code on Social Security 2020, Employees' State Insurance Act 1948.
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
      description: 'Knowledge Test - 10 MCQs | 20 Marks. This section tests your foundational knowledge of Labour Law. Closed-book, proctored.',
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
      title: 'SECTION B — DESCRIPTIVE AND ANALYTICAL QUESTIONS',
      description: 'Research & Analysis - Attempt any 4 of 6 questions | 80 Marks. Research is permitted and expected.',
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
      text: 'Under the Industrial Relations Code, 2020, what is the threshold number of workers in an industrial establishment above which prior government permission is mandatory before retrenchment?',
      options: ['100 workers', '200 workers', '300 workers', '500 workers'],
      answer: '300 workers',
      order: 1,
    },
    {
      text: 'Which of the following is the correct definition of "retrenchment" under Section 2(zt) of the Industrial Relations Code, 2020?',
      options: [
        'Termination of service for any reason whatsoever, including voluntary retirement',
        'Termination of service by the employer for any reason other than as a punishment inflicted by way of disciplinary action',
        'Termination on account of continued ill-health of the worker',
        'Termination upon completion of a fixed-term contract',
      ],
      answer: 'Termination of service by the employer for any reason other than as a punishment inflicted by way of disciplinary action',
      order: 2,
    },
    {
      text: 'The Maternity Benefit Act, 1961 entitles a woman employee to how many weeks of paid maternity leave for her first two live births?',
      options: ['12 weeks', '18 weeks', '26 weeks', '24 weeks'],
      answer: '26 weeks',
      order: 3,
    },
    {
      text: 'Under the Code on Social Security, 2020, which chapter specifically deals with the social security and welfare of gig workers and platform workers?',
      options: ['Chapter III', 'Chapter VI', 'Chapter IX', 'Chapter IV'],
      answer: 'Chapter IX',
      order: 4,
    },
    {
      text: 'The principle of "no punishment without enquiry" in service law is derived primarily from which of the following constitutional provisions?',
      options: ['Article 14 read with Article 21', 'Article 311 read with principles of natural justice', 'Article 19(1)(g)', 'Article 16(1)'],
      answer: 'Article 311 read with principles of natural justice',
      order: 5,
    },
    {
      text: 'In the context of departmental inquiries, the rule against bias (nemo judex in causa sua) would be violated in which of the following scenarios?',
      options: [
        'The inquiry officer belongs to the same department as the delinquent employee',
        'The inquiry officer was the complainant or initiating authority in the same matter',
        'The inquiry officer is senior in rank to the disciplinary authority',
        'The inquiry officer was transferred to another department before the inquiry concluded',
      ],
      answer: 'The inquiry officer was the complainant or initiating authority in the same matter',
      order: 6,
    },
    {
      text: "Under ESIC, the wage ceiling for coverage of employees as prescribed under the Employees' State Insurance Act, 1948, currently stands at:",
      options: ['₹15,000 per month', '₹21,000 per month', '₹25,000 per month', '₹18,000 per month'],
      answer: '₹21,000 per month',
      order: 7,
    },
    {
      text: '"Moonlighting" by an employee, in the absence of any contractual restriction, is best described under Indian labour law as:',
      options: [
        'A criminal offence under the Indian Penal Code',
        'A statutory violation under the Factories Act, 1948',
        "Not per se illegal, but may constitute misconduct if it violates contractual terms or is detrimental to the employer's interests",
        'Expressly prohibited under the Industrial Disputes Act, 1947',
      ],
      answer: "Not per se illegal, but may constitute misconduct if it violates contractual terms or is detrimental to the employer's interests",
      order: 8,
    },
    {
      text: 'The doctrine of proportionality in disciplinary proceedings, as evolved by the Supreme Court, requires the disciplinary authority to ensure that:',
      options: [
        'The punishment imposed is the maximum provided under the service rules',
        'The punishment is commensurate with the gravity of the proved misconduct and does not shock the conscience of the court',
        'The punishment is identical to that imposed in similar previous cases',
        'The employee is given the option to choose between punishments',
      ],
      answer: 'The punishment is commensurate with the gravity of the proved misconduct and does not shock the conscience of the court',
      order: 9,
    },
    {
      text: 'Which of the following statements is CORRECT regarding the protection afforded to a pregnant woman on a fixed-term contract whose contract is not renewed?',
      options: [
        'Non-renewal of a fixed-term contract can never amount to dismissal in law',
        'Courts have held that non-renewal of a fixed-term contract during pregnancy may amount to dismissal under the Maternity Benefit Act if the non-renewal is connected to the pregnancy',
        'The Maternity Benefit Act, 1961 expressly excludes fixed-term contract employees from its protection',
        'Only permanent employees are entitled to protection under the Maternity Benefit Act, 1961',
      ],
      answer: 'Courts have held that non-renewal of a fixed-term contract during pregnancy may amount to dismissal under the Maternity Benefit Act if the non-renewal is connected to the pregnancy',
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
      text: 'QUESTION 1 — Industrial Retrenchment and Legislative Applicability\n\nA textile factory in Surat employs 280 permanent workers. The management emailed termination letters to all 280 workers overnight, citing "business restructuring." The trade union is threatening to approach the Labour Commissioner by noon the following day.',
      order: 1,
      marks: 15,
      subQuestions: [
        { text: '### (a)\nDoes this factory require prior government permission before retrenching 280 workers? Which legislation applies? State the exact numerical threshold with the relevant provision.', marks: 5, order: 1 },
        { text: '### (b)\nThe management\'s lawyer argues: "The Industrial Relations Code, 2020, has not been fully notified in Gujarat; therefore, the Industrial Disputes Act, 1947, still applies." Critically evaluate whether this argument is legally correct as of 2025. Research and state the current notification status of the IR Code in the relevant state. Provide the URL of your research source.', marks: 10, order: 2 },
      ],
    },
    {
      text: 'QUESTION 2 — Maternity Benefit and Fixed-Term Contracts\n\nA woman employee at a Bengaluru IT company has been employed on a fixed-term contract for eight months. She is six months pregnant. Her contract expires next month, and the company has decided not to renew it, stating that the project has concluded.\n\nThe company argues: "We are not dismissing her — the contract simply expires. The Maternity Benefit Act, 1961, protects only against dismissal and not against non-renewal of a contract." Critically examine whether this argument is legally tenable. Has any court addressed the distinction between \'dismissal\' and \'non-renewal of a fixed-term contract\' in the context of a pregnant employee? Provide the exact citation, URL of the judgment, and the specific paragraph number in your answer.',
      order: 2,
      marks: 15,
      subQuestions: [],
    },
    {
      text: 'QUESTION 3 — Moonlighting Policy and Employment Termination\n\nIn September 2022, Wipro Limited terminated approximately 300 employees for moonlighting — that is, working simultaneously for competing organisations. The company\'s HR Director publicly stated that "moonlighting is a direct violation of employment terms." Several of the affected employees challenged their terminations.\n\nYou are advising a Delhi-based fintech company that seeks to implement a similar "zero-moonlighting" policy.',
      order: 3,
      marks: 15,
      subQuestions: [
        { text: '### (a)\nUnder Indian labour law, is moonlighting per se (by itself) illegal? Provide a well-reasoned legal answer.', marks: 5, order: 1 },
        { text: '### (b)\nFor a termination on grounds of moonlighting to withstand a challenge before a Labour Court, which two documents must be in order before the company issues the termination? Be specific about what each document must contain.', marks: 5, order: 2 },
        { text: '### (c)\nA developer facing termination contends: "I was doing freelance work on weekends for a personal client — not for a competitor. My employment contract only bars working for competitors." In two lines, advise your client (the company) on how to counter this argument. Support your advice with a judicial citation.', marks: 5, order: 3 },
      ],
    },
    {
      text: 'QUESTION 4 — Gig Worker: Social Security and Compensation Entitlements\n\nA gig delivery worker employed by a food aggregator platform was injured in a road accident while on an active delivery. He is now hospitalised and seeks legal advice. He asks his lawyer: "Am I entitled to ESIC coverage? Can I claim workmen\'s compensation? Does the platform owe me anything under the Code on Social Security, 2020?"\n\nAnswer all three questions in the tabular format indicated below. For each, state: (i) the applicable provision, (ii) in one line — what it gives him, and (iii) whether he qualifies. Do NOT merely name the provision; explain its import.',
      order: 4,
      marks: 15,
      subQuestions: [
        { text: '### Row 1 — ESIC Coverage\nState the applicable provision, what it gives him in one line, and whether he qualifies.', marks: 5, order: 1 },
        { text: "### Row 2 — Workmen's Compensation\nState the applicable provision, what it gives him in one line, and whether he qualifies.", marks: 5, order: 2 },
        { text: '### Row 3 — Platform obligation under the Code on Social Security, 2020\nState the applicable provision, what it gives him in one line, and whether he qualifies.', marks: 5, order: 3 },
      ],
    },
    {
      text: `QUESTION 5 — Drafting: Grounds for Writ Petition under Article 226

A government bank's branch manager, with 19 years of unblemished service, approved a ₹40 lakh loan for a local businessman. The credit appraisal form was incomplete — specifically, the income verification column was left blank. The borrower defaulted eight months later. Following a departmental inquiry, the inquiry officer found the manager guilty of "gross negligence in credit sanction" and the disciplinary authority imposed the punishment of dismissal.

The manager's defence throughout the proceedings was: "The credit verification was conducted verbally and by telephone. It was not recorded in the form because the system was unavailable that day. I escalated this to my Regional Manager by email, a copy of which I possess. No one instructed me to wait. The Regional Manager approved the sanction orally."

The inquiry officer's report makes no mention of the Regional Manager's email whatsoever. The Regional Manager was not examined as a witness during the inquiry.

Draft the "Grounds" section of a writ petition under Article 226 of the Constitution of India before the appropriate High Court, challenging the dismissal. Your answer must contain AT LEAST FOUR grounds. Each ground must: (i) state the legal violation with precision; (ii) apply it specifically to the facts above (the Regional Manager's email, the missing witness, the clean service record); (iii) cite one binding judicial authority in support.

Note: Generic grounds are not acceptable. For example, merely writing "Breach of natural justice" is insufficient. A proper ground must read: "The Inquiry Officer failed to examine the Regional Manager as a witness despite the petitioner specifically producing a contemporaneous email evidencing the Regional Manager's knowledge and oral approval — a direct violation of the principle in Union of India v. T.R. Verma [(1957) SCR 499] that an adequate opportunity of defence includes the right to have relevant and material witnesses examined."`,
      order: 5,
      marks: 20,
      subQuestions: [],
    },
    {
      text: `QUESTION 6 — Research Note: Industrial Tribunal Hearing on Dismissal for Theft

A company dismissed a workman eight months ago for theft. The domestic inquiry was completed and the workman was found guilty. However, the inquiry officer was the same person who had filed the complaint against the workman. The workman is now challenging the dismissal before an Industrial Tribunal. There are two distinct issues in dispute.

Prepare a research note (not exceeding 400 words) for your senior, structured as follows:

ISSUE 1 — Inquiry Officer as Complainant
- Legal position:
- Key judgment (full citation, URL, and holding in one line):
- Application to the present facts:
- Risk assessment for the company:

ISSUE 2 — Disproportionality of Dismissal
- Legal position:
- Key judgment (full citation, URL, and holding in one line):
- Application to the present facts:
- Recommendation for tomorrow's hearing:`,
      order: 6,
      marks: 20,
      subQuestions: [],
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
