import * as React from 'react'

import { fetchPublicNotifications, type NotificationRecord } from '@/lib/auth'
import {
  ConvictionSection,
  FeaturesSection,
  Footer,
  Header,
  HeroSection,
  ManifestoSection,
  NotificationsSection,
  TracksSection,
  TwoColSection,
  FaqSection,
} from '../components/landing'

function Divider() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
      <hr className="border-0 border-t border-border/60" />
    </div>
  )
}

export function HomePage() {
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([])

  React.useEffect(() => {
    fetchPublicNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
  }, [])

  return (
    <div className="overflow-x-hidden min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Header />
      <HeroSection notifications={notifications} />
      <NotificationsSection notifications={notifications} />
      <Divider />
      <FeaturesSection />
      <ManifestoSection />
      <ConvictionSection />
      <Divider />
      <TwoColSection />
      <TracksSection />
      <FaqSection />
      <Footer />
    </div>
  )
}
