import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  OpsRevealReasonModal,
  OpsRevealButton,
  OpsTranscriptView,
  OpsLatencyTimeline,
  OpsMultiViewerStrip,
  OpsOwnerCorrectionDiff,
  OpsAuditTail,
  canRevealPII,
  IfCanReveal,
} from './OpsSecurity'
import { TOKENS } from '../../lib/brand'
import type { OpsCallRecord } from '../../data/opsFixture'
import type { OpsRole, OpsStaff } from '../chrome/OpsChrome'

const t = TOKENS

// ── canRevealPII ─────────────────────────────────────────────────────────
describe('canRevealPII', () => {
  it('allows owner', () => expect(canRevealPII('owner')).toBe(true))
  it('allows ops', () => expect(canRevealPII('ops')).toBe(true))
  it('allows on-call', () => expect(canRevealPII('on-call')).toBe(true))
  it('blocks read-only', () => expect(canRevealPII('read-only')).toBe(false))
})

// ── OpsRevealReasonModal ─────────────────────────────────────────────────
describe('OpsRevealReasonModal', () => {
  const baseProps = {
    t,
    open: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    targetLabel: "Karen's transcript",
  }

  it('renders when open=true', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    expect(document.querySelector('[data-region="ops-reveal-reason-modal"]')).toBeTruthy()
  })

  it('does not render when open=false', () => {
    render(<OpsRevealReasonModal {...baseProps} open={false} />)
    expect(document.querySelector('[data-region="ops-reveal-reason-modal"]')).toBeNull()
  })

  it('shows target label in heading', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    expect(screen.getByText(/Karen's transcript/)).toBeInTheDocument()
  })

  it('confirm button is disabled when reason is empty', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
  })

  it('confirm button is disabled when reason is < 12 chars', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    const input = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'too short' } }) // 9 chars
    const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
  })

  it('shows char count indicator when < 12 chars typed', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    const input = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'short' } }) // 5 chars
    expect(screen.getByText('5 / 12 chars minimum')).toBeInTheDocument()
  })

  it('shows "OK" when >= 12 chars typed', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    const input = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'long enough reason here' } })
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('confirm button is enabled when reason >= 12 chars', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    const input = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'enough to pass' } })
    const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(false)
  })

  it('calls onConfirm with reason when confirmed', () => {
    const onConfirm = vi.fn()
    render(<OpsRevealReasonModal {...baseProps} onConfirm={onConfirm} />)
    const input = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLTextAreaElement
    const validReason = 'Investigating Tyler HVAC churn'
    fireEvent.change(input, { target: { value: validReason } })
    const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledWith(validReason)
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(<OpsRevealReasonModal {...baseProps} onCancel={onCancel} />)
    const cancelBtn = document.querySelector('[data-region="ops-reveal-reason-cancel"]') as HTMLButtonElement
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    render(<OpsRevealReasonModal {...baseProps} onCancel={onCancel} />)
    const backdrop = document.querySelector('[data-region="ops-reveal-reason-backdrop"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalled()
  })

  it('enforces exactly 12 char minimum (11 chars = blocked)', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    const input = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '11 chars ok' } }) // exactly 11
    expect(screen.getByText('11 / 12 chars minimum')).toBeInTheDocument()
    const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
  })

  it('allows exactly 12 chars', () => {
    render(<OpsRevealReasonModal {...baseProps} />)
    const input = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '12 chars ok!' } }) // exactly 12
    expect(screen.getByText('OK')).toBeInTheDocument()
    const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(false)
  })
})

// ── OpsRevealButton ──────────────────────────────────────────────────────
describe('OpsRevealButton', () => {
  it('renders trigger button for owner role', () => {
    render(<OpsRevealButton t={t} role="owner" onClick={vi.fn()} />)
    expect(document.querySelector('[data-region="ops-reveal-trigger"]')).toBeTruthy()
  })

  it('renders trigger button for ops role', () => {
    render(<OpsRevealButton t={t} role="ops" onClick={vi.fn()} />)
    expect(document.querySelector('[data-region="ops-reveal-trigger"]')).toBeTruthy()
  })

  it('renders trigger button for on-call role', () => {
    render(<OpsRevealButton t={t} role="on-call" onClick={vi.fn()} />)
    expect(document.querySelector('[data-region="ops-reveal-trigger"]')).toBeTruthy()
  })

  it('renders blocked state for read-only role', () => {
    render(<OpsRevealButton t={t} role="read-only" onClick={vi.fn()} />)
    expect(document.querySelector('[data-region="ops-reveal-blocked"]')).toBeTruthy()
    expect(document.querySelector('[data-region="ops-reveal-trigger"]')).toBeNull()
  })

  it('shows default label', () => {
    render(<OpsRevealButton t={t} role="owner" onClick={vi.fn()} />)
    expect(screen.getByText('Reveal PII (logged)')).toBeInTheDocument()
  })

  it('shows custom label', () => {
    render(<OpsRevealButton t={t} role="owner" onClick={vi.fn()} label="Show transcript" />)
    expect(screen.getByText('Show transcript')).toBeInTheDocument()
  })

  it('calls onClick when trigger clicked', () => {
    const onClick = vi.fn()
    render(<OpsRevealButton t={t} role="owner" onClick={onClick} />)
    fireEvent.click(document.querySelector('[data-region="ops-reveal-trigger"]') as HTMLElement)
    expect(onClick).toHaveBeenCalled()
  })
})

// ── OpsTranscriptView ────────────────────────────────────────────────────
const mockCall: OpsCallRecord = {
  id: 'call-001',
  customerId: 'cust-1',
  customerBusiness: 'Test Biz',
  callerName: 'Alice',
  callerPhone: '(602) 555-0001',
  startedAt: '2026-05-26T10:00:00Z',
  durationSec: 120,
  outcomeClass: 'booking',
  autonomy: 'autonomous',
  agentConfidenceAvg: 0.92,
  agentConfidenceLow: 0.81,
  autoQuality: 90,
  humanRating: null,
  retried24h: false,
  ownerCorrected: false,
  transcriptSnippet: 'Caller: Hi — Agent: Hello',
}

const mockCallWithTurns: OpsCallRecord = {
  ...mockCall,
  transcriptTurns: [
    { i: 0, speaker: 'agent', atSec: 0, text: 'Hello, how can I help?', confidence: 0.95 },
    { i: 1, speaker: 'caller', atSec: 5, text: 'I need a booking.' },
  ],
}

describe('OpsTranscriptView', () => {
  it('shows redacted state when revealed=false', () => {
    render(<OpsTranscriptView t={t} call={mockCall} revealed={false} />)
    expect(document.querySelector('[data-region="ops-transcript-redacted"]')).toBeTruthy()
  })

  it('shows snippet when revealed=true but no turns', () => {
    render(<OpsTranscriptView t={t} call={mockCall} revealed={true} />)
    expect(document.querySelector('[data-region="ops-transcript-snippet-only"]')).toBeTruthy()
    expect(screen.getByText('Caller: Hi — Agent: Hello')).toBeInTheDocument()
  })

  it('shows full transcript turns when revealed=true', () => {
    render(<OpsTranscriptView t={t} call={mockCallWithTurns} revealed={true} />)
    expect(document.querySelector('[data-region="ops-transcript-full"]')).toBeTruthy()
    const turns = document.querySelectorAll('[data-region="ops-transcript-turn"]')
    expect(turns).toHaveLength(2)
  })

  it('renders agent speaker label', () => {
    render(<OpsTranscriptView t={t} call={mockCallWithTurns} revealed={true} />)
    expect(screen.getByText('Agent')).toBeInTheDocument()
  })

  it('renders caller speaker label', () => {
    render(<OpsTranscriptView t={t} call={mockCallWithTurns} revealed={true} />)
    expect(screen.getByText('Caller')).toBeInTheDocument()
  })
})

// ── OpsLatencyTimeline ───────────────────────────────────────────────────
const callWithLatency: OpsCallRecord = {
  ...mockCall,
  latency: { pickupMs: 320, firstResponseMs: 1180, endMs: 188_000 },
}

describe('OpsLatencyTimeline', () => {
  it('renders nothing when no latency data', () => {
    const { container } = render(<OpsLatencyTimeline t={t} call={mockCall} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders timeline when latency data present', () => {
    render(<OpsLatencyTimeline t={t} call={callWithLatency} />)
    expect(document.querySelector('[data-region="ops-latency-timeline"]')).toBeTruthy()
  })

  it('shows pickup ms', () => {
    render(<OpsLatencyTimeline t={t} call={callWithLatency} />)
    expect(screen.getByText('320ms')).toBeInTheDocument()
  })

  it('shows first response ms', () => {
    render(<OpsLatencyTimeline t={t} call={callWithLatency} />)
    expect(screen.getByText('1180ms')).toBeInTheDocument()
  })
})

// ── OpsMultiViewerStrip ───────────────────────────────────────────────────
const staffById = {
  'staff-cara': { fullName: 'Cara Reyes', role: 'ops' as OpsRole },
  'staff-han': { fullName: 'Han Park', role: 'on-call' as OpsRole },
}

describe('OpsMultiViewerStrip', () => {
  it('renders nothing when no viewerIds', () => {
    const { container } = render(
      <OpsMultiViewerStrip t={t} viewerIds={undefined} staffById={staffById} selfId="staff-amrou" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when only self viewed', () => {
    const { container } = render(
      <OpsMultiViewerStrip t={t} viewerIds={['staff-amrou']} staffById={staffById} selfId="staff-amrou" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders other viewers', () => {
    render(
      <OpsMultiViewerStrip t={t} viewerIds={['staff-cara', 'staff-amrou']} staffById={staffById} selfId="staff-amrou" />
    )
    expect(document.querySelector('[data-region="ops-multi-viewer"]')).toBeTruthy()
    expect(screen.getByText(/Cara Reyes/)).toBeInTheDocument()
  })
})

// ── OpsOwnerCorrectionDiff ────────────────────────────────────────────────
const callWithCorrection: OpsCallRecord = {
  ...mockCall,
  ownerCorrected: true,
  ownerCorrection: {
    field: 'Outcome class',
    before: 'info-request',
    after: 'complaint',
  },
}

describe('OpsOwnerCorrectionDiff', () => {
  it('renders nothing when no correction', () => {
    const { container } = render(<OpsOwnerCorrectionDiff t={t} call={mockCall} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows before and after values', () => {
    render(<OpsOwnerCorrectionDiff t={t} call={callWithCorrection} />)
    expect(document.querySelector('[data-region="ops-owner-correction"]')).toBeTruthy()
    expect(screen.getByText('info-request')).toBeInTheDocument()
    expect(screen.getByText('complaint')).toBeInTheDocument()
  })

  it('shows the field name', () => {
    render(<OpsOwnerCorrectionDiff t={t} call={callWithCorrection} />)
    expect(screen.getByText(/Outcome class/)).toBeInTheDocument()
  })
})

// ── OpsAuditTail ────────────────────────────────────────────────────────
const mockStaff: OpsStaff = {
  id: 'staff-amrou',
  fullName: 'Amrou Manaseer',
  initials: 'AM',
  role: 'owner',
  twoFactorOn: true,
}

describe('OpsAuditTail', () => {
  it('renders viewed-by info', () => {
    render(
      <OpsAuditTail
        t={t}
        staff={mockStaff}
        viewAt={new Date('2026-05-26T18:00:00Z')}
        revealEvents={[]}
      />
    )
    expect(document.querySelector('[data-region="ops-audit-tail"]')).toBeTruthy()
    expect(screen.getByText(/Amrou Manaseer/)).toBeInTheDocument()
  })

  it('renders reveal events', () => {
    render(
      <OpsAuditTail
        t={t}
        staff={mockStaff}
        viewAt={new Date('2026-05-26T18:00:00Z')}
        revealEvents={[{ at: new Date('2026-05-26T18:05:00Z'), reason: 'Checking churn claim' }]}
      />
    )
    expect(screen.getByText(/Checking churn claim/)).toBeInTheDocument()
  })
})

// ── IfCanReveal ────────────────────────────────────────────────────────────
describe('IfCanReveal', () => {
  it('renders children for owner', () => {
    render(<IfCanReveal role="owner"><span>secret</span></IfCanReveal>)
    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('renders nothing for read-only', () => {
    const { container } = render(<IfCanReveal role="read-only"><span>secret</span></IfCanReveal>)
    expect(container.firstChild).toBeNull()
  })
})
