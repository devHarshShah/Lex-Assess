import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding taxation law practice area...');

  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'Taxation' },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const paper = await prisma.questionPaper.upsert({
    where: {
      id:
        (
          await prisma.questionPaper.findFirst({
            where: { title: 'Taxation Law Assessment Examination', specializationId: specialization.id },
          })
        )?.id || 'placeholder-id-for-create',
    },
    update: {
      description: 'Comprehensive assessment covering Income Tax, GST/CGST/IGST, Transfer Pricing, and Advance Rulings.',
    },
    create: {
      specializationId: specialization.id,
      title: 'Taxation Law Assessment Examination',
      description: 'Comprehensive assessment covering Income Tax, GST/CGST/IGST, Transfer Pricing, and Advance Rulings.',
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
This section tests your foundational knowledge of Taxation Law.

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
- Maximum 250 words per answer unless otherwise specified.
- Any four of the five questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: Income Tax Act 1961, CGST Act 2017, IGST Act 2017.
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
      description: 'Knowledge Test - 10 MCQs | 20 Marks. This section tests your foundational knowledge of Taxation Law. Closed-book, proctored.',
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
        wordLimit: 250,
        questionsToAttempt: 4,
      },
    },
  });

  const mcqs = [
    {
      text: "Under Section 44B of the Income Tax Act, 1961, a non-resident shipping company's taxable income from the carriage of passengers, livestock, mail, or goods from any Indian port is computed as:",
      options: [
        '5% of aggregate amounts paid for carriage',
        '7.5% of the amounts paid or payable for such carriage',
        '10% of gross freight',
        'Actual profit computed under normal provisions',
      ],
      answer: '7.5% of the amounts paid or payable for such carriage',
      order: 1,
    },
    {
      text: 'Under the GST law, Input Tax Credit on motor vehicles used for the transportation of persons with a seating capacity of up to 13 persons (including the driver) is:',
      options: [
        'Available without restriction for all business purposes',
        'Blocked under Section 17(5)(a) of the CGST Act',
        'Available only if used exclusively for business purposes',
        'Available only for registered dealers in motor vehicles',
      ],
      answer: 'Blocked under Section 17(5)(a) of the CGST Act',
      order: 2,
    },
    {
      text: 'Under Section 54(3) of the CGST Act, 2017, a registered person is entitled to a refund of accumulated Input Tax Credit (ITC) in which of the following situations?',
      options: [
        'Where credit has accumulated due to an exempt supply',
        'Where the rate of tax on inputs is higher than the rate of tax on output supplies (inverted duty structure)',
        'Where the supplier has defaulted in payment of tax',
        'Where ITC is accumulated due to a nil-rated supply',
      ],
      answer: 'Where the rate of tax on inputs is higher than the rate of tax on output supplies (inverted duty structure)',
      order: 3,
    },
    {
      text: 'Under Section 92C of the Income Tax Act, 1961, which of the following is NOT a prescribed Transfer Pricing method?',
      options: [
        'Comparable Uncontrolled Price (CUP) method',
        'Cost Plus method',
        'Discounted Cash Flow (DCF) method',
        'Transactional Net Margin Method (TNMM)',
      ],
      answer: 'Discounted Cash Flow (DCF) method',
      order: 4,
    },
    {
      text: "Under the IGST Act, 2017, 'export of goods' is defined as:",
      options: [
        'Taking goods out of India to a place outside India',
        'Supply of goods from a Special Economic Zone to a Domestic Tariff Area',
        'Transfer of title of goods to a non-resident person',
        'Dispatch of goods to a foreign party against a Letter of Credit',
      ],
      answer: 'Taking goods out of India to a place outside India',
      order: 5,
    },
    {
      text: 'An Advance Pricing Agreement (APA) under Section 92CC of the Income Tax Act, 1961 is entered into between the taxpayer and:',
      options: [
        'The Central Board of Direct Taxes (CBDT)',
        'The Transfer Pricing Officer',
        'The Assessing Officer',
        'The Dispute Resolution Panel',
      ],
      answer: 'The Central Board of Direct Taxes (CBDT)',
      order: 6,
    },
    {
      text: "Under GST law, which of the following supplies is treated as a 'zero-rated supply'?",
      options: [
        'Supply of exempted goods within India',
        'Supply of goods or services to a Special Economic Zone developer or unit',
        'Intra-state supply of essential commodities',
        'Supply of goods at nil rate of duty',
      ],
      answer: 'Supply of goods or services to a Special Economic Zone developer or unit',
      order: 7,
    },
    {
      text: 'Under Section 17(5) of the CGST Act, Input Tax Credit is blocked on which of the following?',
      options: [
        'Goods used in the course of business',
        'Works contract services used for construction of immovable property for personal use',
        'Inputs used for manufacturing taxable goods',
        'Services received in relation to insurance of goods transported',
      ],
      answer: 'Works contract services used for construction of immovable property for personal use',
      order: 8,
    },
    {
      text: "Which of the following correctly describes the 'arm's length price' as defined under Section 92F(ii) of the Income Tax Act, 1961?",
      options: [
        'The price charged between unrelated parties in an open and uncontrolled transaction',
        'The price fixed by the Transfer Pricing Officer in a draft order',
        'The price approved by the Advance Pricing Agreement panel',
        'The weighted average of prices declared by the taxpayer',
      ],
      answer: 'The price charged between unrelated parties in an open and uncontrolled transaction',
      order: 9,
    },
    {
      text: 'Under the CGST Act, 2017, which authority is empowered to pass a ruling binding on the applicant and the jurisdictional GST officer under the Advance Ruling mechanism?',
      options: [
        'GST Council',
        'Authority for Advance Ruling (AAR) constituted under Section 96',
        'Appellate Authority for Advance Ruling (AAAR)',
        'High Court of the respective State',
      ],
      answer: 'Authority for Advance Ruling (AAR) constituted under Section 96',
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
      text: "Your client, an Indian exporter, has received USD 2 million from a foreign buyer for the export of engineering goods. The GST department contends that the contract was, in substance, for 'design services' and is taxable as an export of services, not goods, and that the client's zero-rating claim is therefore invalid. Your senior requires an urgent research note.",
      order: 1,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nWhat is the distinction between 'export of goods' and 'export of services' under the IGST Act, 2017? How does the CBIC determine which category applies in the case of a mixed supply comprising goods with embedded design services?", marks: 8, order: 1 },
        { text: '### (b)\nHas the AAAR, GSTAT, or any High Court adjudicated upon a similar classification dispute recently? Cite and briefly analyse one authority decided after 2020. Mention the source of your answer.', marks: 7, order: 2 },
        { text: '### (c)\nDraft a concise three-point advisory note to your client, outlining the legal position, the risk of re-classification, and the recommended course of action.', marks: 5, order: 3 },
      ],
    },
    {
      text: "A multinational corporation has a subsidiary in India that pays annual management fees of ₹40 crore to its Singapore-based parent company. The Transfer Pricing Officer (TPO) has issued a draft order proposing an adjustment of ₹25 crore, claiming the fee exceeds the arm's length price. Your senior asks for a comprehensive analysis of options and the current judicial position on management fee benchmarking.",
      order: 2,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nWhich Transfer Pricing method prescribed under Section 92C of the Income Tax Act, 1961 is most appropriate for benchmarking management fees? Discuss the current preferences of the OECD Guidelines and the Indian Transfer Pricing Officer. Provide the exact source or URL of your answer.', marks: 8, order: 1 },
        { text: "### (b)\nHas the ITAT or any High Court recently adjudicated on the arm's length pricing of management fees? Identify and analyse one authority decided after 2021.", marks: 7, order: 2 },
        { text: '### (c)\nShould the client contest the TPO\'s adjustment before the DRP/ITAT, file an Advance Pricing Agreement (APA), or seek to settle? Provide a three-line reasoned recommendation.', marks: 5, order: 3 },
      ],
    },
    {
      text: 'Your senior is advising an Indian importer who has been denied Input Tax Credit (ITC) on goods purchased from a supplier whose GST registration was, as it subsequently came to light, cancelled at the time of supply. The importer had no knowledge of this fact. Your senior asks whether the buyer is legally protected.',
      order: 3,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nWhat is the applicable law governing ITC denial in cases where the supplier held a cancelled registration at the time of supply? Has the CBIC issued any circular clarifying the buyer's liability in such circumstances? Paste the URL of the relevant circular. (Maximum 250 words.)", marks: 8, order: 1 },
        { text: "### (b)\nHas any High Court held that a bona fide buyer cannot be denied ITC on account of the supplier's default or cancelled registration? Identify and analyse the most relevant judicial authority.", marks: 7, order: 2 },
        { text: '### (c)\nDraft a three-line client update clearly stating whether the client can recover the denied ITC and specifying the immediate steps to be taken.', marks: 5, order: 3 },
      ],
    },
    {
      text: "Your client operates an export-oriented unit. The GST department has rejected the client's claim for a refund of accumulated ITC under the inverted duty structure on the ground that the product falls within the category of 'notified goods' under the CGST Act. You are asked to research the current position of the Supreme Court on this issue.",
      order: 4,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nUnder Section 54(3) of the CGST Act, 2017, under what circumstances is ITC refund available on account of an inverted duty structure? What is the scope of the 'notified goods' exception, and which products have been notified by the Government?", marks: 6, order: 1 },
        { text: '### (b)\nHas the Supreme Court of India adjudicated upon the constitutional validity of the restriction on ITC refund for inverted duty structures? State the case name, year, and the precise holding of the Court. Provide the URL of the judgment.', marks: 8, order: 2 },
        { text: "### (c)\nDraft a structured Research Note of approximately 200 words addressing the following heads: Issue | Applicable Law | Supreme Court's Position | Whether the Rejection is Valid | Recommended Next Step (Refund Application / Writ Petition / Statutory Appeal).", marks: 6, order: 3 },
      ],
    },
    {
      text: 'A registered dealer in Mumbai has entered into a composite supply arrangement with a logistics company. The principal supply is transportation of goods, but the contract also includes packing and insurance services. The GST department contends that the packing and insurance services should be taxed independently at their respective rates.',
      order: 5,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nDefine 'composite supply' and 'mixed supply' under Section 2(30) and Section 2(74) of the CGST Act, 2017 respectively. How is the rate of tax determined for a composite supply? Illustrate with the facts of the present problem.", marks: 7, order: 1 },
        { text: '### (b)\nHas any High Court or the AAAR ruled on the classification of transportation-led composite supplies involving ancillary services? Identify and analyse one relevant authority.', marks: 7, order: 2 },
        { text: "### (c)\nPrepare a concise legal opinion (maximum 200 words) advising the registered dealer on the correct GST treatment of the composite supply and the appropriate ground of challenge against the department's contention.", marks: 6, order: 3 },
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
