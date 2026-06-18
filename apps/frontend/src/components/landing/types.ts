
export type Step = {
  number: string
  pill: string
  title: string
  description: string
}

export type NavItem = {
  label: string
  href: string
}

export type Feature = {
  number: string
  title: string
  description: string
  tag: string
}

export type Pillar = {
  num: string
  title: string
  description: string
}

export type Track = {
  roman: string
  title: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  color?: string
}
