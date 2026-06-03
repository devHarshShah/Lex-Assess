import {
  PenTool,
  ShieldCheck,
  Trophy,
  Mic,
  Scale,
  Eye,
  Lock,
  LineChart,
  Building2,
  Gavel,
  Ship,
  Lightbulb,
  Receipt,
  Landmark,
  Users2,
  Briefcase,
  Cpu,
  BookOpen,
} from 'lucide-react'
import type { Feature, Pillar, Step, Track } from './types'

export const navItems = [
  { name: 'Process', href: '#how' },
  { name: 'Practice Areas', href: '#tracks' },
  { name: 'Assessment', href: '#assessment' },
  { name: 'Internships', href: '#internships' },
  { name: 'FAQs', href: '#eligibility' },
]

export const stats = [
  { num: '11+', label: 'Practice Areas' },
  { num: '2 hr', label: 'Assessment Paper' },
  { num: '100%', label: 'Merit Based' },
  { num: 'Open', label: 'All Law Schools' },
  { num: 'Full', label: 'Transparency' },
]

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
    pill: 'Assessment',
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

export const credibilityCards = [
  {
    title: 'Papers by Top NLU Faculty & Professionals',
    description:
      'Every assessment paper is authored and reviewed by NLU professors and senior practicing lawyers with a minimum of 10 years in the field. No question is set without domain expertise behind it.',
  },
  {
    title: 'Interviews by Field Expert Professionals',
    description:
      'Your interview is conducted by an active professional in your chosen practice area — not a generalist. A Capital Markets interview is taken by a Capital Markets lawyer. Always.',
  },
  {
    title: 'Complete Transparency at Every Step',
    description:
      'You see your assessment score, your interview feedback, and your cumulative result. Every criterion is published in advance. There are no hidden evaluations or undisclosed factors.',
  },
]

export const assessmentModules = [
  {
    id: 'A',
    title: 'Current Law Identification',
    description:
      'MCQ and short-answer questions testing knowledge of current statutory provisions and recent judicial developments.',
  },
  {
    id: 'B',
    title: 'Research & Memo Writing',
    description:
      'Structured research notes in professional format — Issue, Law, Current Position, Risk, Recommendation. Graded on real-world usability.',
  },
  {
    id: 'C',
    title: 'Practical Drafting',
    description:
      'Draft pleadings, opinions, agreements, or regulatory submissions under realistic time constraints and detailed fact patterns.',
  },
  {
    id: 'D',
    title: 'Live Research Verification',
    description:
      'Find a real case on IndianKanoon or SCC Online, paste the URL and a verbatim excerpt. Every link is verified by assessors — this module cannot be completed by AI alone.',
  },
  {
    id: 'E',
    title: 'Research Literacy MCQ',
    description:
      'Tests knowledge of legal databases, citation formats, how to decode AIR and SCC citations, and the hierarchy of legal sources.',
  },
]

export const faqs = [
  {
    question: 'Who can apply?',
    answer:
      'Any law student enrolled in a recognised 3-year LLB or 5-year integrated programme, or a recently qualified lawyer within 2 years of enrolment. There is no restriction on college or university.',
  },
  {
    question: 'Who sets and reviews the assessment papers?',
    answer:
      'Papers are authored and reviewed by NLU professors and senior practicing professionals with a minimum of 10 years of active practice in the relevant field. No paper is set by a generalist.',
  },
  {
    question: 'Who conducts the interview?',
    answer:
      'Every candidate who completes the assessment is scheduled for an interview with a practicing professional in their specific practice area — not a general HR panel. A Banking & Finance applicant is interviewed by a Banking & Finance lawyer.',
  },
  {
    question: 'Are AI tools really permitted in the assessment?',
    answer:
      'Yes. Candidates may use any AI tool, legal database, or online resource. The questions are designed to test legal judgment and applied reasoning — not the ability to recall section numbers.',
  },
  {
    question: 'How is the final result determined?',
    answer:
      'Your cumulative score combines the written assessment and expert interview. All criteria are published in advance. There are no undisclosed factors.',
  },
  {
    question: 'What do I receive on completing the internship?',
    answer:
      'A verified completion certificate, a supervisor performance evaluation, and your LexAssess score report with detailed feedback — all suitable for your CV and professional portfolio.',
  },
]

export const scoringSteps = [
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

export const internshipTypes = [
  {
    badge: 'Online Internship',
    title: 'Remote Legal Work',
  },
  {
    badge: 'Physical Internship',
    title: 'In-Chamber / In-Office',
  }
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

// Keeping these for now in case they are needed, but they weren't in the HTML
export const features: Feature[] = [
  {
    icon: PenTool,
    title: 'Skill-Based Papers',
    description:
      'Real legal tasks - not textbook MCQs. Drafting, research, argumentation. Designed to mirror actual legal practice.',
  },
  {
    icon: ShieldCheck,
    title: 'College Verification',
    description:
      'Every profile authenticated against the student institution. Firms see only verified, trustworthy candidates.',
  },
  {
    icon: Trophy,
    title: 'National Rankings',
    description:
      'A live, transparent ranking by performance. Your score earns your position. No influence. No negotiation.',
  },
  {
    icon: Mic,
    title: 'Structured Interviews',
    description:
      'Top-ranked students are interviewed before entering the directory - a rigorous second layer that firms can trust.',
  },
  {
    icon: Scale,
    title: 'Precision Filtration',
    description:
      'Filter by score, practice area, year and location. Find exactly who your team needs - in minutes, not weeks.',
  },
  {
    icon: BookOpen,
    title: 'Verified Directory',
    description:
      'India first searchable directory of assessed and ranked law students - live and accessible to verified firms.',
  },
]

export const pillars: Pillar[] = [
  {
    icon: Scale,
    title: 'Merit over pedigree',
    description:
      'Your score determines your visibility - not your college name, not your city, not your network.',
  },
  {
    icon: Eye,
    title: 'Radical transparency',
    description:
      'Rankings are public and real. Every number is earned through assessment - never manufactured.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust as infrastructure',
    description:
      'Verified students. Verified firms. Every interaction is built on authenticated identity.',
  },
  {
    icon: Lock,
    title: 'No shortcuts. Ever.',
    description:
      'Rankings cannot be bought. Profiles cannot be inflated. The standard is high because the stakes are real.',
  },
]
