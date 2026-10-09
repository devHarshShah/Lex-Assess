import type { CrmActivityType, CrmCallOutcome, CrmLeadStatus, CrmPriority } from '@prisma/client';

export const CRM_STATUSES: CrmLeadStatus[] = [
  'NEW',
  'ATTEMPTED',
  'CONTACTED',
  'INTERESTED',
  'FOLLOW_UP',
  'NOT_INTERESTED',
  'DO_NOT_CONTACT',
  'INVALID_NUMBER',
];

export const CRM_STATUS_LABELS: Record<CrmLeadStatus, string> = {
  NEW: 'New',
  ATTEMPTED: 'Attempted, not reached',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  FOLLOW_UP: 'Follow-up scheduled',
  NOT_INTERESTED: 'Not interested',
  DO_NOT_CONTACT: 'Do not contact',
  INVALID_NUMBER: 'Invalid number',
};

// Leads in these statuses are done: no follow-ups, out of the work queues.
export const CLOSED_STATUSES = new Set<CrmLeadStatus>(['NOT_INTERESTED', 'DO_NOT_CONTACT', 'INVALID_NUMBER']);

export const CALL_OUTCOMES: CrmCallOutcome[] = ['CONNECTED', 'NO_ANSWER', 'BUSY', 'SWITCHED_OFF', 'WRONG_NUMBER', 'CALLBACK_REQUESTED'];

export const CALL_OUTCOME_LABELS: Record<CrmCallOutcome, string> = {
  CONNECTED: 'Connected',
  NO_ANSWER: 'No answer',
  BUSY: 'Busy',
  SWITCHED_OFF: 'Switched off / unreachable',
  WRONG_NUMBER: 'Wrong number',
  CALLBACK_REQUESTED: 'Asked to call back',
};

export const PRIORITIES: CrmPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

// Activities a superadmin logs by hand; the rest are written by the system.
export const LOGGABLE_TYPES: CrmActivityType[] = ['CALL', 'WHATSAPP', 'EMAIL', 'NOTE'];

export const CONTACT_TYPES = new Set<CrmActivityType>(['CALL', 'WHATSAPP']);

export type CrmQueue = 'due' | 'overdue' | 'new' | 'all';

export interface LeadQuery {
  queue?: string;
  status?: string;
  stage?: string;
  college?: string;
  search?: string;
  page?: string;
}

export interface LogActivityInput {
  type?: string;
  callOutcome?: string | null;
  note?: string | null;
  followUpAt?: string | null;
  durationSec?: number | null;
  // Explicit status wins over the outcome-based automatic status
  status?: string | null;
}

export interface UpdateLeadInput {
  status?: string;
  nextFollowUpAt?: string | null;
  priority?: string;
  tags?: string[];
  note?: string | null;
}

// Status a lead should move to after a contact attempt, when the admin didn't pick one.
export function autoStatus(current: CrmLeadStatus, type: CrmActivityType, outcome: CrmCallOutcome | null): CrmLeadStatus {
  if (!CONTACT_TYPES.has(type) || CLOSED_STATUSES.has(current)) return current;
  if (outcome === 'WRONG_NUMBER') return 'INVALID_NUMBER';
  if (outcome === 'CALLBACK_REQUESTED') return 'FOLLOW_UP';
  if (outcome === 'CONNECTED' || (type === 'WHATSAPP' && !outcome)) {
    return current === 'NEW' || current === 'ATTEMPTED' ? 'CONTACTED' : current;
  }
  return current === 'NEW' ? 'ATTEMPTED' : current;
}

// IST calendar-day bounds for "due today" queues
export function istDayBounds(now = new Date()) {
  const IST_OFFSET_MS = 330 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const start = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
  return { start: new Date(start), end: new Date(start + 86_400_000 - 1) };
}
