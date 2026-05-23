import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, FileCheck2 } from 'lucide-react'
import { toast } from 'sonner'

import { ProfileStepper } from '@/components/profile-stepper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetchCurrentUser, saveProfileVerification, storeUser, type VerificationType, uploadProfileAsset } from '@/lib/auth'

const MAX_VERIFICATION_DOC_BYTES = 2 * 1024 * 1024

export function ProfileVerificationPage() {
  const navigate = useNavigate()
  const [verificationType, setVerificationType] = React.useState<VerificationType>('ONGOING')
  const [verificationDocUrl, setVerificationDocUrl] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-5xl space-y-6">
        <ProfileStepper currentStep={2} />
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Verification Step</CardTitle>
              <p className="text-sm text-muted-foreground">
                Step 2 of 2: upload degree document if graduated, or college ID card if currently studying.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Type</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={verificationType}
                  onChange={(e) => setVerificationType(e.target.value as VerificationType)}
                >
                  <option value="ONGOING">Ongoing Degree (College ID Card)</option>
                  <option value="GRADUATED">Graduated (Degree Certificate)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Verification Document</label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > MAX_VERIFICATION_DOC_BYTES) {
                      toast.error('Verification document must be 2 MB or smaller.')
                      e.target.value = ''
                      return
                    }
                    try {
                      const upload = await uploadProfileAsset(file, 'verification_doc')
                      setVerificationDocUrl(upload.url)
                      toast.success('Verification document uploaded')
                    } catch {
                      toast.error('Could not upload verification document')
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => navigate({ to: '/profile/setup' })}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={submitting || !verificationDocUrl}
                  onClick={async () => {
                    setSubmitting(true)
                    try {
                      await saveProfileVerification({
                        verificationType,
                        verificationDocUrl,
                      })
                      const refreshed = await fetchCurrentUser()
                      storeUser(refreshed)
                      toast.success('Profile completed')
                      await navigate({ to: '/dashboard' })
                    } catch {
                      toast.error('Could not save verification')
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                >
                  Complete Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-gradient-to-br from-background to-muted/40">
            <CardHeader>
              <CardTitle>Final Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 h-4 w-4 text-primary" />
                <p>Upload a clear degree certificate if graduated, or a current college ID card if ongoing.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <p>Once this step is complete, your dashboard access is unlocked and your profile is marked verified.</p>
              </div>
              {verificationDocUrl ? (
                <div className="rounded-lg border bg-background/70 p-3 text-xs">
                  Document uploaded. You can now complete your profile.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
