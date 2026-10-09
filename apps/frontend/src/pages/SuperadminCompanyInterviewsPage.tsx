import * as React from 'react'
import { useSearch } from '@tanstack/react-router'

import { InterviewsTab } from '@/components/company-interviews/InterviewsTab'
import { ScheduleInterviewForm } from '@/components/company-interviews/ScheduleInterviewForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function SuperadminCompanyInterviewsPage() {
  // ?student=<email> pre-selects the student (used by the CRM shortcut)
  const { student } = useSearch({ from: '/dashboard/company-interviews' })
  const [tab, setTab] = React.useState('schedule')
  const [refreshKey, setRefreshKey] = React.useState(0)

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Company interviews</h1>
        <p className="text-sm text-muted-foreground">
          Set up interviews between companies and students. Both sides get a calendar invite and an email you can check before sending.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="all">All interviews</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="mt-5">
          <ScheduleInterviewForm
            initialStudent={student}
            onScheduled={() => {
              setRefreshKey((k) => k + 1)
              setTab('all')
            }}
          />
        </TabsContent>
        <TabsContent value="all" className="mt-5">
          <InterviewsTab refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
