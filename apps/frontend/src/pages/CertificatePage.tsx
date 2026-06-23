import * as React from 'react'
import { toast } from 'sonner'

import { fetchMyCertificate, generateCertificate, type CertificateRecord } from '@/lib/certificates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CertificatePage() {
  const [certificate, setCertificate] = React.useState<CertificateRecord | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [generating, setGenerating] = React.useState(false)

  async function load() {
    try {
      const result = await fetchMyCertificate()
      setCertificate(result && result.verificationCode ? result : null)
    } catch {
      toast.error('Could not load certificate')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    const hadCertificate = certificate !== null
    try {
      setCertificate(await generateCertificate())
      toast.success(hadCertificate ? 'Certificate updated' : 'Certificate generated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate certificate')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!loading && certificate && (
          <div className="space-y-3 text-sm">
            <Row label="Name" value={certificate.fullName} />
            {certificate.rollNumber && <Row label="Roll No." value={certificate.rollNumber} />}
            <Row label="Practice Area" value={certificate.practiceArea} />
            <Row label="Rank" value={`#${certificate.rank}`} />
            <Row label="Common Score" value={certificate.commonScore.toFixed(1)} />
            <Row label="Issued" value={new Date(certificate.issuedAt).toLocaleDateString()} />

            <div className="flex gap-2 pt-2">
              <Button asChild disabled={!certificate.pdfUrl}>
                <a href={certificate.pdfUrl ?? undefined} target="_blank" rel="noreferrer">
                  Download PDF
                </a>
              </Button>
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          </div>
        )}

        {!loading && !certificate && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You don't have a certificate yet. You become eligible once you have a scored test attempt and a
              completed interview.
            </p>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Certificate'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
