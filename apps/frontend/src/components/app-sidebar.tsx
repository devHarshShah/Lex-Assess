import * as React from 'react'
import { Award, BarChart3, PhoneCall, Bell, BookOpen, Building2, ClipboardList, FileText, GraduationCap, ShieldCheck, ShieldUser, SquareTerminal, University, UserCheck, UserCircle2, Wrench } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'

import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'
import { getActiveRole, getAvailableRoles, setActiveRole, type AuthUser } from '@/lib/auth'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  }) as unknown as AuthUser

  const [, forceRerender] = React.useState(0)

  if (!user) return null

  const availableRoles = getAvailableRoles(user)
  const activeRole = getActiveRole(user)
  let navMainItems: React.ComponentProps<typeof NavMain>['items'] = []

  if (user.role === 'USER' && !user.profileCompleted) {
    navMainItems = [
      {
        title: 'Setup',
        url: '/dashboard/setup',
        icon: UserCircle2,
        isActive: true,
        items: [{ title: 'Complete Profile', url: '/dashboard/setup' }],
      },
    ]
  } else if (user.role === 'COMPANY' && !user.profileCompleted) {
    navMainItems = [
      {
        title: 'Company Setup',
        url: '/dashboard/company-setup',
        icon: Building2,
        isActive: true,
        items: [{ title: 'Complete Company Profile', url: '/dashboard/company-setup' }],
      },
    ]
  } else {
    navMainItems = [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: SquareTerminal,
        isActive: true,
        items: [{ title: 'Overview', url: '/dashboard' }],
      },
    ]

    if (activeRole === 'SUPERADMIN') {
    navMainItems.push(
      {
        title: 'User Admin',
        url: '/dashboard/users',
        icon: ShieldUser,
        items: [{ title: 'Manage Users', url: '/dashboard/users' }],
      },
      {
        title: 'Profile Review',
        url: '/dashboard/profile-verifications',
        icon: UserCheck,
        items: [{ title: 'Verify Profiles', url: '/dashboard/profile-verifications' }],
      },
      {
        title: 'Company Review',
        url: '/dashboard/company-profile-verifications',
        icon: UserCheck,
        items: [{ title: 'Verify Companies', url: '/dashboard/company-profile-verifications' }],
      },
      {
        title: 'Profile Options',
        url: '/dashboard/specializations',
        icon: ShieldCheck,
        items: [
          { title: 'Practice Areas', url: '/dashboard/specializations' },
          { title: 'Colleges', url: '/dashboard/colleges' },
          { title: 'Degrees', url: '/dashboard/degrees' },
        ],
      },
      {
        title: 'Assessments',
        url: '/dashboard/all-papers',
        icon: FileText,
        items: [
          { title: 'All Question Papers', url: '/dashboard/all-papers' },
        ],
      },
      {
        title: 'Submissions',
        url: '/dashboard/submissions',
        icon: ClipboardList,
        items: [{ title: 'View Submissions', url: '/dashboard/submissions' }],
      },
      {
        title: 'Interviews',
        url: '/dashboard/interviewers',
        icon: GraduationCap,
        items: [
          { title: 'Manage Interviewers', url: '/dashboard/interviewers' },
          { title: 'Company Interviews', url: '/dashboard/company-interviews' },
        ],
      },
      {
        title: 'Student CRM',
        url: '/dashboard/crm',
        icon: PhoneCall,
        items: [{ title: 'Leads & Follow-ups', url: '/dashboard/crm' }],
      },
      {
        title: 'Ranking',
        url: '/dashboard/ranking',
        icon: BarChart3,
        items: [{ title: 'Common Rank Leaderboard', url: '/dashboard/ranking' }],
      },
      {
        title: 'Marketing',
        url: '/dashboard/notifications',
        icon: Bell,
        items: [
          { title: 'Notifications', url: '/dashboard/notifications' },
          { title: 'Coupons', url: '/dashboard/coupons' },
          { title: 'Email Campaigns', url: '/dashboard/email-campaigns' },
        ],
      },
      {
        title: 'Analytics',
        url: '/dashboard/analytics',
        icon: BarChart3,
        items: [{ title: 'User & Payment Funnel', url: '/dashboard/analytics' }],
      },
      {
        title: 'Maintenance',
        url: '/dashboard/maintenance',
        icon: Wrench,
        items: [{ title: 'Maintenance Mode', url: '/dashboard/maintenance' }],
      }
    )
  } else if (activeRole === 'ADMIN') {
    navMainItems.push(
      {
        title: 'Assessments',
        url: '/dashboard/specializations',
        icon: ShieldCheck,
        items: [
          { title: 'Question Papers', url: '/dashboard/specializations' },
        ],
      },
      {
        title: 'Submissions',
        url: '/dashboard/submissions',
        icon: ClipboardList,
        items: [{ title: 'View Submissions', url: '/dashboard/submissions' }],
      },
      {
        title: 'Interviews',
        url: '/dashboard/interviewers',
        icon: GraduationCap,
        items: [{ title: 'Manage Interviewers', url: '/dashboard/interviewers' }],
      },
      {
        title: 'Ranking',
        url: '/dashboard/ranking',
        icon: BarChart3,
        items: [{ title: 'Common Rank Leaderboard', url: '/dashboard/ranking' }],
      },
      {
        title: 'Profile Review',
        url: '/dashboard/profile-verifications',
        icon: UserCheck,
        items: [{ title: 'Verify Profiles', url: '/dashboard/profile-verifications' }],
      },
      {
        title: 'Company Review',
        url: '/dashboard/company-profile-verifications',
        icon: UserCheck,
        items: [{ title: 'Verify Companies', url: '/dashboard/company-profile-verifications' }],
      },
      {
        title: 'Marketing',
        url: '/dashboard/notifications',
        icon: Bell,
        items: [{ title: 'Notifications', url: '/dashboard/notifications' }],
      },
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: UserCircle2,
        items: [{ title: 'My Profile', url: '/dashboard/profile' }],
      }
    )
  } else if (activeRole === 'INTERVIEWER') {
    navMainItems = [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: SquareTerminal,
        items: [{ title: 'Sessions', url: '/dashboard' }],
      },
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: UserCircle2,
        items: [{ title: 'My Profile', url: '/dashboard/profile' }],
      }
    ]
  } else if (activeRole === 'COMPANY') {
    navMainItems = [{
      title: 'Candidate Directory',
      url: '/dashboard',
      icon: Building2,
      items: [
        { title: 'All Candidates', url: '/dashboard' },
      ],
    }]
  } else {
    navMainItems.push(
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: UserCircle2,
        items: [{ title: 'My Profile', url: '/dashboard/profile' }],
      },
      {
        title: 'Certificate',
        url: '/dashboard/certificate',
        icon: Award,
        items: [{ title: 'My Certificate', url: '/dashboard/certificate' }],
      },
      {
        title: 'Knowledge',
        url: '#',
        icon: BookOpen,
        items: [{ title: 'Guides', url: '#' }],
      }
    )
  }
}

  const projectItems =
    activeRole === 'SUPERADMIN' && user.profileCompleted
      ? [
          { name: 'Colleges', url: '/dashboard/colleges', icon: University },
          { name: 'Degrees', url: '/dashboard/degrees', icon: GraduationCap },
        ]
      : []

  function onRoleChange(role: (typeof availableRoles)[number]) {
    setActiveRole(role)
    forceRerender((v) => v + 1)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher appName="LexAssess" roles={availableRoles} activeRole={activeRole} onRoleChange={onRoleChange} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        {projectItems.length > 0 ? <NavProjects projects={projectItems} /> : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
