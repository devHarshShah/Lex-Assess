import * as React from 'react'
import { toast } from 'sonner'

import { fetchMyCertificate, generateCertificate, type CertificateRecord } from '@/lib/certificates'
import { fetchMyStanding, type RankStanding } from '@/lib/ranking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CertificatePage() {
  const [certificate, setCertificate] = React.useState<CertificateRecord | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [generating, setGenerating] = React.useState(false)
  const [standing, setStanding] = React.useState<RankStanding | null>(null)

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
    fetchMyStanding()
      .then(setStanding)
      .catch(() => setStanding(null))
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
            <Row label="Common Score" value={certificate.commonScore.toFixed(1)} />
            <Row label="Issued" value={new Date(certificate.issuedAt).toLocaleDateString()} />
            {standing && <RankRow standing={standing} />}

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

function RankRow({ standing }: { standing: RankStanding }) {
  if (standing.status === 'RELEASED') {
    return <Row label="Rank" value={`#${standing.rank} (${standing.releaseLabel} release)`} />
  }
  return (
    <div className="space-y-1 border-b border-border/60 pb-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Rank</span>
        <span className="font-medium">
          {standing.provisionalRank ? `Provisional ~#${standing.provisionalRank}` : 'Yet to be generated'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {standing.provisionalRank
          ? `Estimated against the ${standing.basedOnReleaseLabel} leaderboard. Your official rank appears in the next release.`
          : 'Ranks are released periodically. Your official rank appears in the next release.'}
      </p>
    </div>
  )
}
