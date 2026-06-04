import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding maritime practice area...');

  // 1. Ensure "Maritime and Aviation" specialization exists
  const specialization = await prisma.specialization.upsert({
    where: { name: 'Maritime and Aviation' },
    update: {},
    create: {
      name: 'Maritime and Aviation',
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  // 2. Create/Update Question Paper
  const paper = await prisma.questionPaper.upsert({
    where: {
      // Assuming title + specializationId is a good enough identifier for this script, 
      // but since we don't have a unique constraint on those, we'll find first or create.
      // For a robust seed, we'll try to find by title.
      id: (await prisma.questionPaper.findFirst({ 
        where: { title: 'Maritime Law Assessment Examination', specializationId: specialization.id } 
      }))?.id || 'placeholder-id-for-create'
    },
    update: {
      description: 'Comprehensive assessment covering Admiralty Jurisdiction, Carriage of Goods by Sea, Marine Insurance, and Merchant Shipping laws.',
    },
    create: {
      specializationId: specialization.id,
      title: 'Maritime Law Assessment Examination',
      description: 'Comprehensive assessment covering Admiralty Jurisdiction, Carriage of Goods by Sea, Marine Insurance, and Merchant Shipping laws.',
    },
  });

  console.log(`Using paper: ${paper.title} (${paper.id})`);

  // 3. Create Version
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
This section tests your foundational knowledge of Maritime Law.

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
- Maximum 400 words per answer.
- All four questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: Admiralty Act 2017, Hague Rules, Merchant Shipping Act 1958, Marine Insurance Act 1963.
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

  // Clear existing sections and questions for this version to ensure a clean seed
  await prisma.paperSection.deleteMany({ where: { versionId: version.id } });
  await prisma.question.deleteMany({ where: { versionId: version.id } });

  // 4. Create Section A
  const sectionA = await prisma.paperSection.create({
    data: {
      versionId: version.id,
      title: 'SECTION A — MULTIPLE CHOICE QUESTIONS',
      description: 'Knowledge Test - 10 MCQs | 20 Marks. This section tests your foundational knowledge of Maritime Law. Closed-book, proctored.',
      order: 1,
      rules: {
        allowTabSwitching: false,
        allowExternalResources: false,
        maxViolations: 5,
        timeLimitSeconds: 600, // 10 minutes
      },
    },
  });

  // 5. Create Section B
  const sectionB = await prisma.paperSection.create({
    data: {
      versionId: version.id,
      title: 'SECTION B — DESCRIPTIVE / APPLIED QUESTIONS',
      description: 'Research & Analysis - Attempt any 4 questions | 80 Marks. Research is permitted and expected.',
      order: 2,
      rules: {
        allowTabSwitching: true,
        allowExternalResources: true,
        wordLimit: 400,
        questionsToAttempt: 4,
      },
    },
  });

  // 6. Add Questions to Section A
  const mcqs = [
    {
      text: 'Under the Admiralty (Jurisdiction and Settlement of Maritime Claims) Act, 2017, which of the following High Courts has jurisdiction to try admiralty suits?',
      options: [
        'Only the High Court of Bombay',
        'The High Courts of Bombay, Calcutta, Madras, Karnataka, and Kerala',
        'All High Courts in India',
        'Only the Supreme Court of India in original jurisdiction'
      ],
      answer: 'The High Courts of Bombay, Calcutta, Madras, Karnataka, and Kerala',
      order: 1
    },
    {
      text: 'Under the Admiralty (Jurisdiction and Settlement of Maritime Claims) Act, 2017, a maritime lien can be enforced by means of:',
      options: [
        'A suit in personam against the shipowner only',
        'A suit in rem against the vessel',
        'A writ petition before the High Court',
        'An application before the Directorate General of Shipping'
      ],
      answer: 'A suit in rem against the vessel',
      order: 2
    },
    {
      text: "Under the Carriage of Goods by Sea Act, 1925 (incorporating the Hague Rules), the carrier's standard liability limit per package is:",
      options: [
        'USD 100 per package',
        'USD 500 per package',
        'GBP 100 sterling per package',
        'SDR 666.67 per package'
      ],
      answer: 'GBP 100 sterling per package',
      order: 3
    },
    {
      text: 'The Merchant Shipping Act, 1958 gives effect in India to which international convention on limitation of liability for maritime claims?',
      options: [
        'The Athens Convention, 1974',
        'The International Convention on Civil Liability for Oil Pollution Damage (CLC), 1969',
        'The Convention on Limitation of Liability for Maritime Claims (LLMC), 1976',
        'The Hamburg Rules, 1978'
      ],
      answer: 'The Convention on Limitation of Liability for Maritime Claims (LLMC), 1976',
      order: 4
    },
    {
      text: 'Under the Admiralty Act, 2017, a vessel arrested in a maritime claim may be released on:',
      options: [
        'Payment of the full amount of the claim into court',
        'Furnishing of a bail bond, bank guarantee, or other sufficient security to the satisfaction of the court',
        'An undertaking by the shipowner\'s P&I Club alone',
        'An ex-parte application by the vessel\'s agent'
      ],
      answer: 'Furnishing of a bail bond, bank guarantee, or other sufficient security to the satisfaction of the court',
      order: 5
    },
    {
      text: 'Under Article IV Rule 2 of the Hague Rules, the carrier is NOT responsible for loss or damage arising from:',
      options: [
        'Failure to properly man, equip, and supply the ship',
        'Act, neglect, or default of the master in the navigation or management of the ship',
        'Improper stowage carried out by the carrier\'s servants',
        'Unseaworthiness existing at the commencement of the voyage'
      ],
      answer: 'Act, neglect, or default of the master in the navigation or management of the ship',
      order: 6
    },
    {
      text: 'The doctrine of constructive total loss in marine insurance is governed in India under:',
      options: [
        'Marine Insurance Act, 1963, Section 60',
        'Merchant Shipping Act, 1958, Section 352',
        'Admiralty Act, 2017, Section 4',
        'Insurance Act, 1938, Section 64VB'
      ],
      answer: 'Marine Insurance Act, 1963, Section 60',
      order: 7
    },
    {
      text: 'Under the Merchant Shipping Act, 1958, the Directorate General of Shipping is empowered to conduct a formal investigation into a shipping casualty under:',
      options: [
        'Section 270',
        'Section 304',
        'Section 358',
        'Section 411'
      ],
      answer: 'Section 358',
      order: 8
    },
    {
      text: 'A demise charter (bareboat charter) is one in which:',
      options: [
        'The shipowner retains possession and control of the vessel',
        'The charterer takes full possession and control of the vessel and becomes the employer of the crew',
        'The vessel is chartered for a single voyage only',
        'The charterer is entitled to a lien on the cargo for unpaid freight'
      ],
      answer: 'The charterer takes full possession and control of the vessel and becomes the employer of the crew',
      order: 9
    },
    {
      text: 'Under Indian admiralty law, which of the following claims constitutes a maritime lien that takes priority over all other claims, including a mortgage on the vessel?',
      options: [
        'A claim for unpaid port dues',
        'A claim for damage caused by the vessel (collision)',
        'A claim by a cargo owner for damage to goods',
        'A claim for unpaid charter hire'
      ],
      answer: 'A claim for damage caused by the vessel (collision)',
      order: 10
    }
  ];

  for (const q of mcqs) {
    const formattedOptions = q.options.map((opt, i) => ({
      id: String.fromCharCode(65 + i),
      text: opt
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
      text: "A shipping company's vessel has been arrested at Mumbai Port at the instance of a bunker fuel supplier for unpaid dues. The registered owner of the vessel contends that the fuel was purchased by the time charterer, not by the owner, and that the vessel cannot therefore be arrested for the charterer's debt.",
      order: 1,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nUnder the Admiralty (Jurisdiction and Settlement of Maritime Claims) Act, 2017, which categories of maritime claims give rise to a right of arrest? Is a claim for unpaid bunker fuel supplied to a vessel one such claim? Identify the specific section number and relevant ground(s).", marks: 7, order: 1 },
        { text: "### (b)\nUnder the Admiralty Act, 2017, can a vessel be arrested for debts incurred by a charterer rather than the registered owner? What is the statutory position? Has any Indian High Court adjudicated this question after enactment of the 2017 Act? State: Full case name, Precise holding, URL.", marks: 7, order: 2 },
        { text: "### (c)\nCan the registered owner successfully apply for release of the vessel from arrest? What must the owner demonstrate? Identify: Applicable statutory provision, Relevant judicial authority, Documents required.", marks: 6, order: 3 }
      ]
    },
    {
      text: "A vessel owned by your client was involved in a collision with a fishing boat off the Kerala coast. Three fishermen died. The shipowner now faces: 1. Criminal investigation by Coast Guard and police, 2. Civil liability claims, 3. Inquiry by Directorate General of Shipping.",
      order: 2,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nIdentify every statute and international convention that could create criminal or civil liability. Include: Merchant Shipping Act, 1958; Bharatiya Nyaya Sanhita, 2023; Territorial Waters, Continental Shelf, Exclusive Economic Zone and Other Maritime Zones Act, 1976; Relevant international conventions. State exact sections/articles and liability created.", marks: 8, order: 1 },
        { text: "### (b)\nIs the shipowner entitled to limit liability under the Merchant Shipping Act, 1958? State: Relevant section, Limitation regime, Current limitation fund for vessel of 5,000 GRT, Judicial authority and URL.", marks: 7, order: 2 },
        { text: "### (c)\nDraft a structured 150-word action plan covering the first 72 hours after the collision.", marks: 5, order: 3 }
      ]
    },
    {
      text: "Your client, a cargo owner, has received a consignment in severely damaged condition. Total loss: USD 1.5 million. Bill of Lading contains a clause limiting liability to USD 500 per package. Consignment comprises 100 packages.",
      order: 3,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nIs the USD 500-per-package limitation valid under the Carriage of Goods by Sea Act, 1925 (Hague Rules)? Draft a 150-word note citing exact section and rule.", marks: 4, order: 1 },
        { text: "### (b)\nWhen can a cargo owner break the contractual limitation of liability? Define: Fundamental breach, Reckless conduct. Draft a 250-word note with citations.", marks: 4, order: 2 },
        { text: "### (c)\nCurrent Indian judicial position on challenges to Bill of Lading limitation clauses. Provide: Full case citation, URL, Precise holding.", marks: 4, order: 3 },
        { text: "### (d)\nDraft: 1. Jurisdiction paragraph, 2. Cause of action paragraph, 3. Challenge to limitation clause, 4. Claim for USD 1.5 million, 5. Prayer clause seeking arrest of vessel. (Maximum four lines per paragraph)", marks: 5, order: 4 },
        { text: "### (e)\nDraft a recommended litigation strategy (~200 words) addressing: Choice of forum, Challenge to limitation clause, Prospects of recovery beyond USD 50,000, Pre-suit steps.", marks: 3, order: 5 }
      ]
    },
    {
      text: "A bulk carrier insured under a Marine Cargo Policy ran aground off Goa. Repair cost: ₹18 crore. Insured value: ₹20 crore. Insurer argues: 1. Master's negligence amounts to wilful misconduct, 2. Vessel is not a constructive total loss.",
      order: 4,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nUnder the Marine Insurance Act, 1963: Define constructive total loss, State exact section, Determine whether facts constitute constructive total loss.", marks: 7, order: 1 },
        { text: "### (b)\nCan insurer repudiate for wilful misconduct? Does master's negligence amount to wilful misconduct of assured? State: Relevant section, Judicial authority, URL.", marks: 7, order: 2 },
        { text: "### (c)\nDraft a three-point legal opinion covering: 1. Whether CTL claim is sustainable, 2. Whether wilful misconduct defence is tenable, 3. Recommended next step (negotiation/arbitration/suit).", marks: 6, order: 3 }
      ]
    },
    {
      text: "A shipowner entered into a voyage charterparty for carriage of coal from Visakhapatnam to Colombo. Terms: Laytime: 5 weather working days, Demurrage: USD 8,000/day. Vessel detained 11 days due to: Port congestion, Strike by port workers. Charterer claims delay is covered by: WIBON clause, Strike exception clause.",
      order: 5,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nDefine: Laytime, Demurrage, Despatch. When does laytime commence under a standard voyage charterparty? What is the effect of a WIBON clause?", marks: 7, order: 1 },
        { text: "### (b)\nDoes a strike interrupt laytime or demurrage? Distinguish between: Effect on laytime, Effect on demurrage. Provide authority and URL.", marks: 7, order: 2 },
        { text: "### (c)\nAdvise the shipowner: 1. Calculate demurrage if exceptions do not apply, 2. Strongest argument against strike exception, 3. Draft a two-line demurrage notice.", marks: 6, order: 3 }
      ]
    }
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
