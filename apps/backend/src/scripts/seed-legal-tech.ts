import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding legal tech law practice area...');

  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'Technology' },
  });

  console.log(
    `Using specialization: ${specialization.name} (${specialization.id})`,
  );

  const description =
    'Covers the IT Act 2000, DPDP Act 2023, Indian Contract Act 1872 and Companies Act 2013 as they apply to AI, platforms and technology companies.';

  const paper = await prisma.questionPaper.upsert({
    where: {
      id:
        (
          await prisma.questionPaper.findFirst({
            where: {
              title: 'Legal Tech Law Assessment Examination',
              specializationId: specialization.id,
            },
          })
        )?.id || 'placeholder-id-for-create',
    },
    update: { description },
    create: {
      specializationId: specialization.id,
      title: 'Legal Tech Law Assessment Examination',
      description,
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

# SECTION A — MULTIPLE CHOICE QUESTIONS
**10 MCQs | 20 Marks**
This section tests your foundational knowledge of Legal Tech Law.

### Format
- 10 Multiple Choice Questions (MCQs), all compulsory
- 2 marks each
- Total: 20 marks

### Time Allocation
- 60 seconds per question
- Total time: 10 minutes

### Key Rules
- No AI tools are permitted for this section. Candidates must answer from their own legal knowledge.
- You cannot use external resources.
- No websites, documents, or reference materials may be opened.
- You cannot navigate away from the question paper.
- Opening another browser tab, website, or application will register as an unfair practice.
- The paper will automatically close after 5 violations.
- Section A must be attempted in one sitting.

---

# SECTION B — DESCRIPTIVE / APPLIED QUESTIONS
**4 Questions | 80 Marks**
This section tests your ability to apply knowledge, conduct legal research, and analyse case scenarios.

### Format
- Eight descriptive questions offered (Attempt any 4 out of 8)
- 20 marks each
- Total: 80 marks

### Time Allocation
- Total paper time: 3 hours
- Suggested Section B: 170 minutes

### Note to Candidates
You may take the assistance of AI tools while answering this section. However, please note that other candidates may also be using similar tools. Accordingly, marks will not be awarded merely for language or presentation, but for the accuracy, precision, depth of analysis, and the quality of your independent application of mind. Candidates are expected to demonstrate clear reasoning, sound judgment, and an ability to apply legal and factual principles effectively.

### Common Instructions
a) Indian law must be applied to all factual situations.
b) Advise the client, address the strongest argument against your position and recommend a practical course of action.
c) Support material propositions with primary sources and distinguish settled law from your own interpretation.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: Information Technology Act 2000, Digital Personal Data Protection Act 2023, Indian Contract Act 1872, Companies Act 2013.
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
      description:
        'Knowledge Test - 10 MCQs | 20 Marks. All questions compulsory. No AI tools permitted - closed-book, proctored.',
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
      description:
        'Research & Analysis - Attempt any 4 of 8 questions | 80 Marks. AI tools and research permitted.',
      order: 2,
      rules: {
        allowTabSwitching: true,
        allowExternalResources: true,
        questionsToAttempt: 4,
      },
    },
  });

  const mcqs = [
    {
      text: "Under Section 79(2)(b) of the Information Technology Act, 2000, an intermediary's safe harbour is available only if it does NOT:",
      options: [
        'charge users any fee for its service',
        'initiate the transmission, select the receiver of the transmission, and select or modify the information contained in the transmission',
        'store any information on its own servers',
        'operate from outside India',
      ],
      answer:
        'initiate the transmission, select the receiver of the transmission, and select or modify the information contained in the transmission',
      order: 1,
    },
    {
      text: 'Which decision read down the "actual knowledge" requirement in Section 79(3)(b) of the IT Act to mean knowledge through a court order or a government notification?',
      options: [
        'K.S. Puttaswamy v. Union of India',
        'Anuradha Bhasin v. Union of India',
        'Shreya Singhal v. Union of India',
        'Maneka Gandhi v. Union of India',
      ],
      answer: 'Shreya Singhal v. Union of India',
      order: 2,
    },
    {
      text: 'Under Section 3(c)(ii) of the Digital Personal Data Protection Act, 2023, the Act does NOT apply to personal data made publicly available by:',
      options: [
        'any person, so long as it is accessible without logging in',
        'a Data Fiduciary for commercial purposes',
        'a recruitment agency acting on behalf of a Data Principal',
        'the Data Principal to whom it relates, or any other person under a legal obligation to publish it',
      ],
      answer:
        'the Data Principal to whom it relates, or any other person under a legal obligation to publish it',
      order: 3,
    },
    {
      text: 'Under Section 11 of the IT Act, 2000, an electronic record is attributed to the originator if it was sent by:',
      options: [
        'the originator personally, and no one else',
        'the originator, a person authorised to act on his behalf, or an information system programmed by or on behalf of the originator to operate automatically',
        "any person having access to the originator's computer resource",
        "any person who has been issued the originator's electronic signature certificate",
      ],
      answer:
        'the originator, a person authorised to act on his behalf, or an information system programmed by or on behalf of the originator to operate automatically',
      order: 4,
    },
    {
      text: "Under Section 237 of the Indian Contract Act, 1872, a principal is bound by an agent's unauthorised act where:",
      options: [
        "the principal has, by words or conduct, induced the third person to believe that the act was within the agent's authority",
        'the act was commercially beneficial to the principal',
        'the agent acted in good faith',
        'the contract was reduced to writing',
      ],
      answer:
        "the principal has, by words or conduct, induced the third person to believe that the act was within the agent's authority",
      order: 5,
    },
    {
      text: 'Which provision of the DPDP Act, 2023 sets out the "certain legitimate uses" for which personal data may be processed without consent, including for employment purposes?',
      options: ['Section 4', 'Section 6', 'Section 7', 'Section 8'],
      answer: 'Section 7',
      order: 6,
    },
    {
      text: "Under the DPDP Act, 2023, the Data Principal's right to correction and erasure of personal data is provided in:",
      options: ['Section 9', 'Section 10', 'Section 11', 'Section 12'],
      answer: 'Section 12',
      order: 7,
    },
    {
      text: 'In V.B. Rangaraj v. V.B. Gopalakrishnan (1992), the Supreme Court held that a restriction on the transfer of shares, agreed privately between shareholders but not contained in the articles of association, is:',
      options: [
        'fully binding, since a private agreement overrides the articles',
        'binding only if registered with the Registrar of Companies',
        'unenforceable, because such restrictions must be contained in the articles',
        'binding only on the promoters of the company',
      ],
      answer:
        'unenforceable, because such restrictions must be contained in the articles',
      order: 8,
    },
    {
      text: 'Which provision of the Companies Act, 2013 requires a director to avoid a situation in which he has a direct or indirect interest that conflicts, or possibly may conflict, with the interest of the company?',
      options: ['Section 166', 'Section 149', 'Section 188', 'Section 447'],
      answer: 'Section 166',
      order: 9,
    },
    {
      text: 'Criminal liability under Section 66 of the IT Act, 2000 for an act mentioned in Section 43 (such as unauthorised access) additionally requires that the act be done:',
      options: [
        'without any technical barrier being circumvented',
        'causing loss exceeding Rs. 1 lakh',
        'after written notice from the owner of the computer resource',
        'dishonestly or fraudulently',
      ],
      answer: 'dishonestly or fraudulently',
      order: 10,
    },
  ];

  for (const q of mcqs) {
    const answerIndex = q.options.indexOf(q.answer);
    if (answerIndex === -1) {
      throw new Error(`MCQ ${q.order}: answer does not match any option`);
    }
    const formattedOptions = q.options.map((opt, i) => ({
      id: String.fromCharCode(65 + i),
      text: opt,
    }));

    await prisma.question.create({
      data: {
        versionId: version.id,
        sectionId: sectionA.id,
        type: QuestionType.MCQ,
        text: q.text,
        marks: 2,
        options: formattedOptions,
        answer: String.fromCharCode(65 + answerIndex),
        order: q.order,
      },
    });
  }

  const descriptiveQuestions = [
    {
      text: 'QUESTION 1 — AI Search, Hallucinated Defamation and Intermediary Safe Harbour\n\nAn Indian startup operates an AI search engine that retrieves third-party webpages and generates answers with source links. In response to a question about a businessman, it combines two unrelated articles and falsely states that he was convicted of fraud. Neither source makes that allegation. The businessman sends a legal notice demanding removal, compensation and disclosure of users who searched his name. The startup argues that it merely facilitates access to third-party information and claims intermediary protection under the Information Technology Act, 2000.\n\nAdvise the startup on whether intermediary protection can extend to this situation, whether its role and response affect its exposure, and what relief the businessman could reasonably seek.',
    },
    {
      text: "QUESTION 2 — Scraped Public Profiles, Website Terms and Inferred Data\n\nAn AI recruitment company scrapes professional profiles visible without logging in and uses them to train a model that predicts candidates' salaries, likelihood of changing jobs and suitability for particular employers. Some profiles were published by the individuals themselves; others were uploaded by recruitment agencies without clear authorisation. The source website prohibits automated scraping in its terms, but the AI company never created an account or clicked \"accept\". A candidate discovers that an inaccurate prediction has affected her recruitment prospects and demands deletion of both her profile and its influence on the model.\n\nAssess whether public accessibility resolves the company's legal exposure, whether the website's terms bind it, and how the analysis differs between collected facts and inferred information.",
    },
    {
      text: "QUESTION 3 — AI Procurement Agent Exceeding Its Authority\n\nA manufacturing company authorises an AI procurement agent to negotiate routine purchases up to Rs. 10 lakh, with human approval required above that amount. Following a software update, the agent accepts a supplier's offer for Rs. 42 lakh through the company's procurement portal. The supplier receives an automated purchase order bearing the procurement head's electronic signature and begins manufacturing customised goods. The company immediately refuses to honour the order, arguing that no human approved it and the agent exceeded its instructions. However, it has previously paid several smaller orders concluded through the same system.\n\nAdvise the supplier on contract formation, attribution of electronic communications, authority and reliance, including how the outcome changes if the supplier knew that approval limits existed.",
    },
    {
      text: "QUESTION 4 — AI Workplace Monitoring and the Employment Exemption\n\nA technology company introduces software that records employees' screens, captures occasional webcam images and uses AI to infer disengagement and possible misconduct. Employees receive a short email describing it as a cybersecurity measure, while managers also use the resulting scores for promotions and termination decisions. The company argues that individual consent is unnecessary because processing is undertaken for employment purposes and to protect confidential information. An employee working from home objects that the software captures family members and personal communications, and that an inaccurate score led to her dismissal.\n\nAssess the scope and limits of the employment-related justification under the DPDP framework, the significance of incidental third-party data and the remedies or contractual arguments available to the employee.",
    },
    {
      text: "QUESTION 5 — Consent Withdrawal, Erasure and Model Memorisation\n\nA health-tech company obtains consent to use customers' consultation transcripts to improve an AI assistant. It removes names and contact details before training, but retains unusual medical histories and location references. A customer withdraws consent and requests erasure after discovering that carefully framed prompts can reproduce passages resembling her consultation. The company deletes the original transcript but refuses to retrain the model, arguing that model parameters are statistical information rather than personal data and that retraining would be disproportionately expensive.\n\nAdvise, according to the DPDP framework, whether deletion of the source record is sufficient, how identifiability and memorisation affect the analysis and what evidence would be needed before recommending a technical or legal remedy.",
    },
    {
      text: "QUESTION 6 — Shareholders' Agreement Rights Not Reflected in the Articles\n\nAn investor holds 12% of an Indian private company under a shareholders' agreement requiring its consent before the company issues fresh shares or sells its principal intellectual property. The company is a party to the agreement, but these restrictions were never incorporated into its articles. Facing an immediate cash shortage, the board approves a share issue to the founders and a licence of the intellectual property to a founder-controlled entity without investor consent. The investor alleges that the transactions dilute its holding and transfer value out of the company; the founders say the steps were commercially necessary and valid under the articles.\n\nAssess contractual enforceability, corporate validity and the availability of oppression or mismanagement relief, distinguishing the remedies against the company from those against individual shareholders.",
    },
    {
      text: "QUESTION 7 — Founder's AI Tool, Corporate Opportunity and Conflicts\n\nWhile serving as managing director of a logistics startup, a founder develops an AI route-planning tool using some company employees, historical delivery data and his own funds. The board had previously rejected a proposal to commercialise route-planning software because it wanted to focus on delivery operations. The founder incorporates a separate company, transfers the tool to it and secures an investment from a customer first introduced through the original startup. He argues that the board's rejection left him free to pursue the opportunity and that he developed the core code outside working hours.\n\nAssess ownership of the tool, the scope of the founder's duties concerning corporate opportunities and conflicts and what disclosure or approval could have altered the position.",
    },
    {
      text: 'QUESTION 8 — Expired API Access: Technical Access versus Legal Permission\n\nA data analytics company receives API access to an e-commerce platform under a six-month pilot agreement. After the pilot expires, the platform emails that access is withdrawn but accidentally leaves the credentials active. The analytics company continued collecting information for three weeks, arguing that the parties were negotiating an extension and that the API remained technically available. It also uses an endpoint omitted from the pilot documentation but accessible through the same credentials, obtaining seller-level transaction data. The platform alleges unauthorised access and threatens civil and criminal proceedings.\n\nAnalyse the distinction between technical access and legal permission, the significance of contractual scope and subsequent communications and the additional elements that would need to be established for criminal liability.',
    },
  ];

  for (let index = 0; index < descriptiveQuestions.length; index += 1) {
    await prisma.question.create({
      data: {
        versionId: version.id,
        sectionId: sectionB.id,
        type: QuestionType.SUBJECTIVE,
        text: descriptiveQuestions[index]!.text,
        marks: 20,
        order: index + 1,
      },
    });
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
