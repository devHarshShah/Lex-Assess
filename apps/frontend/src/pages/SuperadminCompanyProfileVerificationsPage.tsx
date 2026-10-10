import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, Plus } from 'lucide-react'

import {
  createCompanyAccount,
  fetchSuperadminCompanyProfiles,
  resendCompanyWelcome,
  reviewCompanyProfile,
  type ManagedCompanyProfileRecord,
} from '@/lib/company-profile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export function SuperadminCompanyProfileVerificationsPage() {
  const [rows, setRows] = React.useState<ManagedCompanyProfileRecord[]>([])
  const [reasonDrafts, setReasonDrafts] = React.useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = React.useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)
  const [resendingId, setResendingId] = React.useState<string | null>(null)

  async function load() {
    try {
      setRows(await fetchSuperadminCompanyProfiles())
    } catch {
      toast.error('Could not load company profiles')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  async function handleReview(userId: string, status: 'APPROVED' | 'REJECTED') {
    setReviewingId(userId)
    try {
      await reviewCompanyProfile(userId, {
        status,
        rejectionReason: status === 'REJECTED' ? reasonDrafts[userId] : undefined,
      })
      await load()
      toast.success(status === 'APPROVED' ? 'Company approved' : 'Company rejected')
    } catch {
      toast.error('Could not update company verification')
    } finally {
      setReviewingId(null)
    }
  }

  async function handleAddCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const field = (key: string) => String(form.get(key) ?? '').trim()

    setIsAdding(true)
    try {
      await createCompanyAccount({
        email: field('email'),
        name: field('name'),
        companyName: field('companyName'),
        companyLegalName: field('companyLegalName'),
        companyPan: field('companyPan') || undefined,
        companyGstin: field('companyGstin') || undefined,
        operatorName: field('operatorName'),
        operatorDesignation: field('operatorDesignation'),
      })
      toast.success('Company added. A password setup email has been sent.')
      setIsAddOpen(false)
      await load()
    } catch {
      // api-client already toasts the server's message (e.g. email already exists)
    } finally {
      setIsAdding(false)
    }
  }

  async function handleResendWelcome(userId: string) {
    setResendingId(userId)
    try {
      await resendCompanyWelcome(userId)
      toast.success('Setup email resent')
    } catch {
      // api-client already toasts the error
    } finally {
      setResendingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Company Profile Verification</CardTitle>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Company</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCompany} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label htmlFor="company-email">Login Email</Label>
                <Input id="company-email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-contact">Contact Name</Label>
                <Input id="company-contact" name="name" required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" name="companyName" required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-legal-name">Legal Name</Label>
                <Input id="company-legal-name" name="companyLegalName" required minLength={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="company-pan">PAN (optional)</Label>
                  <Input id="company-pan" name="companyPan" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-gstin">GSTIN (optional)</Label>
                  <Input id="company-gstin" name="companyGstin" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-operator">Operator Name</Label>
                <Input id="company-operator" name="operatorName" required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-designation">Operator Designation</Label>
                <Input id="company-designation" name="operatorDesignation" required minLength={2} />
              </div>
              <p className="text-xs text-muted-foreground">
                The company is approved immediately and receives an email to set its password.
              </p>
              <DialogFooter>
                <Button type="submit" disabled={isAdding}>
                  {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Company
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Legal Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>ID Card</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.profile?.companyName || '-'}</TableCell>
                <TableCell>{row.profile?.companyLegalName || '-'}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.profile?.companyPan || '-'}</TableCell>
                <TableCell>{row.profile?.companyGstin || '-'}</TableCell>
                <TableCell>
                  {row.profile?.operatorName} ({row.profile?.operatorDesignation})
                </TableCell>
                <TableCell>
                  {row.profile?.operatorIdCardUrl ? (
                    <a href={row.profile.operatorIdCardUrl} target="_blank" rel="noreferrer" className="underline">
                      View
                    </a>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.profile?.verificationStatus === 'APPROVED'
                        ? 'secondary'
                        : row.profile?.verificationStatus === 'REJECTED'
                          ? 'destructive'
                          : 'outline'
                    }
                  >
                    {row.profile?.verificationStatus ?? 'PENDING'}
                  </Badge>
                  {row.profile?.verificationStatus === 'REJECTED' && row.profile.rejectionReason ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.profile.rejectionReason}</p>
                  ) : null}
                </TableCell>
                <TableCell className="space-y-2">
                  <Textarea
                    placeholder="Rejection reason (optional)"
                    className="w-48 text-xs"
                    value={reasonDrafts[row.id] ?? ''}
                    onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={reviewingId === row.id} onClick={() => handleReview(row.id, 'APPROVED')}>
                      {reviewingId === row.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" disabled={reviewingId === row.id} onClick={() => handleReview(row.id, 'REJECTED')}>
                      {reviewingId === row.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Reject
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resendingId === row.id}
                    onClick={() => handleResendWelcome(row.id)}
                  >
                    {resendingId === row.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                    Resend setup email
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
