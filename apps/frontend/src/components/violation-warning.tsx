import { AlertTriangle } from 'lucide-react'
import type { ViolationNotice } from '@/hooks/use-anti-cheat'

interface ViolationWarningProps {
  violation: ViolationNotice | null
  onDismiss: () => void
}

export function ViolationWarning({ violation, onDismiss }: ViolationWarningProps) {
  if (!violation) return null

  const { kind, count, max, cancelled } = violation
  const remaining = Math.max(0, max - count)
  const reason = kind === 'tab-switch'
    ? 'You switched to another tab or window.'
    : 'You left the test window.'

  return (
    <div
      key={violation.id}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="violation-title"
      className="fixed inset-0 z-[9998] bg-red-950/85 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
    >
      <div className="bg-background border-4 border-red-600 rounded-2xl max-w-2xl w-full p-12 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-red-600 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
          <AlertTriangle size={64} className="text-white" />
        </div>

        <h2 id="violation-title" className="text-5xl font-extrabold uppercase tracking-tight text-red-600 mb-4">
          {cancelled ? 'Section Cancelled' : 'Violation Detected'}
        </h2>
        <p className="text-2xl font-semibold text-foreground mb-8">{reason}</p>

        <div className="inline-flex items-baseline gap-2 bg-red-600/10 border-2 border-red-600/40 rounded-xl px-10 py-4 mb-6">
          <span className="text-7xl font-black font-mono text-red-600">{count}</span>
          <span className="text-3xl font-bold text-red-600/70">/ {max}</span>
        </div>

        <p className="text-xl text-muted-foreground leading-relaxed mb-10">
          {cancelled
            ? 'You reached the maximum number of violations. This section has been cancelled and you are being moved to the next one.'
            : `${remaining} more violation${remaining === 1 ? '' : 's'} will cancel this section. Stay on the test window.`}
        </p>

        <button
          onClick={onDismiss}
          autoFocus
          className="w-full py-5 bg-red-600 text-white rounded-lg font-bold text-xl uppercase tracking-wider hover:bg-red-700 transition-colors"
        >
          {cancelled ? 'Continue' : 'I Understand – Return to Test'}
        </button>
      </div>
    </div>
  )
}
