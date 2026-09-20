import * as React from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import {
  fetchSuperadminCompanyProfiles,
  reviewCompanyProfile,
  type ManagedCompanyProfileRecord,
} from '@/lib/company-profile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export function SuperadminCompanyProfileVerificationsPage() {
  const [rows, setRows] = React.useState<ManagedCompanyProfileRecord[]>([])
  const [reasonDrafts, setReasonDrafts] = React.useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = React.useState<string | null>(null)

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile Verification</CardTitle>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
