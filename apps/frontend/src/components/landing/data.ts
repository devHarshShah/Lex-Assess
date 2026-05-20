import {
  PenTool,
  ShieldCheck,
  Trophy,
  Mic,
  Filter,
  BookOpen,
  Scale,
  Eye,
  Lock,
  Rocket,
  Hammer,
  Landmark,
  Lightbulb,
  ScrollText,
  Search,
} from 'lucide-react'
import type { Feature, Pillar, Step, Track } from './types'

export const navItems = ['Assessments', 'Rankings', 'Directory', 'For Firms']

export const pipelineSteps: Step[] = [
  {
    number: '01',
    pill: 'Assess',
    title: 'Attempt the Paper',
    description:
      'Rigorous law skill papers - drafting, research, legal reasoning and subject mastery.',
  },
  {
    number: '02',
    pill: 'Rank',
    title: 'Earn Your National Rank',
    description:
      'Your score places you on a transparent national ranking. Earned, not awarded.',
  },
  {
    number: '03',
    pill: 'Interview',
    title: 'Face the Interview Round',
    description:
      'High-ranking students are called for a structured interview - the final stamp of credibility.',
  },
  {
    number: '04',
    pill: 'Discover',
    title: 'Law Firms Find You',
    description:
      'Verified firms browse the ranked directory and reach out with internship offers.',
  },
]

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
    icon: Filter,
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
  {
    icon: Rocket,
    title: 'Honest from day one',
    description:
      'No fake numbers, no false promises - just a system that works and earns trust over time.',
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
    icon: Hammer,
    title: 'Litigation',
    description:
      'Pleadings, arguments, procedural law and courtroom reasoning.',
  },
  {
    icon: Landmark,
    title: 'Corporate Law',
    description:
      'Company law, contracts, M&A fundamentals and transactional drafting.',
  },
  {
    icon: Lightbulb,
    title: 'Intellectual Property',
    description:
      'Trademarks, patents, copyright and IP enforcement frameworks.',
  },
  {
    icon: ScrollText,
    title: 'Constitutional Law',
    description:
      'Fundamental rights, interpretation and landmark jurisprudence.',
  },
  {
    icon: Lock,
    title: 'Criminal Law',
    description: 'IPC, CrPC, evidence law and criminal trial procedure.',
  },
  {
    icon: Search,
    title: 'Legal Research',
    description:
      'Research methodology, citation, case analysis and statutory interpretation.',
  },
]
