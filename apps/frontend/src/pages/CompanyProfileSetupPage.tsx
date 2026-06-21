import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchCurrentUser, storeUser, uploadProfileAsset, type AuthUser } from '@/lib/auth'
import { fetchMyCompanyProfile, saveCompanyProfile, type CompanyProfile } from '@/lib/company-profile'

const MAX_ID_CARD_BYTES = 2 * 1024 * 1024

function validateFileSize(file: File, maxBytes: number, label: string): boolean {
  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0)
    toast.error(`${label} must be ${maxMb} MB or smaller.`)
    return false
  }
  return true
}

function getMissingMessage(input: {
  companyName: string
  companyLegalName: string
  operatorName: string
  operatorDesignation: string
}) {
  if (!input.companyName.trim()) return 'Please enter the company name'
  if (!input.companyLegalName.trim()) return 'Please enter the company legal name'
  if (!input.operatorName.trim()) return "Please enter the operator's name"
  if (!input.operatorDesignation.trim()) return "Please enter the operator's designation"
  return null
}

export function CompanyProfileSetupPage({ mode = 'setup' }: { user: AuthUser; mode?: 'setup' | 'manage' }) {
  const navigate = useNavigate()
  const idCardInputRef = React.useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [profile, setProfile] = React.useState<CompanyProfile | null>(null)

  const [companyName, setCompanyName] = React.useState('')
  const [companyLegalName, setCompanyLegalName] = React.useState('')
  const [companyPan, setCompanyPan] = React.useState('')
  const [companyGstin, setCompanyGstin] = React.useState('')
  const [operatorName, setOperatorName] = React.useState('')
  const [operatorDesignation, setOperatorDesignation] = React.useState('')
  // `Url` previews the (presigned) image; `Key` holds the object key from a
  // fresh upload (what we persist). Submit prefers the key, falling back to the
  // loaded URL so an unchanged field is never wiped.
  const [operatorIdCardUrl, setOperatorIdCardUrl] = React.useState('')
  const [operatorIdCardKey, setOperatorIdCardKey] = React.useState('')

  React.useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const existing = await fetchMyCompanyProfile()
        if (!isMounted) return
        if (existing) {
          setProfile(existing)
          setCompanyName(existing.companyName)
          setCompanyLegalName(existing.companyLegalName)
          setCompanyPan(existing.companyPan ?? '')
          setCompanyGstin(existing.companyGstin ?? '')
          setOperatorName(existing.operatorName)
          setOperatorDesignation(existing.operatorDesignation)
          setOperatorIdCardUrl(existing.operatorIdCardUrl ?? '')
        }
      } catch {
        toast.error('Could not load company profile')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [])

  const isRejected = profile?.verificationStatus === 'REJECTED'
  const isPending = profile?.verificationStatus === 'PENDING'
  const isApproved = profile?.verificationStatus === 'APPROVED'

  async function handleSubmit() {
    const missing = getMissingMessage({ companyName, companyLegalName, operatorName, operatorDesignation })
    if (missing) {
      toast.error(missing)
      return
    }

    setSubmitting(true)
    try {
      const saved = await saveCompanyProfile({
        companyName,
        companyLegalName,
        companyPan: companyPan.trim() || undefined,
        companyGstin: companyGstin.trim() || undefined,
        operatorName,
        operatorDesignation,
        operatorIdCardUrl: operatorIdCardKey || operatorIdCardUrl.trim() || undefined,
      })
      setProfile(saved)

      const refreshedUser = await fetchCurrentUser()
      storeUser(refreshedUser)

      if (mode === 'setup') {
        toast.success("Profile submitted. You'll get full dashboard access once it's approved.")
        await navigate({ to: '/dashboard' })
      } else {
        toast.success('Company profile updated')
      }
    } catch {
      toast.error('Could not save company profile')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading company profile...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>
                Tell us about your company and the person operating this account. An admin will review your
                submission before you get full dashboard access.
              </CardDescription>
            </div>
            {profile ? (
              <Badge variant={isApproved ? 'secondary' : isRejected ? 'destructive' : 'outline'}>
                {profile.verificationStatus}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isPending ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Your company profile is under review by our team.
            </div>
          ) : null}
          {isRejected ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Your submission was rejected{profile?.rejectionReason ? `: ${profile.rejectionReason}` : '.'} Please
              update the details below and resubmit.
            </div>
          ) : null}
          {isApproved ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Your company profile is verified.
            </div>
          ) : null}

          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company Legal Name</Label>
              <Input value={companyLegalName} onChange={(e) => setCompanyLegalName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company PAN <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input value={companyPan} onChange={(e) => setCompanyPan(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company GSTIN <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input value={companyGstin} onChange={(e) => setCompanyGstin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Operator Name</Label>
              <Input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} />
              <p className="text-xs text-muted-foreground">Name of the person who will operate this account.</p>
            </div>
            <div className="space-y-2">
              <Label>Operator Designation</Label>
              <Input value={operatorDesignation} onChange={(e) => setOperatorDesignation(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Operator ID Card Photo</Label>
            <div className="flex items-center gap-3">
              {operatorIdCardUrl ? (
                <img src={operatorIdCardUrl} alt="Operator ID card" className="h-16 w-24 rounded-md border object-cover" />
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={() => idCardInputRef.current?.click()} className="gap-2">
                <Pencil className="h-3.5 w-3.5" />
                {operatorIdCardUrl ? 'Replace photo' : 'Upload photo'}
              </Button>
              <input
                ref={idCardInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (!validateFileSize(file, MAX_ID_CARD_BYTES, 'ID card photo')) {
                    e.target.value = ''
                    return
                  }
                  try {
                    const upload = await uploadProfileAsset(file, 'operator_id_card')
                    setOperatorIdCardUrl(upload.url)
                    setOperatorIdCardKey(upload.objectKey)
                    toast.success('ID card photo uploaded')
                  } catch {
                    toast.error('Could not upload ID card photo')
                  }
                }}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : isRejected ? 'Resubmit for Review' : mode === 'setup' ? 'Submit for Review' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
