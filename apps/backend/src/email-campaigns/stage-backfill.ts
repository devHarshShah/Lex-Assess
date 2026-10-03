import type { FunnelStage } from '../analytics/analytics.types';

export interface StageEvidence {
  sentAt: Date;
  // Stages the campaign targeted: the recipient was in one of these when it was queued
  audienceStages: string[];
  userCreatedAt: Date;
  profile: { createdAt: Date; updatedAt: Date; isComplete: boolean } | null;
  firstCapturedAt: Date | null;
  // Coupon checkout opened / confirmed for this user, earliest first
  redemption: { createdAt: Date; confirmedAt: Date | null } | null;
}

const ORDER: FunnelStage[] = ['REGISTERED', 'PROFILE_STARTED', 'PROFILE_COMPLETE', 'LAPSED', 'PAYMENT_INITIATED', 'TRIAL', 'PAID', 'CANCELLED_ACTIVE'];
const rank = (s: string) => ORDER.indexOf(s as FunnelStage);

// Best guess at a student's stage when a campaign went out. Only the stages we can prove from
// timestamps are used (registered / profile / payment / coupon); the campaign's own audience
// then pins it down: with a single target stage it is exact, otherwise the guess is clamped to
// the nearest targeted stage. `estimated` is false only when the audience had a single stage.
export function estimateStageAtSend(e: StageEvidence): { stage: string; estimated: boolean } | null {
  if (e.audienceStages.length === 1) return { stage: e.audienceStages[0] as string, estimated: false };
  if (!e.audienceStages.length) return null;

  const t = e.sentAt;
  let guess: FunnelStage = 'REGISTERED';
  if (e.profile && e.profile.createdAt <= t) guess = 'PROFILE_STARTED';
  if (e.profile?.isComplete && e.profile.updatedAt <= t) guess = 'PROFILE_COMPLETE';
  if (e.redemption && e.redemption.createdAt <= t) guess = 'PAYMENT_INITIATED';
  if (e.redemption?.confirmedAt && e.redemption.confirmedAt <= t) guess = 'TRIAL';
  if (e.firstCapturedAt && e.firstCapturedAt <= t) guess = 'PAID';

  if (e.audienceStages.includes(guess)) return { stage: guess, estimated: true };
  const nearest = [...e.audienceStages].sort((a, b) => Math.abs(rank(a) - rank(guess)) - Math.abs(rank(b) - rank(guess)))[0] as string;
  return { stage: nearest, estimated: true };
}
