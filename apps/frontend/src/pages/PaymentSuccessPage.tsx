import React from 'react'
import { CheckCircle2, ChevronRight, Sparkles, Printer, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { storeUser, fetchCurrentUser } from '@/lib/auth'

interface ReceiptData {
  paymentId: string
  subscriptionId: string
  amount: string
  plan: string
  validity: string
  date: string
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function PaymentSuccessPage() {
  const [loading, setLoading] = React.useState(false)
  const [receipt, setReceipt] = React.useState<ReceiptData | null>(null)

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lex_payment_receipt')
      if (raw) setReceipt(JSON.parse(raw))
    } catch {
      // ignore parse errors
    }
  }, [])

  const handleGoToDashboard = async () => {
    setLoading(true)
    try {
      const freshUser = await fetchCurrentUser()
      storeUser(freshUser)
    } catch {
      // navigate anyway
    }
    window.location.href = '/dashboard'
  }

  const rows = [
    ...(receipt?.paymentId ? [{ label: 'Transaction ID', value: receipt.paymentId, mono: true }] : []),
    { label: 'Product', value: receipt?.plan ?? 'Lex-Assess Premium' },
    { label: 'Amount Paid', value: receipt?.amount ?? '₹499.00' },
    { label: 'Validity', value: receipt?.validity ?? '3 Months', green: true },
    ...(receipt?.date ? [{ label: 'Date & Time', value: formatDate(receipt.date) }] : []),
    { label: 'Status', badge: true },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      {/* Print styles — more robust visibility-based printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #lex-receipt-print, #lex-receipt-print * {
            visibility: visible !important;
          }
          #lex-receipt-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
          }
        }
        #lex-receipt-print { display: none; }
      `}</style>

      {/* Hidden printable-only receipt — using inline styles for maximum print reliability */}
      <div id="lex-receipt-print" style={{ padding: '40px', fontFamily: 'sans-serif', color: '#111827' }}>
        <div style={{ marginBottom: '24px', borderBottom: '2px solid #f59e0b', paddingBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Lex-Assess</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Payment Receipt</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>{r.label}</span>
              <span style={{ fontWeight: 600, color: r.green ? '#059669' : '#111827' }}>
                {r.badge ? 'Active' : r.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed #e5e7eb', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '18px' }}>
          <span>Total Amount</span>
          <span style={{ color: '#92400e' }}>{receipt?.amount ?? '₹499.00'}</span>
        </div>

        <div style={{ marginTop: '40px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
          <p>This is a computer-generated receipt. No signature required.</p>
          <p style={{ marginTop: '4px' }}>Powered by Razorpay · Lex-Assess © {new Date().getFullYear()}</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-card rounded-3xl overflow-hidden shadow-2xl border border-amber-200">
        {/* Amber top stripe */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700" />

        {/* Header */}
        <div className="text-center p-8 pb-4">
          {/* Green tick circle */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Payment Success!</h2>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Your premium access has been activated.
          </p>
        </div>

        {/* Receipt card */}
        <div className="px-8 pb-4">
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Receipt label bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-100/40 border-b border-amber-100">
              <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase">
                Payment Receipt
              </span>
              {receipt?.paymentId && (
                <span className="text-[10px] font-mono font-bold text-amber-700/70">
                  #{receipt.paymentId.slice(-8).toUpperCase()}
                </span>
              )}
            </div>

            {/* Rows */}
            <div className="p-4 flex flex-col gap-3.5">
              {rows.map(({ label, value, green, badge, mono }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground/80 text-xs font-semibold">{label}</span>
                  {badge ? (
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      ● Active
                    </span>
                  ) : (
                    <span
                      className={`font-bold text-right max-w-[65%] break-all ${
                        green ? 'text-emerald-600' : 'text-foreground'
                      } ${mono ? 'font-mono' : ''}`}
                    >
                      {value}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center px-4 py-4 border-t border-dashed border-amber-200 bg-amber-50/80">
              <span className="text-sm font-bold text-amber-900">Total Charged</span>
              <span className="text-xl font-black text-amber-900">
                {receipt?.amount ?? '₹499.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="px-8 py-2">
          <div className="flex items-start gap-3 p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900 leading-relaxed font-medium">
              All practice tests and assessment features are now unlocked for your account. Start your journey now!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-8 pt-4 flex flex-col gap-3">
          <Button
            className="w-full h-12 text-sm font-bold rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-600/30 border-none transition-all hover:scale-[1.02] active:scale-100"
            onClick={handleGoToDashboard}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Syncing Profile...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Go to Assessment Area
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full h-10 text-xs font-bold rounded-2xl text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Download PDF Receipt
          </Button>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 text-center border-t border-amber-100 bg-amber-50/30">
          <p className="text-[10px] text-amber-800/60 font-medium">
            A confirmation email has been sent to your registered address.
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 opacity-40">
            <p className="text-[10px] text-amber-900 font-bold uppercase tracking-widest">Powered by</p>
            <span className="text-xs font-black tracking-tighter italic text-amber-950">Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  )
}
