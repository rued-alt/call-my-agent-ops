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
function isoMinusDay(days: number): string {
  return new Date(OPS_ANCHOR_TODAY_MS - days * 86_400_000).toISOString()
}

// ── Customer types (used by OpsCustomersPreview) ──────────────────────

export type OpsCustomerPlan = 'trial' | 'solo' | 'team' | 'pro'

export type OpsCustomer = {
  id: string
  business: string
  ownerName: string
  plan: OpsCustomerPlan
  /** ISO date the customer signed up. */
  signedUpAt: string
  /** ISO date of their first received call (null = still in setup). */
  firstCallAt: string | null
  /** Calls handled in the trailing 7 days. */
  callsLast7d: number
  /** Calls handled in the trailing 7 days prior period (for trend arrow). */
  callsLast7dPrev: number
  /** Escalations in the trailing 7 days. */
  escalationsLast7d: number
  /** Trailing-30d quality score, 0–100. Null while we don't have enough data. */
  qualityScore: number | null
  /** Last activity (call, login, message) timestamp. */
  lastSeenAt: string
  /** Days until trial ends (null when not on trial). */
  trialDaysLeft: number | null
}

export type HealthBucket = 'healthy' | 'watch' | 'at-risk' | 'stuck' | 'trial-ending'

export function bucketFor(c: OpsCustomer): HealthBucket {
  if (!c.firstCallAt) return 'stuck'
  if (c.trialDaysLeft != null && c.trialDaysLeft <= 5) return 'trial-ending'
  if (c.qualityScore != null && c.qualityScore < 70) return 'at-risk'
  if (c.callsLast7d < 10 && c.plan !== 'trial') return 'at-risk'
  if (c.qualityScore != null && c.qualityScore < 80) return 'watch'
  return 'healthy'
}

export const BUCKET_ORDER: HealthBucket[] = [
  'at-risk',
  'stuck',
  'trial-ending',
  'watch',
  'healthy',
]

// ── Customers fixture ─────────────────────────────────────────────────
// 8 illustrative customers across all four plan tiers + various health
// states. callsLast7dPrev added for trend arrow support.

export const OPS_CUSTOMERS: OpsCustomer[] = [
  {
    id: 'cust-marco',
    business: "Marco's Plumbing",
    ownerName: 'Marco Rivera',
    plan: 'solo',
    signedUpAt: isoMinusDay(34),
    firstCallAt: isoMinusDay(33),
    callsLast7d: 41,
    callsLast7dPrev: 38,
    escalationsLast7d: 2,
    qualityScore: 87,
    lastSeenAt: isoMinusHr(2),
    trialDaysLeft: null,
  },
  {
    id: 'cust-wei',
    business: 'Wei CPA Group',
    ownerName: 'Wei Chen',
    plan: 'team',
    signedUpAt: isoMinusDay(89),
    firstCallAt: isoMinusDay(87),
    callsLast7d: 23,
    callsLast7dPrev: 21,
    escalationsLast7d: 5,
    qualityScore: 82,
    lastSeenAt: isoMinusHr(6),
    trialDaysLeft: null,
  },
  {
    id: 'cust-daniel',
    business: "Daniel's Trattoria",
    ownerName: 'Daniel Romano',
    plan: 'solo',
    signedUpAt: isoMinusDay(12),
    firstCallAt: isoMinusDay(11),
    callsLast7d: 67,
    callsLast7dPrev: 60,
    escalationsLast7d: 1,
    qualityScore: 91,
    lastSeenAt: isoMinusMin(45),
    trialDaysLeft: null,
  },
  {
    id: 'cust-jasmine',
    business: 'Jasmine Esthetics',
    ownerName: 'Jasmine Park',
    plan: 'trial',
    signedUpAt: isoMinusDay(4),
    firstCallAt: isoMinusDay(3),
    callsLast7d: 14,
    callsLast7dPrev: 8,
    escalationsLast7d: 4,
    qualityScore: 71,
    lastSeenAt: isoMinusHr(18),
    trialDaysLeft: 26,
  },
  {
    id: 'cust-arnav',
    business: 'Arnav Auto Body',
    ownerName: 'Arnav Patel',
    plan: 'trial',
    signedUpAt: isoMinusDay(2),
    firstCallAt: null, // stuck in setup
    callsLast7d: 0,
    callsLast7dPrev: 0,
    escalationsLast7d: 0,
    qualityScore: null,
    lastSeenAt: isoMinusHr(40),
    trialDaysLeft: 28,
  },
  {
    id: 'cust-sandra',
    business: 'Sandra Insurance',
    ownerName: 'Sandra Vega',
    plan: 'pro',
    signedUpAt: isoMinusDay(140),
    firstCallAt: isoMinusDay(138),
    callsLast7d: 88,
    callsLast7dPrev: 91,
    escalationsLast7d: 12,
    qualityScore: 79,
    lastSeenAt: isoMinusHr(1),
    trialDaysLeft: null,
  },
  {
    id: 'cust-tyler',
    business: 'Tyler HVAC',
    ownerName: 'Tyler Brooks',
    plan: 'solo',
    signedUpAt: isoMinusDay(60),
    firstCallAt: isoMinusDay(58),
    callsLast7d: 4, // sharply down — churn risk
    callsLast7dPrev: 16,
    escalationsLast7d: 0,
    qualityScore: 68, // also declining
    lastSeenAt: isoMinusDay(5),
    trialDaysLeft: null,
  },
  {
    id: 'cust-rosa',
    business: 'Rosa Family Dental',
    ownerName: 'Rosa Aguilar',
    plan: 'team',
    signedUpAt: isoMinusDay(220),
    firstCallAt: isoMinusDay(218),
    callsLast7d: 52,
    callsLast7dPrev: 49,
    escalationsLast7d: 3,
    qualityScore: 90,
    lastSeenAt: isoMinusHr(3),
    trialDaysLeft: null,
  },
]

// ── Customer calls (used by OpsCustomersPreview drawer) ───────────────
// Subset of OPS_CALLS used to render 30-day call history per customer.
// Separate from OpsCallRecord to keep types minimal for the customers surface.
export type OpsCustomerCall = {
  id: string
  customerId: string
  startedAt: string
  outcomeClass: string
  autonomy: string
  autoQuality: number | null
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

// ── Call record types (used by OpsSecurity + OpsEvalQueue) ──────────────
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

export type OpsOutcomeClass =
  | 'booking'
  | 'info-request'
  | 'complaint'
  | 'transfer-needed'
  | 'no-business'
  | 'spam'

export type OpsAutonomy =
  | 'autonomous' // agent handled it alone
  | 'escalated' // agent surfaced; owner took the call
  | 'corrected' // owner edited a captured entity after the call
  | 'takeover' // owner joined mid-call

export type OpsCallRecord = {
  id: string
  customerId: string
  customerBusiness: string
  callerName: string | null
  callerPhone: string
  startedAt: string
  durationSec: number
  outcomeClass: OpsOutcomeClass
  autonomy: OpsAutonomy
  /** Average AI confidence across agent's turns, 0–1. */
  agentConfidenceAvg: number
  /** Lowest single-turn confidence. */
  agentConfidenceLow: number
  /** Auto-scored quality, 0–100. Null until the nightly scorer runs. */
  autoQuality: number | null
  /** Human rubric rating. Null when unrated. */
  humanRating: {
    understood: 'yes' | 'partial' | 'no'
    answered: 'yes' | 'no' | 'na'
    tone: 'yes' | 'no'
    approved: 'yes' | 'no'
  } | null
  /** Caller called back within 24h with the same intent. */
  retried24h: boolean
  ownerCorrected: boolean
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
}

// ── Eval queue types ──────────────────────────────────────────────────────
export type OpsEvalQueueItem = {
  callId: string
  /** Why this call surfaced. Free-form short string. */
  reason: string
  /** Priority bucket — drives the badge color. */
  priority: 'urgent' | 'flagged' | 'sample'
}

// ── OPS_CALLS — calls referenced by the eval queue ───────────────────────
export const OPS_CALLS: OpsCallRecord[] = [
  {
    id: 'call-002',
    customerId: 'cust-jasmine',
    customerBusiness: 'Jasmine Esthetics',
    callerName: null,
    callerPhone: '(602) 555-0188',
    startedAt: isoMinusMin(34),
    durationSec: 213,
    outcomeClass: 'info-request',
    autonomy: 'escalated',
    agentConfidenceAvg: 0.58,
    agentConfidenceLow: 0.31,
    autoQuality: 64,
    humanRating: null,
    retried24h: false,
    ownerCorrected: false,
    transcriptSnippet:
      "Caller: I want to know if the Brazilian wax includes touch-up… — Agent: Let me get Jasmine on the line, she can answer that.",
  },
  {
    id: 'call-004',
    customerId: 'cust-sandra',
    customerBusiness: 'Sandra Insurance',
    callerName: 'Brenda Park',
    callerPhone: '(602) 555-0177',
    startedAt: isoMinusHr(2),
    durationSec: 410,
    outcomeClass: 'complaint',
    autonomy: 'escalated',
    agentConfidenceAvg: 0.71,
    agentConfidenceLow: 0.42,
    autoQuality: 73,
    humanRating: null,
    retried24h: true,
    ownerCorrected: true,
    transcriptSnippet:
      "Caller: My claim has been pending for three weeks — Agent: I hear you. Let me get Sandra on now.",
    transcriptTurns: [
      {
        i: 0,
        speaker: 'agent',
        atSec: 0,
        text: 'Sandra Insurance, this is the assistant.',
        confidence: 0.94,
      },
      {
        i: 1,
        speaker: 'caller',
        atSec: 3,
        text: 'My claim has been pending for three weeks. I need to talk to Sandra.',
      },
      {
        i: 2,
        speaker: 'agent',
        atSec: 8,
        text: 'I hear you. Can I get your claim number to check the status?',
        confidence: 0.78,
      },
      {
        i: 3,
        speaker: 'caller',
        atSec: 14,
        text: 'No. I want Sandra. I have been pushed around enough.',
      },
      {
        i: 4,
        speaker: 'agent',
        atSec: 19,
        text: 'Understood. Let me get Sandra on now — one moment please.',
        confidence: 0.42,
      },
      {
        i: 5,
        speaker: 'owner',
        atSec: 38,
        text: 'Hi, this is Sandra. I am so sorry for the delay. Tell me what happened.',
      },
    ],
    latency: { pickupMs: 280, firstResponseMs: 940, endMs: 410_000 },
    recentViewerIds: ['staff-amrou', 'staff-cara', 'staff-amrou'],
    ownerCorrection: { field: 'Outcome class', before: 'info-request', after: 'complaint' },
  },
  {
    id: 'call-006',
    customerId: 'cust-daniel',
    customerBusiness: "Daniel's Trattoria",
    callerName: null,
    callerPhone: '(602) 555-0119',
    startedAt: isoMinusHr(5),
    durationSec: 22,
    outcomeClass: 'spam',
    autonomy: 'autonomous',
    agentConfidenceAvg: 0.96,
    agentConfidenceLow: 0.91,
    autoQuality: 92,
    humanRating: null,
    retried24h: false,
    ownerCorrected: false,
    transcriptSnippet:
      "Caller: Hi, this is regarding your auto warranty — Agent: I'm going to end the call now.",
  },
  {
    id: 'call-007',
    customerId: 'cust-wei',
    customerBusiness: 'Wei CPA Group',
    callerName: 'Howard Liu',
    callerPhone: '(602) 555-0162',
    startedAt: isoMinusHr(6),
    durationSec: 268,
    outcomeClass: 'info-request',
    autonomy: 'autonomous',
    agentConfidenceAvg: 0.84,
    agentConfidenceLow: 0.67,
    autoQuality: 86,
    humanRating: null,
    retried24h: false,
    ownerCorrected: true,
    transcriptSnippet:
      "Caller: Do you handle quarterly estimated taxes for small businesses? — Agent: Yes. The base package starts at $1,200 a quarter…",
  },
  {
    id: 'call-008',
    customerId: 'cust-marco',
    customerBusiness: "Marco's Plumbing",
    callerName: 'Pacific Plumbing',
    callerPhone: '(602) 555-0125',
    startedAt: isoMinusHr(8),
    durationSec: 332,
    outcomeClass: 'info-request',
    autonomy: 'takeover',
    agentConfidenceAvg: 0.62,
    agentConfidenceLow: 0.28,
    autoQuality: 58,
    humanRating: null,
    retried24h: true,
    ownerCorrected: true,
    transcriptSnippet:
      "Caller: Overnight on the parts order is +$42 — Agent: I'd need to check with Marco. — Marco joins: I've got it, hi Brenda.",
    transcriptTurns: [
      {
        i: 0,
        speaker: 'agent',
        atSec: 0,
        text: "Marco's Plumbing, this is the assistant.",
        confidence: 0.95,
      },
      {
        i: 1,
        speaker: 'caller',
        atSec: 3,
        text: 'Hi, Brenda from Pacific Plumbing. Quick question on the order from Tuesday.',
      },
      {
        i: 2,
        speaker: 'agent',
        atSec: 9,
        text: 'Sure, I can help with that. What is the question?',
        confidence: 0.81,
      },
      {
        i: 3,
        speaker: 'caller',
        atSec: 14,
        text: 'Overnight shipping on those valves is going to be plus forty-two dollars. Do you want to approve?',
      },
      {
        i: 4,
        speaker: 'agent',
        atSec: 22,
        text: 'Let me check with Marco on that — that is above what I can approve. Hold one moment.',
        confidence: 0.28,
      },
      {
        i: 5,
        speaker: 'owner',
        atSec: 65,
        text: 'Hey Brenda, Marco here. Yes, overnight is fine — push it through.',
      },
      {
        i: 6,
        speaker: 'caller',
        atSec: 71,
        text: 'Got it. We will get it on the morning truck.',
      },
    ],
    latency: { pickupMs: 410, firstResponseMs: 1340, endMs: 332_000 },
    recentViewerIds: ['staff-amrou', 'staff-amrou', 'staff-cara'],
    ownerCorrection: {
      field: 'Captured commitment',
      before: '(none — agent missed it)',
      after: 'Approve overnight at +$42',
    },
  },
  {
    id: 'call-009',
    customerId: 'cust-sandra',
    customerBusiness: 'Sandra Insurance',
    callerName: 'Marisa Cole',
    callerPhone: '(602) 555-0190',
    startedAt: isoMinusHr(20),
    durationSec: 156,
    outcomeClass: 'info-request',
    autonomy: 'autonomous',
    agentConfidenceAvg: 0.81,
    agentConfidenceLow: 0.6,
    autoQuality: 79,
    humanRating: null,
    retried24h: false,
    ownerCorrected: false,
    transcriptSnippet:
      "Caller: Hi, what's your earthquake-rider rate? — Agent: For home policies the rider starts at $18 a month…",
  },
  {
    id: 'call-011',
    customerId: 'cust-tyler',
    customerBusiness: 'Tyler HVAC',
    callerName: null,
    callerPhone: '(602) 555-0179',
    startedAt: isoMinusDay(2),
    durationSec: 412,
    outcomeClass: 'complaint',
    autonomy: 'escalated',
    agentConfidenceAvg: 0.55,
    agentConfidenceLow: 0.22,
    autoQuality: 47,
    humanRating: null,
    retried24h: true,
    ownerCorrected: true,
    transcriptSnippet:
      "Caller: My unit is still broken three weeks later — Agent: I want to make sure I have this right…",
    transcriptTurns: [
      {
        i: 0,
        speaker: 'agent',
        atSec: 0,
        text: 'Tyler HVAC, this is the assistant.',
        confidence: 0.93,
      },
      {
        i: 1,
        speaker: 'caller',
        atSec: 4,
        text: 'You guys came out three weeks ago and my unit is still broken. I want a refund.',
      },
      {
        i: 2,
        speaker: 'agent',
        atSec: 12,
        text: 'I want to make sure I have this right. Can you tell me what is happening with the unit now?',
        confidence: 0.51,
      },
      {
        i: 3,
        speaker: 'caller',
        atSec: 19,
        text: 'It is not cooling. Same as before. You charged me eight hundred dollars.',
      },
      {
        i: 4,
        speaker: 'agent',
        atSec: 28,
        text: 'I am sorry. Refund decisions are outside what I can do — Tyler will need to look at that.',
        confidence: 0.22,
      },
      {
        i: 5,
        speaker: 'caller',
        atSec: 35,
        text: 'So when is Tyler going to call me?',
      },
      {
        i: 6,
        speaker: 'agent',
        atSec: 42,
        text: 'I will make sure he gets in touch today.',
        confidence: 0.35,
      },
    ],
    latency: { pickupMs: 530, firstResponseMs: 1820, endMs: 412_000 },
    recentViewerIds: ['staff-amrou', 'staff-cara', 'staff-amrou', 'staff-cara'],
    ownerCorrection: {
      field: 'Followed up?',
      before: '(no follow-up recorded)',
      after: 'Tyler called Anita 2 days later',
    },
  },
  // Records added for the Calls surface (call-001, 003, 005, 010, 012)
  {
    id: 'call-001',
    customerId: 'cust-daniel',
    customerBusiness: "Daniel's Trattoria",
    callerName: 'Linda Park',
    callerPhone: '(602) 555-0140',
    startedAt: isoMinusMin(8),
    durationSec: 142,
    outcomeClass: 'booking',
    autonomy: 'autonomous',
    agentConfidenceAvg: 0.92,
    agentConfidenceLow: 0.81,
    autoQuality: 94,
    humanRating: null,
    retried24h: false,
    ownerCorrected: false,
    transcriptSnippet:
      "Caller: Hi, can I get a table for four tonight at 7? — Agent: Yes, we have a 7 PM open. Can I take a name and number for the booking?",
  },
  {
    id: 'call-003',
    customerId: 'cust-marco',
    customerBusiness: "Marco's Plumbing",
    callerName: 'Karen Liu',
    callerPhone: '(602) 555-0144',
    startedAt: isoMinusMin(72),
    durationSec: 188,
    outcomeClass: 'booking',
    autonomy: 'autonomous',
    agentConfidenceAvg: 0.89,
    agentConfidenceLow: 0.74,
    autoQuality: 91,
    humanRating: {
      understood: 'yes',
      answered: 'yes',
      tone: 'yes',
      approved: 'yes',
    },
    retried24h: false,
    ownerCorrected: false,
    transcriptSnippet:
      "Caller: My water heater is leaking — Agent: Got it. Marco can be there tomorrow at 10 AM or Thursday at 8 AM. Which works?",
    transcriptTurns: [
      { i: 0, speaker: 'agent', atSec: 0, text: "Marco's Plumbing, this is the assistant. How can I help?", confidence: 0.95 },
      { i: 1, speaker: 'caller', atSec: 4, text: 'My water heater started leaking last night. It is bad.' },
      { i: 2, speaker: 'agent', atSec: 9, text: 'I am sorry to hear that. Is it actively leaking right now?', confidence: 0.93 },
      { i: 3, speaker: 'caller', atSec: 14, text: 'Yes — there is water on the floor in the garage.' },
      { i: 4, speaker: 'agent', atSec: 19, text: 'Got it. Marco can be there tomorrow at 10 AM or Thursday at 8 AM. Which works?', confidence: 0.89 },
      { i: 5, speaker: 'caller', atSec: 25, text: 'Tomorrow at 10. Address is 412 W Maple.' },
      { i: 6, speaker: 'agent', atSec: 32, text: 'Booked. You are Karen Liu at 412 W Maple, tomorrow 10 AM. He will text on the way.', confidence: 0.74 },
    ],
    latency: { pickupMs: 320, firstResponseMs: 1180, endMs: 188_000 },
    recentViewerIds: ['staff-amrou', 'staff-cara'],
  },
  {
    id: 'call-005',
    customerId: 'cust-rosa',
    customerBusiness: 'Rosa Family Dental',
    callerName: 'Diego Rivera',
    callerPhone: '(602) 555-0151',
    startedAt: isoMinusHr(3),
    durationSec: 98,
    outcomeClass: 'booking',
    autonomy: 'autonomous',
    agentConfidenceAvg: 0.94,
    agentConfidenceLow: 0.88,
    autoQuality: 96,
    humanRating: null,
    retried24h: false,
    ownerCorrected: false,
    transcriptSnippet:
      "Caller: Need a cleaning next week — Agent: I can book you Wednesday at 2 PM with Dr. Aguilar.",
  },
  {
    id: 'call-010',
    customerId: 'cust-jasmine',
    customerBusiness: 'Jasmine Esthetics',
    callerName: 'Aria Smith',
    callerPhone: '(602) 555-0102',
    startedAt: isoMinusDay(1),
    durationSec: 84,
    outcomeClass: 'no-business',
    autonomy: 'autonomous',
    agentConfidenceAvg: 0.88,
    agentConfidenceLow: 0.71,
    autoQuality: 88,
    humanRating: null,
    retried24h: false,
    ownerCorrected: false,
    transcriptSnippet:
      "Caller: Are you open on Sundays? — Agent: No, we're closed Sundays. Would Saturday at 11 work?",
  },
  {
    id: 'call-012',
    customerId: 'cust-rosa',
    customerBusiness: 'Rosa Family Dental',
    callerName: 'Anita Park',
    callerPhone: '(602) 555-0133',
    startedAt: isoMinusDay(3),
    durationSec: 124,
    outcomeClass: 'booking',
    autonomy: 'corrected',
    agentConfidenceAvg: 0.86,
    agentConfidenceLow: 0.69,
    autoQuality: 84,
    humanRating: null,
    retried24h: false,
    ownerCorrected: true,
    transcriptSnippet:
      "Caller: Looking for a cleaning Friday — Agent: Friday at 1 PM with Dr. Aguilar works. (Owner edit: corrected to 2 PM)",
  },
]

// ── Eval queue — daily rating ritual ─────────────────────────────────────
// Priority order: highest-priority first.
export const OPS_EVAL_QUEUE: OpsEvalQueueItem[] = [
  {
    callId: 'call-011',
    reason: 'Caller retried · owner corrected · quality 47',
    priority: 'urgent',
  },
  {
    callId: 'call-008',
    reason: 'Owner takeover · caller retried · low confidence',
    priority: 'urgent',
  },
  {
    callId: 'call-004',
    reason: 'Escalated · caller retried · owner corrected',
    priority: 'urgent',
  },
  { callId: 'call-002', reason: 'Escalated · confidence 0.58', priority: 'flagged' },
  { callId: 'call-007', reason: 'Owner corrected post-call', priority: 'flagged' },
  { callId: 'call-009', reason: 'Random sample', priority: 'sample' },
  { callId: 'call-006', reason: 'Random sample', priority: 'sample' },
]

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

export const OPS_CUSTOMER_CALLS: OpsCustomerCall[] = [
  { id: 'call-001', customerId: 'cust-daniel', startedAt: isoMinusMin(8), outcomeClass: 'booking', autonomy: 'autonomous', autoQuality: 94 },
  { id: 'call-002', customerId: 'cust-jasmine', startedAt: isoMinusMin(34), outcomeClass: 'info-request', autonomy: 'escalated', autoQuality: 64 },
  { id: 'call-003', customerId: 'cust-marco', startedAt: isoMinusMin(72), outcomeClass: 'booking', autonomy: 'autonomous', autoQuality: 91 },
  { id: 'call-004', customerId: 'cust-sandra', startedAt: isoMinusHr(2), outcomeClass: 'complaint', autonomy: 'escalated', autoQuality: 73 },
  { id: 'call-005', customerId: 'cust-rosa', startedAt: isoMinusHr(3), outcomeClass: 'booking', autonomy: 'autonomous', autoQuality: 96 },
  { id: 'call-006', customerId: 'cust-daniel', startedAt: isoMinusHr(5), outcomeClass: 'spam', autonomy: 'autonomous', autoQuality: 92 },
  { id: 'call-007', customerId: 'cust-wei', startedAt: isoMinusHr(6), outcomeClass: 'info-request', autonomy: 'autonomous', autoQuality: 86 },
  { id: 'call-008', customerId: 'cust-marco', startedAt: isoMinusHr(8), outcomeClass: 'info-request', autonomy: 'takeover', autoQuality: 58 },
  { id: 'call-009', customerId: 'cust-sandra', startedAt: isoMinusHr(20), outcomeClass: 'info-request', autonomy: 'autonomous', autoQuality: 79 },
  { id: 'call-010', customerId: 'cust-jasmine', startedAt: isoMinusDay(1), outcomeClass: 'no-business', autonomy: 'autonomous', autoQuality: 88 },
  { id: 'call-011', customerId: 'cust-tyler', startedAt: isoMinusDay(2), outcomeClass: 'complaint', autonomy: 'escalated', autoQuality: 47 },
  { id: 'call-012', customerId: 'cust-rosa', startedAt: isoMinusDay(3), outcomeClass: 'booking', autonomy: 'corrected', autoQuality: 84 },
]

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

// ── Costs — per-customer 30-day unit economics ─────────────────────────
// TODO(backend-wireup): replace with GET /admin/ops/costs -> OpsCostRow[]

export type OpsCostRow = {
  customerId: string
  customerBusiness: string
  callsLast30d: number
  /** Dollar cost of LLM tokens + STT + TTS + telephony, trailing 30d. */
  costLast30d: number
  /** Dollar revenue from the customer, trailing 30d. */
  revenueLast30d: number
  /** Margin in dollars (revenue − cost). */
  marginLast30d: number
  /** Cost per call in dollars. */
  costPerCall: number
  /** Optional cost breakdown by provider category (dollars). */
  breakdown?: {
    llmCost: number
    sttCost: number
    ttsCost: number
    telephonyCost: number
  }
}

export const OPS_COSTS: OpsCostRow[] = [
  {
    customerId: 'cust-daniel',
    customerBusiness: "Daniel's Trattoria",
    callsLast30d: 312,
    costLast30d: 71.4,
    revenueLast30d: 49,
    marginLast30d: -22.4,
    costPerCall: 0.229,
    breakdown: { llmCost: 42.8, sttCost: 14.3, ttsCost: 9.7, telephonyCost: 4.6 },
  },
  {
    customerId: 'cust-marco',
    customerBusiness: "Marco's Plumbing",
    callsLast30d: 184,
    costLast30d: 41.8,
    revenueLast30d: 49,
    marginLast30d: 7.2,
    costPerCall: 0.227,
    breakdown: { llmCost: 25.1, sttCost: 8.4, ttsCost: 5.7, telephonyCost: 2.6 },
  },
  {
    customerId: 'cust-sandra',
    customerBusiness: 'Sandra Insurance',
    callsLast30d: 364,
    costLast30d: 102.1,
    revenueLast30d: 199,
    marginLast30d: 96.9,
    costPerCall: 0.281,
    breakdown: { llmCost: 61.3, sttCost: 20.4, ttsCost: 13.8, telephonyCost: 6.6 },
  },
  {
    customerId: 'cust-wei',
    customerBusiness: 'Wei CPA Group',
    callsLast30d: 96,
    costLast30d: 28.7,
    revenueLast30d: 99,
    marginLast30d: 70.3,
    costPerCall: 0.299,
    breakdown: { llmCost: 17.2, sttCost: 5.7, ttsCost: 3.9, telephonyCost: 1.9 },
  },
  {
    customerId: 'cust-rosa',
    customerBusiness: 'Rosa Family Dental',
    callsLast30d: 224,
    costLast30d: 56.0,
    revenueLast30d: 99,
    marginLast30d: 43.0,
    costPerCall: 0.250,
    breakdown: { llmCost: 33.6, sttCost: 11.2, ttsCost: 7.6, telephonyCost: 3.6 },
  },
  {
    customerId: 'cust-jasmine',
    customerBusiness: 'Jasmine Esthetics',
    callsLast30d: 56,
    costLast30d: 18.4,
    revenueLast30d: 0,
    marginLast30d: -18.4,
    costPerCall: 0.329,
    breakdown: { llmCost: 11.0, sttCost: 3.7, ttsCost: 2.5, telephonyCost: 1.2 },
  },
  {
    customerId: 'cust-tyler',
    customerBusiness: 'Tyler HVAC',
    callsLast30d: 28,
    costLast30d: 7.4,
    revenueLast30d: 49,
    marginLast30d: 41.6,
    costPerCall: 0.264,
    breakdown: { llmCost: 4.4, sttCost: 1.5, ttsCost: 1.0, telephonyCost: 0.5 },
  },
  {
    customerId: 'cust-arnav',
    customerBusiness: 'Arnav Auto Body',
    callsLast30d: 0,
    costLast30d: 0,
    revenueLast30d: 0,
    marginLast30d: 0,
    costPerCall: 0,
    breakdown: { llmCost: 0, sttCost: 0, ttsCost: 0, telephonyCost: 0 },
  },
]
