export const DEFAULT_INTERVIEW_MS = 60 * 60 * 1000;

// endTime is nullable: rows created before it existed (or by an older deploy) count as one hour.
export function interviewEnd(ci: { scheduledAt: Date; endTime: Date | null }): Date {
  return ci.endTime ?? new Date(ci.scheduledAt.getTime() + DEFAULT_INTERVIEW_MS);
}
