import type { LucideIcon } from 'lucide-react'

export type Step = {
  number: string
  pill?: string
  title: string
  description: string
  tag?: string
}

export type Stat = {
  num: string
  label: string
}

export type CredibilityCard = {
  title: string
  description: string
}

export type AssessmentModule = {
  id: string
  title: string
  description: string
}

export type FAQ = {
  question: string
  answer: string
}

export type InternshipType = {
  badge: string
  title: string
}

export type Feature = {
  icon: LucideIcon
  title: string
  description: string
}

export type Pillar = {
  icon: LucideIcon
  title: string
  description: string
}

export type Track = {
  roman: string
  title: string
  description: string
  icon?: LucideIcon
}
