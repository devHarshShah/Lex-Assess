import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Power, PowerOff, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { fetchMaintenanceSettings, updateMaintenanceSettings, type MaintenanceSettings } from '@/lib/maintenance'

export function SuperadminMaintenancePage() {
  const [settings, setSettings] = React.useState<MaintenanceSettings | null>(null)
  const [message, setMessage] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    fetchMaintenanceSettings()
      .then((s) => {
        setSettings(s)
        setMessage(s.message)
      })
      .catch(() => toast.error('Could not load maintenance settings'))
  }, [])

  async function save(enabled: boolean) {
    if (enabled && !window.confirm('Turn on maintenance mode? Everyone except superadmins will be locked out until you turn it off.')) {
      return
    }
    setIsSaving(true)
    try {
      const next = await updateMaintenanceSettings({ enabled, message: message.trim() || undefined })
      setSettings(next)
      setMessage(next.message)
      toast.success(enabled ? 'Maintenance mode is ON' : next.enabled ? 'Message updated' : 'Maintenance mode is OFF')
    } catch {
      // api-client already showed the error
    } finally {
      setIsSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Maintenance Mode</h1>
        <p className="text-sm text-muted-foreground">
          While on, every user except superadmins sees a maintenance screen and the API rejects their requests. Changes reach all servers within about 10 seconds.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Status
          </CardTitle>
          <Badge variant={settings.enabled ? 'destructive' : 'secondary'}>{settings.enabled ? 'ON - site locked' : 'OFF - site open'}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="maintenance-message" className="text-sm font-medium">
              Message shown to users
            </label>
            <Textarea
              id="maintenance-message"
              value={message}
              maxLength={500}
              rows={3}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.enabled ? (
              <>
                <Button onClick={() => save(false)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PowerOff className="mr-2 h-4 w-4" />}
                  Turn off maintenance
                </Button>
                <Button variant="outline" onClick={() => save(true)} disabled={isSaving}>
                  Update message
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={() => save(true)} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
                Turn on maintenance
              </Button>
            )}
          </div>
          {settings.updatedAt && (
            <p className="text-xs text-muted-foreground">Last changed {new Date(settings.updatedAt).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
