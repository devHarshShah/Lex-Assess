import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding energy and infrastructure law practice area...');

  const specialization = await prisma.specialization.upsert({
    where: { name: 'Energy and Infrastructure Law' },
    update: {},
    create: {
      name: 'Energy and Infrastructure Law',
      isActive: true,
      sortOrder: 6,
    },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const paper = await prisma.questionPaper.upsert({
    where: {
      id:
        (
          await prisma.questionPaper.findFirst({
            where: { title: 'Energy and Infrastructure Law Assessment Examination', specializationId: specialization.id },
          })
        )?.id || 'placeholder-id-for-create',
    },
    update: {
      description: 'Comprehensive assessment covering the Electricity Act, land acquisition, environmental clearances, PPAs, and NHAI concession agreements.',
    },
    create: {
      specializationId: specialization.id,
      title: 'Energy and Infrastructure Law Assessment Examination',
      description: 'Comprehensive assessment covering the Electricity Act, land acquisition, environmental clearances, PPAs, and NHAI concession agreements.',
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
This section tests your foundational knowledge of Energy and Infrastructure Law.

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
- Five descriptive questions offered (Attempt any 4 out of 5)
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
- Knowledge Prerequisites: Electricity Act 2003, RFCTLARR Act 2013, Environment Protection Act 1986, National Green Tribunal Act 2010, NHAI Act 1988.
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
      description: 'Knowledge Test - 10 MCQs | 20 Marks. This section tests your foundational knowledge of Energy and Infrastructure Law. Closed-book, proctored.',
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
      text: 'Under the Electricity Act, 2003, the Appellate Tribunal for Electricity (APTEL) has jurisdiction to hear appeals from orders of:',
      options: ['CERC only', 'SERC only', 'Both CERC and SERC', 'CERC, SERC, and the Central Government'],
      answer: 'Both CERC and SERC',
      order: 1,
    },
    {
      text: 'The Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 provides that compensation for urban land acquired must be:',
      options: ['1× market value', '2× market value', '4× market value (rural) / 2× market value (urban)', '3× market value in all cases'],
      answer: '4× market value (rural) / 2× market value (urban)',
      order: 2,
    },
    {
      text: 'Under the Electricity Act, 2003, which body is empowered to issue licences for the transmission of electricity in inter-state transmission systems?',
      options: ['State Electricity Regulatory Commission (SERC)', 'Central Electricity Regulatory Commission (CERC)', 'Ministry of Power', 'Central Electricity Authority (CEA)'],
      answer: 'Central Electricity Regulatory Commission (CERC)',
      order: 3,
    },
    {
      text: 'Under the National Highway Authority of India Act, 1988, NHAI is empowered to levy and collect fees for services and facilities provided in connection with national highways under:',
      options: ['Section 14', 'Section 16', 'Section 11', 'Section 8A'],
      answer: 'Section 16',
      order: 4,
    },
    {
      text: "Under the Environment Protection Act, 1986, 'hazardous substance' is defined under:",
      options: ['Section 2(d)', 'Section 2(e)', 'Section 3(1)', 'Section 6(2)'],
      answer: 'Section 2(e)',
      order: 5,
    },
    {
      text: "The National Green Tribunal Act, 2010 vests the NGT with jurisdiction over 'substantial questions relating to environment'. This jurisdiction is conferred under:",
      options: ['Section 14', 'Section 15', 'Section 18', 'Section 22'],
      answer: 'Section 14',
      order: 6,
    },
    {
      text: "Under a standard Power Purchase Agreement (PPA) for renewable energy, a 'change in law' event typically entitles the affected party to:",
      options: [
        'Termination of the PPA immediately',
        'Compensation or tariff adjustment to restore the affected party to the same economic position',
        'Force majeure relief only',
        'An extension of the scheduled commercial operation date by a fixed 90 days',
      ],
      answer: 'Compensation or tariff adjustment to restore the affected party to the same economic position',
      order: 7,
    },
    {
      text: 'The Offshore Wind Energy Policy, 2015 vests the authority to develop offshore wind energy in India in:',
      options: [
        'Ministry of New and Renewable Energy (MNRE) in coordination with the Ministry of Shipping',
        'Ministry of Power',
        'Oil and Natural Gas Corporation (ONGC)',
        'National Institute of Wind Energy (NIWE) exclusively',
      ],
      answer: 'Ministry of New and Renewable Energy (MNRE) in coordination with the Ministry of Shipping',
      order: 8,
    },
    {
      text: "Under the model NHAI Concession Agreement, in the event of a 'Government Default', the concessionaire's termination payment is calculated primarily on the basis of:",
      options: [
        'Anticipated future profits for the remaining concession period',
        'Adjusted Equity plus debt due, as defined in the Concession Agreement',
        'Book value of assets at the time of termination',
        'The original project cost without any adjustment',
      ],
      answer: 'Adjusted Equity plus debt due, as defined in the Concession Agreement',
      order: 9,
    },
    {
      text: 'The Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016 were enacted under the powers conferred by:',
      options: [
        'The Water (Prevention and Control of Pollution) Act, 1974',
        'The Air (Prevention and Control of Pollution) Act, 1981',
        'The Environment (Protection) Act, 1986',
        'The Public Liability Insurance Act, 1991',
      ],
      answer: 'The Environment (Protection) Act, 1986',
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
      text: "A renewable energy developer has received a 'change in law' event claim from its off-taker (DISCOM), asserting that the introduction of new customs duties on solar panels constitutes a change in law in the DISCOM's favour. Your senior asks you to analyse what 'change in law' actually means in a Power Purchase Agreement and who typically benefits from such a clause.",
      order: 1,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nWhat is the standard definition of 'change in law' in CERC's Model Power Purchase Agreement? Provide the URL of the source. Who — the developer or the DISCOM — typically benefits when import duties on solar equipment are imposed, and why?", marks: 7, order: 1 },
        { text: "### (b)\nHas CERC or APTEL adjudicated upon the imposition of customs duty as a 'change in law' event in any decision after 2018? State the precise holding and provide the URL of the source.", marks: 8, order: 2 },
        { text: "### (c)\nIs the DISCOM's claim legally correct on the facts given? Draft a three-line update to your senior clearly stating your assessment and the recommended course of action.", marks: 5, order: 3 },
      ],
    },
    {
      text: 'Your senior is advising an NHAI highway concessionaire. The government has acquired the land for the highway project, but part of the land has forest cover requiring statutory Forest Clearance under the Forest (Conservation) Act, 1980. The clearance has been delayed by 18 months. The developer now wishes to terminate the Concession Agreement and claim compensation.',
      order: 2,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nUnder a standard NHAI Concession Agreement, what are the conditions that must be satisfied for a concessionaire to exercise a termination right on account of the government's failure to deliver land or obtain clearances? What notice period is required before termination can be effected? Identify the relevant termination clause.", marks: 6, order: 1 },
        { text: '### (b)\nWhat compensation is the concessionaire entitled to receive upon termination for government default? Set out all steps of the compensation calculation formula in sequence and identify the exact clause and source document from which the formula is derived.', marks: 8, order: 2 },
        { text: '### (c)\nIdentify one judicial or arbitral authority on a factually similar issue. Provide the full case citation and the URL of the judgment or award.', marks: 3, order: 3 },
        { text: '### (d)\nShould the developer terminate the Concession Agreement immediately or seek an extension and invoke the force majeure provisions? Draft a two-line reasoned recommendation.', marks: 3, order: 4 },
      ],
    },
    {
      text: 'A thermal power plant is being permanently shut down by its owner. Environmental activists seek to ensure that the site is fully remediated. Your senior asks you to advise on the legal obligations of the plant owner upon decommissioning.',
      order: 3,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nWhat are the legal obligations of a thermal power plant owner upon permanent closure under each of the following: (i) the Environment (Protection) Act, 1986; (ii) the Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016; and (iii) applicable CERC regulations? For each head, cite the exact section or rule number and state the specific obligation it imposes.', marks: 10, order: 1 },
        { text: '### (b)\nWhich regulatory authority or tribunal has the power to compel site remediation following the shutdown of a thermal power plant? Has the National Green Tribunal (NGT) passed any order specifically dealing with thermal power plant decommissioning or site remediation? Identify that order and provide the URL.', marks: 6, order: 2 },
        { text: "### (c)\nDraft a concise three-point compliance checklist for the plant owner, listing the three most critical immediate actions it must take to avoid regulatory liability upon announcing the plant's closure.", marks: 4, order: 3 },
      ],
    },
    {
      text: "Your senior has been invited to deliver a talk on 'Offshore Wind Law in India' and has asked you to prepare comprehensive briefing notes on the current regulatory framework.",
      order: 4,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nWhat is the current legal and regulatory framework governing offshore wind energy development in India? In your answer, identify: (i) the lead ministry and relevant government bodies; (ii) the primary policy document(s); (iii) the statute(s) under which authorisations are granted; and (iv) the role of CERC/SERC in tariff regulation. Answer in approximately 250 words and provide the URL of your primary source.', marks: 10, order: 1 },
        { text: '### (b)\nWhat are the key challenges currently facing offshore wind energy development in India from a legal and regulatory perspective? Identify at least three specific legal or procedural bottlenecks and propose a reform for each.', marks: 6, order: 2 },
        { text: '### (c)\nCompare, in a maximum of 150 words, the regulatory framework for offshore wind in India with that of any one other jurisdiction (e.g., the United Kingdom or Germany), highlighting two key differences.', marks: 4, order: 3 },
      ],
    },
    {
      text: 'A state government proposes to acquire 500 acres of agricultural land for a greenfield solar power park. The affected farmers challenge the acquisition proceedings before the High Court, contending that the Social Impact Assessment (SIA) was not conducted and that the compensation offered is inadequate.',
      order: 5,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nUnder the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013, when is a Social Impact Assessment mandatory? Which authority conducts it and within what time frame? What are the legal consequences of omitting the SIA? Cite the exact section numbers.', marks: 8, order: 1 },
        { text: "### (b)\nHow is compensation for acquired agricultural land calculated under the 2013 Act? Set out each component of compensation — including the multiplier applicable to rural land — with reference to the precise section of the Act. Is the farmers' contention on inadequacy of compensation likely to succeed?", marks: 7, order: 2 },
        { text: '### (c)\nHas the Supreme Court of India or any High Court upheld a challenge to land acquisition on the ground of non-compliance with the SIA requirement? Identify one such authority with full citation and, if available, the URL of the judgment. Briefly state how it applies to the present facts.', marks: 5, order: 3 },
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
