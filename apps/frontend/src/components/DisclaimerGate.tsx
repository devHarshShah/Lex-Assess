import * as React from 'react'
import { Link, useLocation } from '@tanstack/react-router'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { acceptDisclaimer, DISCLAIMER_PARAGRAPHS, hasAcceptedDisclaimer } from '@/lib/legal'

// Pages that must stay readable so the links inside the notice can be followed.
const EXEMPT_PATHS = ['/terms', '/privacy-policy']

export function DisclaimerGate() {
  const { pathname } = useLocation()
  const [open, setOpen] = React.useState(false)

  // Read storage after mount so nothing flashes before we know whether the notice is needed.
  React.useEffect(() => {
    setOpen(!hasAcceptedDisclaimer())
  }, [])

  const visible = open && !EXEMPT_PATHS.includes(pathname)

  return (
    <AlertDialog open={visible}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Before you continue</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm leading-relaxed">
              {DISCLAIMER_PARAGRAPHS.map((text) => (
                <p key={text}>{text}</p>
              ))}
              <p>
                Use of this site is subject to our{' '}
                <Link to="/terms" className="font-medium text-primary underline underline-offset-2">
                  Terms of Use
                </Link>{' '}
                and{' '}
                <Link to="/privacy-policy" className="font-medium text-primary underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              acceptDisclaimer()
              setOpen(false)
            }}
          >
            I Understand &amp; Agree
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
