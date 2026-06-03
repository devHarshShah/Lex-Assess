import type { Feature, Pillar, Step, Track } from './types'

export const navItems = ['Process', 'Practice Areas', 'Assessment', 'Internships', 'FAQs']

export const pipelineSteps: Step[] = [
  {
    number: '01',
    pill: 'Track',
    title: 'Choose Your Track',
    description:
      'Select a practice area that matches your interest. Each paper is authored and reviewed by NLU professors and practicing professionals in that field.',
  },
  {
    number: '02',
    pill: 'Assess',
    title: 'Take the 2-Hour Assessment',
    description:
      'A rigorous 2-hour paper combining objective questions, live research tasks, and practical drafting. AI tools are permitted — we test judgment, not memory.',
  },
  {
    number: '03',
    pill: 'Interview',
    title: 'Expert Interview',
    description:
      'Every candidate who completes the assessment is scheduled for an interview with a practicing professional in their chosen practice area.',
  },
  {
    number: '04',
    pill: 'Result',
    title: 'Cumulative Score & Result',
    description:
      'Your written assessment and interview scores are combined into a final cumulative result, shared with you in a detailed, transparent score report.',
  },
]

export const features: Feature[] = [
  {
    number: '01',
    title: 'Written Assessment',
    description: 'A 2-hour paper across objective questions, research tasks, and practical drafting. Evaluated anonymously against published criteria. Your paper is graded by subject-matter experts — not automated scoring.',
    tag: '2 Hours · All Tracks'
  },
  {
    number: '02',
    title: 'Expert Interview',
    description: 'Every candidate who completes the written assessment is scheduled for an interview with a practicing professional in their chosen practice area. The interview tests applied reasoning, client-handling, and legal judgment — not textbook recall.',
    tag: 'Conducted by Field Professional'
  },
  {
    number: '03',
    title: 'Cumulative Score & Feedback',
    description: 'Your written and interview scores are combined into a final cumulative result. You receive a detailed score report with feedback on each component.',
    tag: 'Full Transparency · Detailed Report'
  }
]

export const pillars: Pillar[] = [
  {
    num: 'A',
    title: 'Current Law Identification',
    description:
      'MCQ and short-answer questions testing knowledge of current statutory provisions and recent judicial developments.',
  },
  {
    num: 'B',
    title: 'Research & Memo Writing',
    description:
      'Structured research notes in professional format — Issue, Law, Current Position, Risk, Recommendation. Graded on real-world usability.',
  },
  {
    num: 'C',
    title: 'Practical Drafting',
    description:
      'Draft pleadings, opinions, agreements, or regulatory submissions under realistic time constraints and detailed fact patterns.',
  },
  {
    num: 'D',
    title: 'Live Research Verification',
    description:
      'Find a real case on IndianKanoon or SCC Online, paste the URL and a verbatim excerpt. Every link is verified by assessors — this module cannot be completed by AI alone.',
  },
  {
    num: 'E',
    title: 'Research Literacy MCQ',
    description:
      'Tests knowledge of legal databases, citation formats, how to decode AIR and SCC citations, and the hierarchy of legal sources.',
  },
]

export const studentSteps = [
  'Attempt the skill assessment paper',
  'Earn a verified national rank',
  'Clear the structured interview round',
  'Get discovered by verified law firms',
  'Receive internship offers directly',
]

export const firmSteps = [
  'Register your firm - free and quick',
  'Define the profile you need',
  'Browse the ranked, verified directory',
  'Filter by score, area, year, location',
  'Reach out and hire directly',
]

export const tracks: Track[] = [
  {
    roman: 'I',
    title: 'Capital Markets',
    description: 'SEBI, securities law, listings, debt & equity transactions',
  },
  {
    roman: 'II',
    title: 'General Corporate',
    description:
      'Company law, M&A, governance, shareholder agreements',
  },
  {
    roman: 'III',
    title: 'Disputes',
    description:
      'Litigation, arbitration, civil procedure & appellate practice',
  },
  {
    roman: 'IV',
    title: 'Maritime & Aviation',
    description: 'Admiralty law, aircraft financing, regulatory compliance',
  },
  {
    roman: 'V',
    title: 'Intellectual Property',
    description: 'Patents, trademarks, copyright & IP transactions',
  },
  {
    roman: 'VI',
    title: 'Taxation',
    description: 'Direct tax, GST, transfer pricing & tax disputes',
  },
  {
    roman: 'VII',
    title: 'Banking & Finance',
    description: 'Lending, security interests, RBI regulation, insolvency',
  },
  {
    roman: 'VIII',
    title: 'Competition Law',
    description: 'CCI practice, mergers, dominance & cartel regulation',
  },
  {
    roman: 'IX',
    title: 'Labour & Employment',
    description: 'Labour codes, industrial disputes, service law',
  },
  {
    roman: 'X',
    title: 'Data Protection',
    description: 'DPDP Act, privacy law, cross-border data flows',
  },
  {
    roman: 'XI',
    title: 'Technology Law',
    description: 'IT Act, AI regulation, fintech, platform liability',
  },
]
