export interface AccessFields {
  hasActiveSubscription: boolean;
  accessEndsAt?: Date | null;
}

// Effective access. After a mandate cancel we keep hasActiveSubscription true
// and set accessEndsAt, so access lapses by itself without needing a cron job.
export function hasAccess(user: AccessFields, now: Date = new Date()): boolean {
  if (!user.hasActiveSubscription) return false;
  return !user.accessEndsAt || user.accessEndsAt.getTime() > now.getTime();
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export interface CancelAccessInput {
  // Razorpay subscription.current_end (epoch seconds), end of the paid cycle
  currentEndEpoch?: number | null;
  lastPaymentAt: Date | null;
  trialEndsAt: Date | null;
  existingAccessEndsAt: Date | null;
}

// When access should end after the student cancels autopay: the end of what
// they have paid for, or the coupon's free period if nothing was charged yet.
export function computeAccessEndOnCancel(input: CancelAccessInput, cycleMonths = 3): Date {
  let end: Date;
  if (input.lastPaymentAt) {
    const fromRazorpay = input.currentEndEpoch ? new Date(input.currentEndEpoch * 1000) : null;
    end = fromRazorpay && fromRazorpay.getTime() > input.lastPaymentAt.getTime()
      ? fromRazorpay
      : addMonths(input.lastPaymentAt, cycleMonths);
  } else {
    end = input.trialEndsAt ?? new Date(0);
  }
  if (input.existingAccessEndsAt && input.existingAccessEndsAt.getTime() > end.getTime()) {
    return input.existingAccessEndsAt;
  }
  return end;
}
