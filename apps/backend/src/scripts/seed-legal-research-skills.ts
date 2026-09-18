import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding legal research and professional skills practice area...');

  // This paper is the 1st-3rd year "common" paper, and ProfileSetupPage locks
  // those students' specialization to 'General' - so it must attach there,
  // not to a category of its own that nobody can select.
  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'General' },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const paper = await prisma.questionPaper.upsert({
    where: {
      id:
        (
          await prisma.questionPaper.findFirst({
            where: { title: 'Legal Research and Professional Skills Assessment Examination', specializationId: specialization.id },
          })
        )?.id || 'placeholder-id-for-create',
    },
    update: {
      description: 'Common assessment for 1st-3rd year candidates covering legal citation, database research skills, and applied legal-research scenarios.',
    },
    create: {
      specializationId: specialization.id,
      title: 'Legal Research and Professional Skills Assessment Examination',
      description: 'Common assessment for 1st-3rd year candidates covering legal citation, database research skills, and applied legal-research scenarios.',
    },
  });

  console.log(`Using paper: ${paper.title} (${paper.id})`);

  // Source PDF's descriptive questions are printed at 15 marks each (not 20), so even at the
  // platform-standard 2 marks/MCQ this paper totals 80 (20 MCQ + 4x15 attempted), not 100 - a
  // shortfall preserved as printed rather than rescaled, consistent with how the Labour Law
  // paper's own arithmetic was left as-is. Section B's named sub-prompts (e.g. "Identify the
  // Statutory Provision" / "Update to Senior") carry no individual marks in the source; the
  // per-prompt split below is an inferred default weighting the substantive research prompt(s)
  // higher than the short drafting/update prompt.
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

# SECTION A — KNOWLEDGE-BASED MULTIPLE CHOICE QUESTIONS
**10 MCQs | 20 Marks**
This section tests your foundational knowledge of legal citation and case-law research.

### Format
- 10 Multiple Choice Questions (MCQs)
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

# SECTION B — SCENARIO-BASED APPLIED QUESTIONS
**4 Questions | 60 Marks**
This section tests your ability to apply knowledge, conduct legal research, and analyse case scenarios. Research is permitted and expected.

### Format
- Five descriptive questions offered (Attempt any 4 out of 5)
- 15 marks each
- Total: 60 marks

### Time Allocation
- Total paper time: 3 hours
- Suggested Section B: 170 minutes

### Key Rules
- Research is permitted. Internet, legal databases, and statutes may be consulted.
- Any four of the five questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: legal citation conventions, SCC Online / IndianKanoon / India Code research tools, Indian Contract Act 1872, Trade Marks Act 1999.
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
      title: 'SECTION A — KNOWLEDGE-BASED MULTIPLE CHOICE QUESTIONS',
      description: 'Knowledge Test - 10 MCQs | 20 Marks. No AI tools permitted - candidates must answer from their own legal knowledge. Closed-book, proctored.',
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
      title: 'SECTION B — SCENARIO-BASED APPLIED QUESTIONS',
      description: 'Research & Analysis - Attempt any 4 questions | 15 Marks each. Research is permitted and expected.',
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
      text: "You know only the names of the two parties in a Supreme Court case — 'Maneka Gandhi v. Union of India' — and want to find the full judgment on SCC Online. Which search option should you use first?",
      options: [
        'Full-text search — type the entire party name in the keyword search bar',
        'Party Name search — enter petitioner and respondent names in the dedicated Party Name field',
        'Citation search — enter a random SCC volume and page number and browse',
        'Judges search — search by the judge who may have written the judgment',
      ],
      answer: 'Party Name search — enter petitioner and respondent names in the dedicated Party Name field',
      order: 1,
    },
    {
      text: "In the citation '(2017) 10 SCC 1', what does the year '2017' signify?",
      options: [
        'The year the judgment was delivered by the court',
        'The year the volume was published by SCC',
        'The year the case was filed in the Supreme Court',
        'The year the judgment was uploaded to the SCC Online database',
      ],
      answer: 'The year the volume was published by SCC',
      order: 2,
    },
    {
      text: 'You are on IndianKanoon.org and want to find all Supreme Court judgments that cite a specific earlier case — say, Kesavananda Bharati v. State of Kerala. Which feature would you use?',
      options: [
        "Search the case name in the main search bar and look at the 'Cited by' section in the judgment page",
        'Download the full judgment as PDF and manually search for citations',
        "Use the 'Acts' tab and search under the Constitution of India",
        'IndianKanoon does not support citation tracking — use a printed digest instead',
      ],
      answer: "Search the case name in the main search bar and look at the 'Cited by' section in the judgment page",
      order: 3,
    },
    {
      text: "A senior advocate hands you a citation: 'AIR 1978 SC 597'. What information can you extract from this citation alone — before opening any database?",
      options: [
        'Court: Supreme Court of India | Year of reporting: 1978 | Page: 597 in the AIR volume',
        'Court: Supreme Court | Year of judgment: 1978 | Case number: 597',
        'Court: Supreme Court | Volume number: 1978 | Serial case number: 597',
        'Court: Allahabad High Court | Year: 1978 | Page: 597',
      ],
      answer: 'Court: Supreme Court of India | Year of reporting: 1978 | Page: 597 in the AIR volume',
      order: 4,
    },
    {
      text: "You find two citations for what appears to be the same case: '(2017) 10 SCC 1' and 'AIR 2018 SC 4321'. How is this possible?",
      options: [
        'They are different cases — the same parties must have filed two separate matters',
        'They are the same judgment reported in two different law reports — SCC reported it in 2017, AIR reported it in 2018',
        'The AIR citation is always wrong when it differs from SCC — discard it',
        'The year difference means the Supreme Court issued two separate orders in the same case',
      ],
      answer: 'They are the same judgment reported in two different law reports — SCC reported it in 2017, AIR reported it in 2018',
      order: 5,
    },
    {
      text: 'You need the bare text of Section 302 of the Indian Penal Code as it stands today, with all amendments incorporated. Which source gives you the most reliably updated version?',
      options: [
        "A printed IPC textbook from your firm's library (published 2018)",
        'The Ministry of Law & Justice e-Gazette or India Code portal (indiacode.nic.in)',
        'A legal blog post summarising Section 302',
        'The Wikipedia article on Section 302 IPC',
      ],
      answer: 'The Ministry of Law & Justice e-Gazette or India Code portal (indiacode.nic.in)',
      order: 6,
    },
    {
      text: "In a case citation, what does the abbreviation 'SCC (Cri)' signify as compared to plain 'SCC'?",
      options: [
        'SCC (Cri) reports only criminal cases — it is a subject-specific sub-series of the Supreme Court Cases reporter',
        'SCC (Cri) is a lower court series — it reports criminal cases from Sessions Courts',
        'SCC (Cri) is a separate publisher from SCC and has no connection to it',
        'SCC (Cri) refers to cases decided by the Criminal Division of the Supreme Court',
      ],
      answer: 'SCC (Cri) reports only criminal cases — it is a subject-specific sub-series of the Supreme Court Cases reporter',
      order: 7,
    },
    {
      text: 'You want to check whether a 2015 Delhi High Court judgment has been affirmed, reversed, or overruled by the Supreme Court. Which is the most efficient method on SCC Online?',
      options: [
        'Read the entire judgment text and look for references to Supreme Court appeals',
        "Use the 'Judicial History' or 'Case Status' feature on SCC Online, which tracks the appellate journey of a judgment",
        'Call the Supreme Court Registry directly',
        'Search Google News for any news article about the case',
      ],
      answer: "Use the 'Judicial History' or 'Case Status' feature on SCC Online, which tracks the appellate journey of a judgment",
      order: 8,
    },
    {
      text: "A colleague gives you the citation 'Writ Petition (Civil) No. 494 of 2012'. Without opening any database, what can you infer about this case?",
      options: [
        'It is a civil writ petition filed in the Supreme Court of India in the year 2012 — the matter involves enforcement of a fundamental or constitutional right',
        'It is a civil suit filed in a District Court in 2012',
        'It is an appeal against a High Court order filed in 2012 — the number 494 is the appeal serial number',
        'It is a petition filed under Article 227 in a High Court in the year 2012',
      ],
      answer: 'It is a civil writ petition filed in the Supreme Court of India in the year 2012 — the matter involves enforcement of a fundamental or constitutional right',
      order: 9,
    },
    {
      text: 'You are researching a point of Hindu succession law and find three sources: (i) a 2022 Supreme Court judgment, (ii) a 2020 Law Commission Report recommending reform of the same provision, and (iii) a 2019 High Court judgment taking a contrary view. For advising a client today, which source governs?',
      options: [
        'The 2022 Supreme Court judgment — it is the most recent binding authority and overrides both the High Court judgment and the Law Commission Report',
        'The 2020 Law Commission Report — it represents the most current thinking on the law',
        'The 2019 High Court judgment — it is a court decision and therefore binding, unlike the Law Commission Report',
        'All three have equal weight — cite all three to the client and let them decide',
      ],
      answer: 'The 2022 Supreme Court judgment — it is the most recent binding authority and overrides both the High Court judgment and the Law Commission Report',
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
      text: "Your senior asks: 'What is the current limitation period for filing a written statement in a commercial suit after the amendments to Order VIII CPC?'",
      order: 1,
      marks: 15,
      subQuestions: [
        { text: '### Identify the Statutory Provision\nState the exact provision, the time limit, and whether courts have discretion to extend it.', marks: 6, order: 1 },
        { text: '### State the Current Judicial Position\nHas the Supreme Court settled whether this limit is mandatory or directory? Name the case with its full citation and paste the URL of the source from which you found it, along with the current status of the case.', marks: 6, order: 2 },
        { text: '### Update to Senior (2 lines)\nDraft a concise two-line message to your senior summarising the answer.', marks: 3, order: 3 },
      ],
    },
    {
      text: "A startup client asks: 'We want to issue ESOPs to our five employees. We are a private limited company with a paid-up capital of Rs. 10 lakhs. What approvals do we need and is there a minimum vesting period?'",
      order: 2,
      marks: 15,
      subQuestions: [
        { text: '### State the Current Law\nIdentify the exact section of the Companies Act, 2013, the relevant Rule under the Companies (Share Capital and Debentures) Rules, 2014, and the minimum vesting period. Be precise.', marks: 6, order: 1 },
        { text: '### Identify What Changed Post-2021\nHas there been any MCA amendment or SEBI notification that changed ESOP rules for startups after 2021? State the change and paste the URL of the source.', marks: 6, order: 2 },
        { text: "### Draft the Client Response (3 lines)\nWrite a concise three-line practical response to the client's question.", marks: 3, order: 3 },
      ],
    },
    {
      text: "A food startup has been using the name 'SpiceRoute' for three years without registration. A competitor registered the same trademark one year ago. Your client asks: 'Can we still use our name? Can we challenge their registration?'",
      order: 3,
      marks: 15,
      subQuestions: [
        { text: '### Identify the Prior Use Right\nWhat is the law on prior use of an unregistered trademark in India? Which section of the Trade Marks Act, 1999 protects prior users?', marks: 6, order: 1 },
        { text: '### Identify the Ground for Cancellation\nOn what ground can your client file a rectification petition? What is the time limit? Which authority hears it? State the section number or judgment name from which your answer is derived.', marks: 6, order: 2 },
        { text: "### Advise the Client (3 lines)\nCan the client continue using 'SpiceRoute'? What should they do this week?", marks: 3, order: 3 },
      ],
    },
    {
      text: "A client's house was demolished by the municipal authority at 6 AM without any prior notice. Your senior asks: 'What is the current constitutional position on bulldozer action? Has the Supreme Court intervened recently?'",
      order: 4,
      marks: 15,
      subQuestions: [
        { text: '### Identify the Current Supreme Court Position\nWhat has the Supreme Court held in 2024 or more recently on demolition of property without prior notice? Name the case, provide the URL of the judgment, the key directions given, and, if possible, the relevant paragraph number.', marks: 9, order: 1 },
        { text: '### Draft the Interim Relief Prayer\nDraft the key points identifying the constitutional rights being violated and the prayer for an urgent writ petition seeking a stay of any further demolition action.', marks: 6, order: 2 },
      ],
    },
    {
      text: "Your senior asks: 'I know there was an old Supreme Court judgment saying silence is not acceptance of an offer. But a client in a commercial deal claims the other side's silence amounted to acceptance. What is the current position under Indian contract law and has any court softened this rule recently?'",
      order: 5,
      marks: 15,
      subQuestions: [
        { text: '### Identify the Rule and the Source\nState the general rule on silence and acceptance under the Indian Contract Act, 1872. Which section applies?', marks: 6, order: 1 },
        { text: '### Research for Any Exception or Recent Development\nIs there any commercial or consumer court judgment from 2018 onwards that has treated silence or continued conduct as acceptance? Name one authority with its full citation.', marks: 6, order: 2 },
        { text: "### Update Your Senior (3 lines)\nDraft a three-line update clearly stating the current legal position and whether the client's argument has any legal merit.", marks: 3, order: 3 },
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
