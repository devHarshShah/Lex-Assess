import { PrismaClient, QuestionType, PaperStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PAPER_TITLE = 'Media and Entertainment Law Assessment Examination';

async function main() {
  console.log('Starting seeding media and entertainment law practice area...');

  // Categories are owned by PrismaService.seedProfileDefaults() (the profile
  // dropdown reads from there), never created here - see DEPLOYMENT.md.
  const specialization = await prisma.specialization.findUniqueOrThrow({
    where: { name: 'Media and Entertainment' },
  });

  console.log(`Using specialization: ${specialization.name} (${specialization.id})`);

  const description =
    'Comprehensive assessment covering copyright and performers\' rights, broadcasting and cable regulation, intermediary liability, personality rights, and defamation in the media context.';

  const existingPaper = await prisma.questionPaper.findFirst({
    where: { title: PAPER_TITLE, specializationId: specialization.id },
  });
  const paper = existingPaper
    ? await prisma.questionPaper.update({ where: { id: existingPaper.id }, data: { description } })
    : await prisma.questionPaper.create({
        data: { specializationId: specialization.id, title: PAPER_TITLE, description },
      });

  console.log(`Using paper: ${paper.title} (${paper.id})`);

  // This script runs on every production deploy, so it must be safe to
  // re-run. The section/question rebuild below deletes and recreates every
  // question, which would orphan or corrupt scoring for any student who has
  // already attempted the paper (see DEPLOYMENT.md). Therefore:
  //   - already seeded            -> leave it alone (edit via the admin UI)
  //   - SEED_FORCE=true           -> rebuild, but only if nobody has attempted it
  const existingVersion = await prisma.questionPaperVersion.findUnique({
    where: { paperId_versionName: { paperId: paper.id, versionName: 'V1' } },
    include: { _count: { select: { questions: true, testAttempts: true } } },
  });

  if (existingVersion && existingVersion._count.questions > 0) {
    if (process.env.SEED_FORCE !== 'true') {
      console.log('Paper already seeded - skipping (set SEED_FORCE=true to rebuild).');
      return;
    }
    if (existingVersion._count.testAttempts > 0) {
      console.error(
        `Refusing to rebuild: ${existingVersion._count.testAttempts} attempt(s) exist against this paper. Edit it through the admin UI instead.`,
      );
      process.exit(1);
    }
    console.log('SEED_FORCE=true and no attempts exist - rebuilding paper.');
  }

  // Source paper prints MCQs at 1 mark each (10 total), which makes the paper
  // 90 marks after options. Scaled to the platform-standard 2 marks/MCQ so
  // Section A (20) + any 4 x 20 in Section B = 100, like every other paper.
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
This section tests your foundational knowledge of Media and Entertainment Law.

### Format
- 10 Multiple Choice Questions (MCQs)
- 2 marks each
- Total: 20 marks
- All questions are compulsory

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
- Five descriptive questions; attempt any four
- 20 marks each
- Total: 80 marks

### Time Allocation
- Total paper time: 3 hours
- Suggested Section B: 170 minutes

### Key Rules
- Research is permitted. Internet, legal databases, and statutes may be consulted.
- You may take the assistance of AI tools. However, other candidates may also be using similar tools, so marks will not be awarded merely for language or presentation, but for accuracy, precision, depth of analysis, and the quality of your independent application of mind.
- Cite specific statutory provisions and case law in your answers; generic theoretical answers will not receive full marks.
- Any four of the five questions must be attempted.

---

# GENERAL GUIDELINES
- Ensure you have 3 uninterrupted hours available.
- Have a stable internet connection.
- Knowledge Prerequisites: Copyright Act 1957, Cinematograph Act 1952, Cable Television Networks (Regulation) Act 1995, Trade Marks Act 1999, Information Technology Act 2000 and the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021, Bharatiya Nyaya Sanhita 2023.
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
        'Knowledge Test - 10 MCQs | 20 Marks. This section tests your foundational knowledge of Media and Entertainment Law. Closed-book, proctored.',
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
        'Research & Analysis - Attempt any 4 questions | 80 Marks. Research is permitted and expected. You may use AI tools, but marks are awarded for accuracy, depth of analysis and independent application of mind - not for language or presentation.',
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
      text: 'Under the Copyright Act, 1957, which of the following works is NOT eligible for copyright protection?',
      options: [
        'A screenplay written by a Bollywood director',
        'A logo designed by a graphic artist',
        'An idea for a reality television show format',
        'A sound recording produced by a music label',
      ],
      answer: 'An idea for a reality television show format',
      order: 1,
    },
    {
      text: 'The Cable Television Networks (Regulation) Act, 1995 prohibits the transmission of a programme that offends against which of the following?',
      options: [
        'The programme code and the advertisement code prescribed under the Rules',
        'The guidelines of the Advertising Standards Council of India only',
        'The censorship certificate issued by the Central Board of Film Certification',
        'The editorial guidelines of the News Broadcasters Standards Authority',
      ],
      answer: 'The programme code and the advertisement code prescribed under the Rules',
      order: 2,
    },
    {
      text: 'Under the Cinematograph Act, 1952 (as amended in 2023), which authority is empowered to revoke a certificate of exhibition granted by the Central Board of Film Certification?',
      options: [
        'The Ministry of Information and Broadcasting',
        'The High Court of the relevant state',
        'The Central Government',
        'A Revising Committee constituted by the CBFC Chairperson',
      ],
      answer: 'The Central Government',
      order: 3,
    },
    {
      text: 'The Broadcasting Services (Regulation) Bill, 2023 proposes to bring which of the following within its regulatory ambit for the first time?',
      options: [
        'Radio broadcasters licensed under the FM Phase-III Policy',
        'Over-the-top (OTT) content platforms and digital news broadcasters',
        'Print media and online news portals',
        'Community television channels operated by gram panchayats',
      ],
      answer: 'Over-the-top (OTT) content platforms and digital news broadcasters',
      order: 4,
    },
    {
      text: 'Under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, a significant social media intermediary with more than fifty lakh registered users in India is required to appoint which of the following officers?',
      options: [
        'A Chief Compliance Officer, a Nodal Contact Person, and a Resident Grievance Officer',
        'A Data Protection Officer and a Content Moderation Officer only',
        'A Grievance Officer and a Legal Counsel based in India',
        'A Chief Information Security Officer and a Privacy Officer',
      ],
      answer: 'A Chief Compliance Officer, a Nodal Contact Person, and a Resident Grievance Officer',
      order: 5,
    },
    {
      text: "In the context of performer's rights under Section 38A of the Copyright Act, 1957, which of the following acts may a performer do without the consent of the original performer after the initial consent has been given for fixation?",
      options: [
        'Re-broadcast the fixed performance on a rival platform',
        'Reproduce the fixed performance for commercial exploitation',
        'Use the performance for a bona fide news report of current events',
        "Assign the performer's moral rights to a production house",
      ],
      answer: 'Use the performance for a bona fide news report of current events',
      order: 6,
    },
    {
      text: "The doctrine of 'fair dealing' under Section 52 of the Copyright Act, 1957, permits the reproduction of a copyrighted work for which of the following purposes WITHOUT the author's consent?",
      options: [
        'Parody of the work for commercial distribution',
        'Private use including research, criticism, review, or reporting of current events',
        'Adaptation of a literary work into a motion picture',
        'Synchronisation of a musical work with an advertisement',
      ],
      answer: 'Private use including research, criticism, review, or reporting of current events',
      order: 7,
    },
    {
      text: "Under the Trade Marks Act, 1999, which of the following elements of a celebrity's persona is MOST likely to be protectable as a registered trade mark in the context of entertainment law?",
      options: [
        "The celebrity's face as depicted in a biographical film",
        'A distinctive catchphrase consistently used by a comedian in performances',
        'The general likeness of a celebrity in a painting',
        "News reports about the celebrity's public appearances",
      ],
      answer: 'A distinctive catchphrase consistently used by a comedian in performances',
      order: 8,
    },
    {
      text: 'The Press Council of India, constituted under the Press Council Act, 1978, has jurisdiction over which of the following?',
      options: [
        'Digital news portals and online news aggregators',
        'Television news channels regulated by the MIB',
        'Newspapers and news agencies as defined under the Act',
        'OTT platforms that stream news content',
      ],
      answer: 'Newspapers and news agencies as defined under the Act',
      order: 9,
    },
    {
      text: 'A film producer enters into an agreement with a music composer under which all future compositions for the film shall vest in the producer. Under Section 17 of the Copyright Act, 1957, which of the following statements correctly reflects the legal position?',
      options: [
        'The composer retains the copyright as the author and the producer acquires only a licence',
        'The producer is the first owner of copyright as the work is made under a contract of service or apprenticeship',
        'The moral rights of the composer are extinguished by the assignment agreement',
        'The composer may reclaim copyright after twenty-five years under the reversion clause',
      ],
      answer: 'The producer is the first owner of copyright as the work is made under a contract of service or apprenticeship',
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
      text: "A leading Bollywood production house, FilmCraft Pvt. Ltd., releases a web series on a major OTT platform. A YouTube content creator posts a 25-minute video essay that includes 8-minute clips from the web series along with commentary and critique. FilmCraft issues a copyright strike under YouTube's Content ID system and simultaneously files a civil suit for infringement. The content creator claims 'fair dealing' under Section 52 of the Copyright Act, 1957. Your senior asks you to advise FilmCraft.",
      order: 1,
      marks: 20,
      subQuestions: [
        {
          text: "### (a)\nIdentify the exact sub-sections of Section 52 of the Copyright Act, 1957 that may be invoked by the content creator in defence. What are the conditions that must be cumulatively satisfied for the fair dealing defence to succeed in the context of criticism or review? Analyse whether 8 minutes of clips out of a web-series episode constitute 'fair dealing' applying the four-factor test drawn from Indian and comparative jurisprudence.",
          marks: 7,
          order: 1,
        },
        {
          text: "### (b)\nFilmCraft also asserts that the OTT platform is jointly liable as an intermediary for hosting the infringing video essay. Under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and Section 79 of the IT Act, 2000, examine when an intermediary loses its safe harbour protection. Has the Supreme Court or any High Court ruled on the liability of platforms for user-generated infringing content? State the full name of the judgment, its precise holding, and provide its citation.",
          marks: 7,
          order: 2,
        },
        {
          text: "### (c)\nFilmCraft instructs you to draft the prayer clause of a plaint for permanent injunction and damages in the civil suit. Draft the prayer clause (maximum five prayers) citing the specific provisions of the Copyright Act, 1957 and the Code of Civil Procedure, 1908 under which relief is sought. Additionally, advise in two sentences on whether an Anton Piller-type order (John Doe order) may be obtained and from which court.",
          marks: 6,
          order: 3,
        },
      ],
    },
    {
      text: "A music streaming platform, SoundStream India, obtains a compulsory licence under Section 31 of the Copyright Act, 1957 to stream the catalogue of a major independent music label, IndieNotes, after negotiations break down. IndieNotes challenges the grant of the compulsory licence before the Intellectual Property Appellate Board (IPAB) / High Court and simultaneously files a suit alleging that SoundStream's royalty computation methodology violates the Copyright (Amendment) Act, 2012 amendments relating to authors' and performers' royalties. Your senior asks you to advise IndieNotes.",
      order: 2,
      marks: 20,
      subQuestions: [
        {
          text: '### (a)\nUnder Section 31 of the Copyright Act, 1957, what are the grounds on which a compulsory licence may be granted? Identify the authority currently empowered to grant such licences following the abolition of the IPAB and the amendments made thereafter. What procedural requirements must SoundStream satisfy before applying for and obtaining a compulsory licence? Cite the relevant sections and any subordinate legislation.',
          marks: 7,
          order: 1,
        },
        {
          text: "### (b)\nThe Copyright (Amendment) Act, 2012 inserted provisions protecting the royalty rights of authors and performers. Identify the specific sections that prevent an author or performer from assigning away future royalty rights in sound recordings. Does the amendment override a pre-2012 agreement between IndieNotes's composer and the label? Cite relevant judicial authority or Copyright Board orders on this point with full citation and URL if available.",
          marks: 7,
          order: 2,
        },
        {
          text: "### (c)\nIndieNotes's chief concern is the royalty rate being applied by SoundStream. Draft a three-paragraph legal opinion addressing: (i) the correct royalty computation methodology mandated by the Copyright Act and applicable rules; (ii) IndieNotes's strongest procedural remedy against the compulsory licence; and (iii) whether IndieNotes may simultaneously pursue arbitration under its original distribution agreement with SoundStream while the licence proceedings are pending.",
          marks: 6,
          order: 3,
        },
      ],
    },
    {
      text: "A major sports broadcaster, SportVision Ltd., holds exclusive telecast rights for the Indian Premier League for five years granted by the BCCI. A rival broadcaster, QuickStream, begins streaming live match clips of 2–3 minutes on its app within minutes of each boundary or wicket. SportVision seeks your advice on remedies. Simultaneously, the Ministry of Information and Broadcasting issues a direction under Section 3A of the Cable Television Networks (Regulation) Act, 1995 mandating that all cricket matches of national importance must be made available on the free-to-air DD Sports channel.",
      order: 3,
      marks: 20,
      subQuestions: [
        {
          text: "### (a)\nDoes SportVision's broadcast signal constitute a 'broadcast reproduction right' under Section 37 of the Copyright Act, 1957? Explain the scope and duration of broadcast reproduction rights and analyse whether QuickStream's 2–3 minute clips constitute an infringement of those rights. Distinguish between infringement of a broadcast reproduction right and infringement of underlying copyright in the audio-visual content. Cite any Indian court decision on sports broadcasting disputes with full citation.",
          marks: 8,
          order: 1,
        },
        {
          text: "### (b)\nExamine the legality of the MIB's direction under Section 3A of the Cable Television Networks (Regulation) Act, 1995. What constitutional grounds may SportVision raise to challenge the direction as a violation of its Fundamental Rights under Articles 14 and 19(1)(g) of the Constitution? Has any court previously struck down or upheld a 'must-carry' or 'must-provide-free' direction in the sports or news broadcasting context? Cite the judgment with its URL.",
          marks: 7,
          order: 2,
        },
        {
          text: '### (c)\nSportVision instructs you to obtain urgent ex parte interim relief against QuickStream before the Delhi High Court. Draft a concise application (maximum 200 words) for an ex parte ad interim injunction citing the three-pronged test for interim relief and the applicable provisions of the Copyright Act, 1957 and the Code of Civil Procedure, 1908. Identify the specific division bench before which such a matter would ordinarily be listed.',
          marks: 5,
          order: 3,
        },
      ],
    },
    {
      text: "A celebrity actor, Ranveer Kapoor, discovers that an AI-generated deepfake video of him has been widely circulated on social media in which he appears to endorse a financial product. Additionally, a biographical film about his life is being made by a production house without his consent, using real names and real incidents from his public career. Your senior asks you to advise Ranveer on all available legal remedies under Indian law.",
      order: 4,
      marks: 20,
      subQuestions: [
        {
          text: "### (a)\nIndia does not yet have a standalone 'right of publicity' statute. Identify every existing legal provision — including provisions of the Copyright Act, 1957; the Trade Marks Act, 1999; the IT Act, 2000; the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021; and tort law — under which Ranveer may seek remedies against the creators and distributors of the deepfake video. For each provision, state precisely what it protects and what remedy it provides.",
          marks: 7,
          order: 1,
        },
        {
          text: "### (b)\nA biographical film ('biopic') about a living person raises distinct legal risks. Identify the laws and doctrines — including defamation under the Bhartiya Nyaya Sanhita, 2023; privacy under Article 21 read with the Puttaswamy judgment; passing off; and the CBFC certification requirements — that the production house must navigate. Does the subject of a biopic have a right to prevent its production entirely, or only a right to seek corrections or damages? Cite any Indian judgment on celebrity biopics with its URL.",
          marks: 7,
          order: 2,
        },
        {
          text: '### (c) — Drafting Exercise\nDraft a legal notice on behalf of Ranveer Kapoor addressed to the production house, demanding: (i) immediate cessation of production; (ii) a response within fifteen days; and (iii) damages for unauthorised commercial use of his persona. The notice should cite at least three specific legal provisions and be approximately 150 words in length.',
          marks: 6,
          order: 3,
        },
      ],
    },
    {
      text: "A digital news portal, PressLine Media, publishes an investigative report alleging financial irregularities by a prominent media conglomerate, MediaGroup Ltd. MediaGroup files: (a) a criminal defamation complaint under the Bharatiya Nyaya Sanhita, 2023; (b) a civil suit for damages of ₹50 crore; and (c) an application before the Press Council of India. PressLine's editor is also served a notice by the MIB under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 to take down the article within 36 hours.",
      order: 5,
      marks: 20,
      subQuestions: [
        {
          text: "### (a)\nExamine the criminal defamation complaint filed by MediaGroup under the Bharatiya Nyaya Sanhita, 2023. Identify the relevant section and its ingredients. Which exceptions to defamation under the BNS 2023 may PressLine invoke to defend the publication? Has any court — before or after the BNS 2023 came into force — held that criminal defamation of a corporation or company is maintainable? Cite the judgment with its full citation and URL. Also advise whether the Supreme Court's decision in Subramanian Swamy v. Union of India (2016) continues to be relevant under the BNS, 2023.",
          marks: 8,
          order: 1,
        },
        {
          text: "### (b)\nThe takedown notice issued by MIB under the IT (Intermediary Guidelines) Rules, 2021 requires PressLine to remove the article within 36 hours. Analyse: (i) whether a digital news portal is an 'intermediary' or a 'publisher' for the purpose of the Rules, and what regulatory category it falls under; (ii) the constitutional validity of the 36-hour takedown timeline in light of Article 19(1)(a) and Article 19(2); and (iii) the procedure PressLine must follow to contest the takedown direction. Cite the Foundation for Media Professionals v. Union of India litigation or any cognate case with URL.",
          marks: 7,
          order: 2,
        },
        {
          text: "### (c)\nMediaGroup's civil suit claims damages of ₹50 crore. Advise PressLine on: (i) the elements of the tort of defamation in India and what MediaGroup must prove; (ii) the defence of qualified privilege and its applicability to investigative journalism; and (iii) whether Indian courts have ever granted damages of this scale against a media defendant. Draft a two-point litigation strategy for PressLine in approximately 150 words.",
          marks: 5,
          order: 3,
        },
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
