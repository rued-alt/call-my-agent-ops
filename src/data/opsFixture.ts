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
