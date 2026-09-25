import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'

import { verifyCertificate, type CertificateVerifyRecord } from '@/lib/certificates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function VerifyCertificatePage() {
  const { code } = useParams({ from: '/verify/$code' })
  const [certificate, setCertificate] = React.useState<CertificateVerifyRecord | null>(null)
  const [status, setStatus] = React.useState<'loading' | 'valid' | 'invalid'>('loading')

  React.useEffect(() => {
    async function load() {
      try {
        setCertificate(await verifyCertificate(code))
        setStatus('valid')
      } catch {
        setStatus('invalid')
      }
    }
    void load()
  }, [code])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Certificate Verification
            {status === 'valid' && <Badge variant="secondary">Valid</Badge>}
            {status === 'invalid' && <Badge variant="destructive">Invalid</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === 'loading' && <p className="text-sm text-muted-foreground">Checking certificate...</p>}

          {status === 'invalid' && (
            <p className="text-sm text-muted-foreground">
              This certificate code could not be verified. Please check the link and try again.
            </p>
          )}

          {status === 'valid' && certificate && (
            <>
              <dl className="space-y-2 text-sm">
                <Row label="Name" value={certificate.fullName} />
                {certificate.rollNumber && <Row label="Roll No." value={certificate.rollNumber} />}
                <Row label="Practice Area" value={certificate.practiceArea} />
                <Row label="Common Score" value={certificate.commonScore.toFixed(1)} />
                <Row label="Issued" value={new Date(certificate.issuedAt).toLocaleDateString()} />
              </dl>

              <div className="rounded-md border border-dashed border-border/60 p-3 text-sm">
                {certificate.rank.status === 'RELEASED' ? (
                  <p>
                    <span className="font-medium">Rank: #{certificate.rank.rank}</span>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      as of the {certificate.rank.releaseLabel} release
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Rank yet to be generated. Ranks are released periodically and this candidate is not part of a
                    release yet.
                  </p>
                )}
              </div>
            </>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link to="/">Back to LexAssess</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
