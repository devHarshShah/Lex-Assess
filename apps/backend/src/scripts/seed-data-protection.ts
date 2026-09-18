import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding data protection law practice area...');

  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'Data Protection' },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const paper = await prisma.questionPaper.upsert({
    where: {
      id:
        (
          await prisma.questionPaper.findFirst({
            where: { title: 'Data Protection Law Assessment Examination', specializationId: specialization.id },
          })
        )?.id || 'placeholder-id-for-create',
    },
    update: {
      description: 'Comprehensive assessment covering the DPDP Act 2023, GDPR, IT Act 2000, and Aadhaar Act 2016.',
    },
    create: {
      specializationId: specialization.id,
      title: 'Data Protection Law Assessment Examination',
      description: 'Comprehensive assessment covering the DPDP Act 2023, GDPR, IT Act 2000, and Aadhaar Act 2016.',
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
This section tests your foundational knowledge of Data Protection Law.

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
- Four descriptive questions, all compulsory
- 20 marks each
- Total: 80 marks

### Time Allocation
- Total paper time: 3 hours
- Suggested Section B: 170 minutes

### Key Rules
- Research is permitted. Internet, legal databases, and statutes may be consulted.
- Cite specific statutory provisions in your answers; generic theoretical answers will not receive full marks.
- All four questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: Digital Personal Data Protection Act 2023, GDPR, Information Technology Act 2000, Aadhaar Act 2016.
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
      description: 'Knowledge Test - 10 MCQs | 20 Marks. This section tests your foundational knowledge of Data Protection Law. Closed-book, proctored.',
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
      title: 'SECTION B — DESCRIPTIVE QUESTIONS',
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
      text: 'Under the Digital Personal Data Protection Act, 2023 (DPDP Act), which of the following is NOT listed as a ground for processing personal data without the consent of the Data Principal?',
      options: [
        'Performance of a contract to which the Data Principal is a party',
        'Compliance with a legal obligation of the Data Fiduciary',
        'Protection of the vital interests of the Data Principal',
        'Furtherance of the legitimate interests of the Data Fiduciary',
      ],
      answer: 'Furtherance of the legitimate interests of the Data Fiduciary',
      order: 1,
    },
    {
      text: "The DPDP Act, 2023 defines 'personal data' as any data about an individual who is identifiable by or in relation to such data. Which of the following statements is CORRECT regarding publicly available data?",
      options: [
        'Publicly available data is entirely excluded from the definition of personal data under the DPDP Act',
        'Publicly available data remains personal data if the individual is identifiable from it',
        'Processing publicly available data never requires consent under any circumstance',
        'The DPDP Act does not regulate the processing of data obtained from public sources',
      ],
      answer: 'Publicly available data remains personal data if the individual is identifiable from it',
      order: 2,
    },
    {
      text: 'Under GDPR Article 3, which scenario triggers the extra-territorial application of GDPR to a non-EU entity?',
      options: [
        'The entity is incorporated in a country that has a trade agreement with the EU',
        'The entity processes personal data of data subjects who are in the EU, in the context of offering goods or services to them',
        "The entity's parent company is registered in an EU member state",
        'The entity stores data on servers physically located within the EU',
      ],
      answer: 'The entity processes personal data of data subjects who are in the EU, in the context of offering goods or services to them',
      order: 3,
    },
    {
      text: 'Under the IT (The Indian Computer Emergency Response Team and Manner of Performing Functions and Duties) Rules, 2013, what is the mandatory time limit within which a service provider must report a cyber security incident to CERT-In?',
      options: [
        '24 hours of becoming aware of the incident',
        '6 hours of becoming aware of the incident',
        '72 hours of becoming aware of the incident',
        '48 hours of becoming aware of the incident',
      ],
      answer: '6 hours of becoming aware of the incident',
      order: 4,
    },
    {
      text: "Which of the following is a key requirement for valid 'consent' under the DPDP Act, 2023, that is NOT explicitly required under a standard contractual click-through agreement?",
      options: [
        'Written form',
        'Free, specific, informed, unconditional, and unambiguous consent through a clear affirmative action',
        'Witnessed by a third party',
        'Approval by the Data Protection Board',
      ],
      answer: 'Free, specific, informed, unconditional, and unambiguous consent through a clear affirmative action',
      order: 5,
    },
    {
      text: "India and the European Commission's adequacy decision relationship, as of 2024, is best described as:",
      options: [
        'India has received a full adequacy decision, making data transfers from the EU unrestricted',
        'India has received a partial adequacy decision covering only financial data',
        'India has not received an adequacy decision; transfers must rely on mechanisms such as Standard Contractual Clauses (SCCs)',
        'India has received an adequacy decision only for government-to-government data transfers',
      ],
      answer: 'India has not received an adequacy decision; transfers must rely on mechanisms such as Standard Contractual Clauses (SCCs)',
      order: 6,
    },
    {
      text: 'Section 43A of the Information Technology Act, 2000 applies to a body corporate that possesses, deals with, or handles sensitive personal data or information and is negligent in implementing reasonable security practices. What is the consequence?',
      options: [
        'Criminal imprisonment up to 3 years',
        'Compensation payable to the affected person',
        "Automatic cancellation of the body corporate's business licence",
        'A mandatory audit by CERT-In',
      ],
      answer: 'Compensation payable to the affected person',
      order: 7,
    },
    {
      text: 'Under the Aadhaar Act, 2016, which entity is PROHIBITED from using the Aadhaar number as a proof of identity?',
      options: [
        'Banks for KYC purposes under RBI directives',
        'Any private entity not specifically authorised by law',
        'Government welfare departments distributing subsidies',
        'UIDAI itself for authentication purposes',
      ],
      answer: 'Any private entity not specifically authorised by law',
      order: 8,
    },
    {
      text: "GDPR provides data subjects with a 'right to explanation' for automated decision-making under Article 22. The DPDP Act, 2023 in comparison:",
      options: [
        'Contains an identical provision to GDPR Article 22',
        'Provides a general right to information about processing but does not contain a specific automated decision-making provision equivalent to GDPR Article 22',
        'Completely prohibits automated decision-making for employment purposes',
        'Delegates the regulation of automated decision-making entirely to the Data Protection Board',
      ],
      answer: 'Provides a general right to information about processing but does not contain a specific automated decision-making provision equivalent to GDPR Article 22',
      order: 9,
    },
    {
      text: "Under the DPDP Act, 2023, a 'Consent Manager' is best described as:",
      options: [
        'An officer appointed within a company to oversee data protection compliance',
        'A registered entity that enables a Data Principal to give, manage, review, and withdraw consent through an accessible platform',
        "The Data Protection Board's designated officer for handling consent disputes",
        'A mandatory appointment required for all Significant Data Fiduciaries',
      ],
      answer: 'A registered entity that enables a Data Principal to give, manage, review, and withdraw consent through an accessible platform',
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
      text: "Your senior forwards you the following message from a client at 10 AM: \"We operate a UPI payments application. We collect the following categories of data from our users: (1) mobile number, (2) bank account details, (3) transaction history, (4) device ID and location at the time of payment, and (5) a selfie photograph for KYC purposes. We understand that the Digital Personal Data Protection Act, 2023 (DPDP Act) is now in force. Our Chief Technology Officer wishes to know: do all five categories of data require user consent for processing? Or are some of them permissible without consent? Additionally, our legal team in 2021 obtained user consent through a 'I agree to our Privacy Policy' click-through during onboarding. Does that constitute valid consent under the new law?\"",
      order: 1,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nAdvise the client on whether each of the five categories of data requires consent under the DPDP Act, 2023, or whether any category may be processed on an alternative lawful ground. Identify the relevant provision for each category.', marks: 10, order: 1 },
        { text: "### (b)\nThe client's 2021 consent was obtained through a single Privacy Policy click-through that covered 47 different data uses in one action. Under the DPDP Act, valid consent must be free, specific, informed, unconditional, and unambiguous, manifested through a clear affirmative action. Is this 2021 click-through valid consent under the Act? Give your reasoned answer in no more than five sentences.", marks: 10, order: 2 },
      ],
    },
    {
      text: "A start-up has built an AI-powered hiring tool that operates as follows: candidates apply online; the AI system scans their curriculum vitae, accesses their LinkedIn profile, reviews their public social media posts going back three years, and generates a 'hiring score' that is presented to the recruiter. Candidates are not informed that an AI system is involved — they are led to believe that a human reviewer is assessing their application.\n\nThe start-up's founder consults your senior: 'Is any of this illegal under Indian law? We are not storing any sensitive personal data — we are only using publicly available information from the internet.'\n\nYour senior instructs you: 'Do not simply describe what the DPDP Act says in theory. Identify the specific problems with what this company is actually doing and assess the legal risk.'",
      order: 2,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nIdentify three specific legal violations arising from the operation of this AI hiring tool under the DPDP Act, 2023. For each violation, state the specific section breached and explain precisely why this particular practice triggers that provision. Generic statements that 'consent is required' will not be accepted.", marks: 9, order: 1 },
        { text: "### (b)\nThe founder argues: 'LinkedIn profiles and public tweets are publicly available — there is no \"collection\" of personal data because the information is already in the public domain.' Assess whether this argument is correct under the DPDP Act's definitions of 'personal data' and 'processing'. Answer in no more than four sentences.", marks: 5, order: 2 },
        { text: '### (c)\nThe DPDP Act, 2023 does not currently contain a specific provision on automated decision-making comparable to Article 22 of the GDPR. Does this absence mean the start-up is entirely safe from legal challenge regarding its AI-generated hiring scores? Identify any alternative law or legal principle that a rejected candidate could invoke to challenge the AI score.', marks: 6, order: 3 },
      ],
    },
    {
      text: "Read the following scenario carefully. There is a specific legal problem embedded within it.\n\nA hospital chain with 12 branches across India suffered a ransomware attack last Tuesday at 3:00 PM. By 5:00 PM, the hospital had confirmed that the attackers had accessed patient records — including names, diagnoses, prescriptions, and Aadhaar numbers — of approximately 85,000 patients. The Chief Information Security Officer reported the breach to the Chief Executive Officer at 6:00 PM. The CEO decided NOT to report the incident to CERT-In or to any other regulator. His reasoning: 'The data has not been published by the attackers yet. If we report it publicly, patient trust will be destroyed. We will fix the systems first and then decide.' By Thursday morning — 38 hours after the initial attack — the attackers had published 10,000 patient records on a dark web forum. The CEO then reported the incident to CERT-In on Thursday afternoon.\n\nYour senior instructs you: 'How many legal violations has this CEO committed, and what is the hospital's total legal exposure? I need to advise the Board today.'",
      order: 3,
      marks: 20,
      subQuestions: [
        { text: '### (a)\nThe CEO failed to report the incident to CERT-In within 6 hours of becoming aware of it. State the exact statutory provision violated and its consequence. Is this a criminal or civil liability?', marks: 6, order: 1 },
        { text: '### (b)\nUnder the DPDP Act, 2023, was the hospital obligated to notify the Data Protection Board and the affected patients? Identify the relevant provision and explain what the hospital was required to do and when.', marks: 7, order: 2 },
        { text: "### (c)\nThe leaked data included the patients' Aadhaar numbers. Does the Aadhaar Act, 2016 impose any separate obligation on the hospital beyond those under the DPDP Act and the CERT-In reporting requirement? State the specific provision and the applicable penalty.", marks: 7, order: 3 },
      ],
    },
    {
      text: "Your senior is advising an Indian company that processes the personal data of European Union (EU) residents. The company provides customer support services to a European retail brand from its office in India, receiving EU customer data on a daily basis — including names, purchase history, complaint records, and email addresses.\n\nThe company's management has made the following two assumptions:\n\nAssumption 1: 'We are an Indian company, operating from India. The GDPR is a European law. It cannot apply to us.'\nAssumption 2: 'The DPDP Act is now in force in India. If we comply with the DPDP Act, we are automatically compliant with the GDPR as well.'\n\nYour senior instructs you: 'Prepare a note disproving both assumptions. Then tell me what this company actually needs to do.'",
      order: 4,
      marks: 20,
      subQuestions: [
        { text: "### (a)\nDisprove Assumption 1. Does the GDPR apply to an Indian company that processes EU residents' personal data from India? Base your answer specifically on Article 3 of the GDPR (territorial scope) and state clearly whether this company falls within its ambit.", marks: 5, order: 1 },
        { text: '### (b)\nDisprove Assumption 2. Identify five specific areas where compliance with the DPDP Act does NOT equal compliance with the GDPR. For each area, provide a concrete difference (not a general statement) and state one practical consequence for this company.', marks: 8, order: 2 },
        { text: "### (c)\nThis company receives EU customer data into India. Under the GDPR, this constitutes a 'transfer to a third country.' Has India received an adequacy decision from the European Commission? If not, what transfer mechanism must the company and its EU client put in place to ensure lawful data transfers?", marks: 4, order: 3 },
        { text: '### (d)\nDraft the one-page advisory note that your senior will send to the company\'s management explaining what the company actually needs to do. The note must be written for a non-lawyer CEO — clear, direct, and free from legal jargon.', marks: 3, order: 4 },
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
