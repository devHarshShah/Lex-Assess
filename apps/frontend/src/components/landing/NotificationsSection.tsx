import { motion } from 'framer-motion'

import type { NotificationRecord } from '@/lib/auth'
import { Card } from '@/components/ui/card'

export function NotificationsSection({ notifications }: { notifications: NotificationRecord[] }) {
  const cardNotifications = notifications.filter((item) => item.placement === 'CARD')

  if (cardNotifications.length === 0) {
    return null
  }

  return (
    <section className="w-full bg-muted/20 py-10 border-y border-border/40">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
        <div className="mb-6 flex items-center gap-4">
          <span className="h-px w-10 bg-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Latest Openings & Updates
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {cardNotifications.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
            >
              <Card className="h-full border-border/60 bg-background p-6 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                  {item.label || 'Update'}
                </div>
                <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
