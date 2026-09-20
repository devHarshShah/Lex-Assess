import * as React from 'react'
import { toast } from 'sonner'
import {
  createAdminNotification,
  deleteAdminNotification,
  fetchAdminNotifications,
  updateAdminNotification,
  type NotificationRecord,
  type NotificationPlacement
} from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Megaphone, LayoutList, Trash2, Power, PowerOff, Loader2 } from 'lucide-react'

export function SuperadminNotificationsPage() {
  const [items, setItems] = React.useState<NotificationRecord[]>([])
  const [form, setForm] = React.useState<{
    placement: NotificationPlacement
    label: string
    title: string
    description: string
  }>({
    placement: 'BANNER',
    label: '',
    title: '',
    description: ''
  })
  const [isAdding, setIsAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  async function load() {
    try {
      setItems(await fetchAdminNotifications())
    } catch {
      toast.error('Could not load notifications')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  async function handleAdd() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    setIsAdding(true)
    try {
      await createAdminNotification({
        ...form,
        label: form.label.trim() || undefined,
        description: form.description.trim() || undefined
      })
      setForm({
        placement: 'BANNER',
        label: '',
        title: '',
        description: ''
      })
      await load()
      toast.success('Notification created')
    } catch {
      toast.error('Could not create notification')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleToggleStatus(item: NotificationRecord) {
    setBusyId(item.id)
    try {
      await updateAdminNotification(item.id, { isActive: !item.isActive })
      await load()
      toast.success(`Notification ${!item.isActive ? 'activated' : 'deactivated'}`)
    } catch {
      toast.error('Could not update status')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this notification?')) return
    setBusyId(id)
    try {
      await deleteAdminNotification(id)
      await load()
      toast.success('Notification deleted')
    } catch {
      toast.error('Could not delete notification')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Placement</label>
              <Select 
                value={form.placement} 
                onValueChange={(v: string) => setForm(prev => ({ ...prev, placement: v as NotificationPlacement }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANNER">Banner (Top Marquee)</SelectItem>
                  <SelectItem value="CARD">Card (Below Hero)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Label (Optional)</label>
              <Input 
                value={form.label} 
                onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))} 
                placeholder="e.g. NEW, UPDATE, URGENT" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input 
              value={form.title} 
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} 
              placeholder="Notification title" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea 
              value={form.description} 
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="Detailed description for Card placement" 
              rows={3}
            />
          </div>
          <Button onClick={handleAdd} disabled={isAdding} className="w-full md:w-auto">
            {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Notification
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No notifications found.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.placement === 'BANNER' ? 'default' : 'secondary'}>
                        {item.placement === 'BANNER' ? <Megaphone className="mr-1 h-3 w-3" /> : <LayoutList className="mr-1 h-3 w-3" />}
                        {item.placement}
                      </Badge>
                      <Badge variant={item.isActive ? 'secondary' : 'outline'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {item.label && (
                        <Badge variant="outline" className="border-primary text-primary">
                          {item.label}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-bold">{item.title}</h4>
                    {item.description && <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => handleToggleStatus(item)}
                      disabled={busyId === item.id}
                      title={item.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item.id)}
                      disabled={busyId === item.id}
                      title="Delete"
                    >
                      {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
