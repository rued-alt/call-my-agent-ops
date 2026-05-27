// Ops monitor fixture data — ported from brand-studio
// src/data/opsMonitorFixture.ts. Includes the types + fixture values
// needed by OpsChrome (audit log) and OpsSecurity (call records,
// transcript turns). Non-ops surfaces (Pulse rollups, Mission Control
// extras) are omitted here — add them when those surfaces land.

// ── Anchor ────────────────────────────────────────────────────────────
const OPS_ANCHOR_TODAY_ISO = '2026-05-26T18:00:00-07:00'
const OPS_ANCHOR_TODAY_MS = new Date(OPS_ANCHOR_TODAY_ISO).getTime()

function isoMinusMin(mins: number): string {
  return new Date(OPS_ANCHOR_TODAY_MS - mins * 60_000).toISOString()
}
function isoMinusHr(hrs: number): string {
  return new Date(OPS_ANCHOR_TODAY_MS - hrs * 3_600_000).toISOString()
}

// ── Audit log types ───────────────────────────────────────────────────
export type OpsAuditAction =
  | 'view-call'
  | 'reveal-pii'
  | 'rate-call'
  | 'view-customer'
  | 'view-cost'
  | 'dismiss-alert'
  | 'change-plan'
  | 'export'
  | 'login'

export type OpsAuditEntry = {
  id: string
  at: string
  staffId: string
  staffName: string
  staffRole: 'owner' | 'ops' | 'on-call' | 'read-only'
  action: OpsAuditAction
  /** What was acted on (call id, customer id, etc.). */
  target: string
  /** Free-text context. For 'reveal-pii' this is the user-supplied reason. */
  reason?: string
}

export const OPS_AUDIT_LOG: OpsAuditEntry[] = [
  {
    id: 'audit-001',
    at: isoMinusMin(4),
    staffId: 'staff-amrou',
    staffName: 'Amrou Manaseer',
    staffRole: 'owner',
    action: 'view-call',
    target: 'call-001',
  },
  {
    id: 'audit-002',
    at: isoMinusMin(7),
    staffId: 'staff-amrou',
    staffName: 'Amrou Manaseer',
    staffRole: 'owner',
    action: 'reveal-pii',
    target: 'call-008',
    reason: 'Investigating Tyler HVAC churn — repeated escalations',
  },
  {
    id: 'audit-003',
    at: isoMinusMin(12),
    staffId: 'staff-amrou',
    staffName: 'Amrou Manaseer',
    staffRole: 'owner',
    action: 'view-customer',
    target: 'cust-tyler',
  },
  {
    id: 'audit-004',
    at: isoMinusMin(28),
    staffId: 'staff-cara',
    staffName: 'Cara Reyes',
    staffRole: 'ops',
    action: 'rate-call',
    target: 'call-003',
  },
  {
    id: 'audit-005',
    at: isoMinusMin(31),
    staffId: 'staff-cara',
    staffName: 'Cara Reyes',
    staffRole: 'ops',
    action: 'view-call',
    target: 'call-008',
  },
  {
    id: 'audit-006',
    at: isoMinusHr(2),
    staffId: 'staff-cara',
    staffName: 'Cara Reyes',
    staffRole: 'ops',
    action: 'dismiss-alert',
    target: 'alert-stale-x',
    reason: 'Resolved upstream — see #ops-incidents',
  },
  {
    id: 'audit-007',
    at: isoMinusHr(3),
    staffId: 'staff-amrou',
    staffName: 'Amrou Manaseer',
    staffRole: 'owner',
    action: 'login',
    target: 'session-new',
  },
]

// ── Call record types (used by OpsSecurity) ───────────────────────────
export type OpsTranscriptTurn = {
  /** Index — 0-based, monotonic. */
  i: number
  speaker: 'caller' | 'agent' | 'owner'
  /** Seconds from call-start. */
  atSec: number
  text: string
  /** AI confidence for this turn (agent turns only). */
  confidence?: number
}

export type OpsCallRecord = {
  id: string
  customerId: string
  customerBusiness: string
  callerName: string | null
  callerPhone: string
  startedAt: string
  durationSec: number
  transcriptSnippet: string
  transcriptTurns?: OpsTranscriptTurn[]
  latency?: {
    pickupMs: number
    firstResponseMs: number
    endMs: number
  }
  recentViewerIds?: string[]
  ownerCorrection?: {
    field: string
    before: string
    after: string
  }
  ownerCorrected: boolean
}

// ── Pulse types + fixtures (ported from brand-studio opsMonitorFixture) ─

export type OpsAlertSeverity = 'info' | 'warn' | 'urgent'

export type OpsAlert = {
  id: string
  severity: OpsAlertSeverity
  /** Headline, <= 80 chars. */
  title: string
  /** What changed + the single best action. */
  body: string
  /** ISO timestamp. */
  raisedAt: string
  /** Resolved? */
  resolved: boolean
}

export type OpsPulseRollup = {
  liveCalls: number
  todayCalls: number
  todayEscalations: number
  todayBookings: number
  todayQualityAvg: number
  todayRevenueDollars: number
  /** Trailing 7 days, daily values (oldest -> newest). */
  calls7d: number[]
  quality7d: number[]
  escalations7d: number[]
  revenue7d: number[]
  newCustomers7d: number[]
}

export type OpsSinceLastVisit = {
  lastVisitAt: string
  newCalls: number
  newAlerts: number
  newRatings: number
}

export const OPS_SINCE_LAST_VISIT: OpsSinceLastVisit = {
  lastVisitAt: isoMinusHr(14),
  newCalls: 43,
  newAlerts: 2,
  newRatings: 6,
}

export const OPS_PULSE: OpsPulseRollup = {
  liveCalls: 3,
  todayCalls: 188,
  todayEscalations: 11,
  todayBookings: 64,
  todayQualityAvg: 85,
  todayRevenueDollars: 412,
  calls7d: [142, 161, 178, 154, 188, 201, 188],
  quality7d: [82, 83, 81, 84, 85, 87, 85],
  escalations7d: [9, 14, 12, 7, 11, 8, 11],
  revenue7d: [318, 342, 397, 369, 412, 441, 412],
  newCustomers7d: [1, 0, 2, 1, 1, 1, 1],
}

export const OPS_ALERTS: OpsAlert[] = [
  {
    id: 'alert-tyler-churn',
    severity: 'warn',
    title: 'Tyler HVAC — usage down 70%',
    body: '4 calls in the trailing 7 days vs. 16 the prior week. Last login 5 days ago. Consider a check-in.',
    raisedAt: isoMinusHr(4),
    resolved: false,
  },
  {
    id: 'alert-arnav-setup',
    severity: 'info',
    title: 'Arnav Auto Body — stuck in setup',
    body: 'Signed up 2 days ago, never received a call. Forwarding likely not configured.',
    raisedAt: isoMinusHr(36),
    resolved: false,
  },
  {
    id: 'alert-stt-latency',
    severity: 'urgent',
    title: 'Whisper latency p95 > 2.4s',
    body: 'p95 STT latency has been above the 2s SLO for the last 18 minutes. OpenAI status page shows no incident yet.',
    raisedAt: isoMinusMin(18),
    resolved: false,
  },
]
