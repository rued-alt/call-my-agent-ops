import { useState, type ReactNode } from 'react'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import type { OpsCallRecord, OpsTranscriptTurn } from '../../data/opsFixture'
import type { OpsStaff, OpsRole } from '../chrome/OpsChrome'

// Shared security primitives + data-display helpers used by every ops
// surface that touches a Call record. Ported from brand-studio
// _shared/OpsSecurity.tsx. Owner-locked 2026-05-26.
//
// What lives here:
//   • OpsRevealReasonModal — the gate users hit before PII reveal. A
//     short reason field + confirm. Logged on commit.
//   • OpsRevealButton — the "Reveal PII (logged)" affordance. Hidden
//     entirely for read-only roles.
//   • OpsTranscriptView — the full transcript with per-turn confidence
//     inline. Falls back to the snippet when transcriptTurns is absent.
//   • OpsLatencyTimeline — a compact horizontal timeline of the call's
//     pickup → first-response → end milestones.
//   • OpsMultiViewerStrip — surfaces "Also viewed by …" so security
//     reviewers can see triage clusters.
//   • OpsOwnerCorrectionDiff — before/after diff for the field the
//     owner corrected post-call.
//   • OpsAuditTail — the bottom strip stamping current-viewer + any
//     reveal events for the current session.

const ROLES_ALLOWED_TO_REVEAL: OpsRole[] = ['owner', 'ops', 'on-call']

export function canRevealPII(role: OpsRole): boolean {
  return ROLES_ALLOWED_TO_REVEAL.includes(role)
}

// ─── OpsRevealReasonModal ─────────────────────────────────────────────────
// Two-step gate: reason text required (min 12 chars) + confirm click.
export function OpsRevealReasonModal({
  t,
  open,
  onConfirm,
  onCancel,
  targetLabel,
}: {
  t: BrandTokens
  open: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
  /** "Karen Liu's phone" / "Brenda's transcript" — what's being revealed. */
  targetLabel: string
}) {
  const u = t.space.unit
  const [reason, setReason] = useState('')
  const canSubmit = reason.trim().length >= 12

  if (!open) return null

  return (
    <div
      data-region="ops-reveal-reason-backdrop"
      role="presentation"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        data-region="ops-reveal-reason-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Reveal PII — reason required"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 92%)',
          background: hexToRgba(t.color.surface, 0.96),
          backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
          WebkitBackdropFilter:
            'blur(var(--glass-blur)) saturate(var(--glass-sat))',
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.lg,
          boxShadow: 'var(--glass-rim), var(--glass-lift)',
          padding: u * 5,
          color: t.color.foreground,
          fontFamily: t.type.bodyFamily,
        }}
      >
        <div
          style={{
            color: t.color.muted,
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: u,
          }}
        >
          Reveal PII · logged
        </div>
        <h3
          style={{
            margin: 0,
            fontFamily: t.type.headingFamily,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-0.01em',
          }}
        >
          Why are you revealing {targetLabel}?
        </h3>
        <p
          style={{
            margin: `${u * 1.5}px 0 ${u * 3}px 0`,
            color: t.color.muted,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          The reason is recorded against your account in the audit log.
          Customer transcripts are PII — give yourself a short paper
          trail so future-you can defend the access.
        </p>
        <label
          style={{
            display: 'block',
            color: t.color.foreground,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            marginBottom: u,
          }}
        >
          Reason
        </label>
        <textarea
          data-region="ops-reveal-reason-input"
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Investigating Tyler HVAC churn — repeated escalations"
          rows={3}
          style={{
            width: '100%',
            padding: u * 2,
            background: t.color.background,
            color: t.color.foreground,
            border: `1px solid ${t.color.border}`,
            borderRadius: t.radius.sm,
            fontFamily: t.type.bodyFamily,
            fontSize: 13,
            lineHeight: 1.45,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div
          data-region="ops-reveal-reason-char-count"
          style={{
            marginTop: 4,
            color:
              reason.trim().length < 12 && reason.trim().length > 0
                ? t.color.accent
                : t.color.muted,
            fontSize: 11,
            fontFamily: t.type.monoFamily,
            letterSpacing: 0.3,
          }}
        >
          {reason.trim().length < 12
            ? `${reason.trim().length} / 12 chars minimum`
            : 'OK'}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: u * 2,
            marginTop: u * 4,
          }}
        >
          <button
            type="button"
            data-region="ops-reveal-reason-cancel"
            data-press="true"
            onClick={onCancel}
            style={{
              padding: `${u * 1.5}px ${u * 3}px`,
              background: 'transparent',
              color: t.color.muted,
              border: `1px solid ${t.color.border}`,
              borderRadius: t.radius.md,
              fontFamily: t.type.bodyFamily,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-region="ops-reveal-reason-confirm"
            data-press="true"
            disabled={!canSubmit}
            onClick={() => {
              onConfirm(reason.trim())
              setReason('')
            }}
            style={{
              padding: `${u * 1.5}px ${u * 3}px`,
              background: canSubmit
                ? hexToRgba(t.color.primary, 0.85)
                : hexToRgba(t.color.muted, 0.2),
              color: t.color.foreground,
              border: 'none',
              backdropFilter: canSubmit
                ? 'blur(var(--glass-blur)) saturate(var(--glass-sat))'
                : undefined,
              WebkitBackdropFilter: canSubmit
                ? 'blur(var(--glass-blur)) saturate(var(--glass-sat))'
                : undefined,
              boxShadow: canSubmit
                ? 'var(--glass-rim), var(--glass-lift)'
                : undefined,
              borderRadius: t.radius.md,
              fontFamily: t.type.bodyFamily,
              fontSize: 12,
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.6,
            }}
          >
            Reveal and log
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── OpsRevealButton ──────────────────────────────────────────────────────
// Hides itself for read-only roles. Clicking opens the reason modal.
export function OpsRevealButton({
  t,
  role,
  onClick,
  label = 'Reveal PII (logged)',
}: {
  t: BrandTokens
  role: OpsRole
  onClick: () => void
  label?: string
}) {
  if (!canRevealPII(role)) {
    return (
      <span
        data-region="ops-reveal-blocked"
        title="Your role can't reveal PII — request access from an Ops lead."
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: hexToRgba(t.color.muted, 0.18),
          color: t.color.muted,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.sm,
          fontSize: 11,
          fontFamily: t.type.bodyFamily,
          fontWeight: 500,
          letterSpacing: 0.2,
        }}
      >
        Reveal blocked · read-only
      </span>
    )
  }
  return (
    <button
      type="button"
      data-region="ops-reveal-trigger"
      data-press="true"
      onClick={onClick}
      style={{
        background: hexToRgba(t.color.primary, 0.14),
        color: t.color.primary,
        border: `1px solid ${t.color.primary}`,
        borderRadius: t.radius.sm,
        padding: '4px 10px',
        fontSize: 11,
        fontFamily: t.type.bodyFamily,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ─── OpsTranscriptView ─────────────────────────────────────────────────────
// Full transcript with per-turn confidence inline. Falls back to the
// snippet when no transcriptTurns are available. PII obscured by
// default; reveal flag flips it.
export function OpsTranscriptView({
  t,
  call,
  revealed,
}: {
  t: BrandTokens
  call: OpsCallRecord
  revealed: boolean
}) {
  const u = t.space.unit
  if (!revealed) {
    return (
      <div
        data-region="ops-transcript-redacted"
        style={{
          padding: u * 3,
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.sm,
          color: t.color.muted,
          fontStyle: 'italic',
          fontSize: 13,
        }}
      >
        Transcript redacted · reveal to view ({call.transcriptTurns?.length ?? '—'}{' '}
        turns)
      </div>
    )
  }
  if (!call.transcriptTurns || call.transcriptTurns.length === 0) {
    return (
      <div
        data-region="ops-transcript-snippet-only"
        style={{
          padding: u * 3,
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.sm,
          color: t.color.foreground,
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            color: t.color.muted,
            fontSize: 11,
            marginBottom: u,
            fontStyle: 'italic',
          }}
        >
          Full transcript not loaded · snippet:
        </div>
        {call.transcriptSnippet}
      </div>
    )
  }
  return (
    <div
      data-region="ops-transcript-full"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: u * 1.5,
        padding: u * 3,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.sm,
      }}
    >
      {call.transcriptTurns.map((turn) => (
        <TranscriptTurnRow key={turn.i} t={t} turn={turn} />
      ))}
    </div>
  )
}

function TranscriptTurnRow({
  t,
  turn,
}: {
  t: BrandTokens
  turn: OpsTranscriptTurn
}) {
  const speakerColor =
    turn.speaker === 'agent'
      ? t.color.primary
      : turn.speaker === 'owner'
        ? t.color.accent
        : t.color.foreground
  const speakerLabel =
    turn.speaker === 'agent'
      ? 'Agent'
      : turn.speaker === 'owner'
        ? 'Owner'
        : 'Caller'
  const confidenceColor =
    turn.confidence == null
      ? t.color.muted
      : turn.confidence >= 0.8
        ? t.color.primary
        : turn.confidence >= 0.6
          ? t.color.accent
          : t.color.error
  return (
    <div
      data-region="ops-transcript-turn"
      data-speaker={turn.speaker}
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 50px 1fr 60px',
        alignItems: 'baseline',
        gap: t.space.unit * 2,
        fontSize: 12,
        lineHeight: 1.5,
        paddingBottom: 4,
        borderBottom: `1px solid ${hexToRgba(t.color.border, 0.5)}`,
      }}
    >
      <span
        style={{
          color: speakerColor,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {speakerLabel}
      </span>
      <span
        style={{
          color: t.color.muted,
          fontFamily: t.type.monoFamily,
          fontSize: 10,
        }}
      >
        {Math.floor(turn.atSec / 60)}:{(turn.atSec % 60).toString().padStart(2, '0')}
      </span>
      <span style={{ color: t.color.foreground }}>{turn.text}</span>
      {turn.confidence != null && (
        <span
          style={{
            color: confidenceColor,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
            textAlign: 'right',
          }}
          title={`Agent confidence: ${(turn.confidence * 100).toFixed(0)}%`}
        >
          {(turn.confidence * 100).toFixed(0)}%
        </span>
      )}
    </div>
  )
}

// ─── OpsLatencyTimeline ──────────────────────────────────────────────────
// Horizontal bar of milestones: pickup · first-response · end.
export function OpsLatencyTimeline({
  t,
  call,
}: {
  t: BrandTokens
  call: OpsCallRecord
}) {
  const u = t.space.unit
  if (!call.latency) return null
  const { pickupMs, firstResponseMs, endMs } = call.latency
  const pickupPct = (pickupMs / endMs) * 100
  const firstRespPct = (firstResponseMs / endMs) * 100
  return (
    <div data-region="ops-latency-timeline">
      <div
        style={{
          color: t.color.muted,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: u,
        }}
      >
        Latency timeline
      </div>
      <div
        style={{
          position: 'relative',
          height: 18,
          background: t.color.background,
          border: `1px solid ${t.color.border}`,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${firstRespPct}%`,
            background: hexToRgba(t.color.primary, 0.18),
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${pickupPct}%`,
            width: 2,
            background: t.color.primary,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${firstRespPct}%`,
            width: 2,
            background: t.color.accent,
          }}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: u,
          marginTop: u,
          fontFamily: t.type.monoFamily,
          fontSize: 10,
          color: t.color.muted,
        }}
      >
        <div>
          <span style={{ color: t.color.primary }}>●</span> Pickup{' '}
          <strong style={{ color: t.color.foreground }}>{pickupMs}ms</strong>
        </div>
        <div>
          <span style={{ color: t.color.accent }}>●</span> First reply{' '}
          <strong style={{ color: t.color.foreground }}>{firstResponseMs}ms</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          Call end{' '}
          <strong style={{ color: t.color.foreground }}>
            {(endMs / 1000).toFixed(1)}s
          </strong>
        </div>
      </div>
    </div>
  )
}

// ─── OpsMultiViewerStrip ───────────────────────────────────────────────────
// "Also viewed by …" — surfaces unique past viewers so security
// reviewers can spot triage clusters or suspicious access.
export function OpsMultiViewerStrip({
  t,
  viewerIds,
  staffById,
  selfId,
}: {
  t: BrandTokens
  viewerIds: string[] | undefined
  staffById: Record<string, { fullName: string; role: OpsRole }>
  selfId: string
}) {
  if (!viewerIds || viewerIds.length === 0) return null
  const others = Array.from(new Set(viewerIds)).filter((id) => id !== selfId)
  const counts = new Map<string, number>()
  for (const id of viewerIds) {
    if (id === selfId) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  if (others.length === 0) return null
  return (
    <div
      data-region="ops-multi-viewer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: t.space.unit * 2,
        padding: `${t.space.unit}px ${t.space.unit * 2}px`,
        background: hexToRgba(t.color.accent, 0.1),
        border: `1px solid ${hexToRgba(t.color.accent, 0.35)}`,
        borderRadius: t.radius.sm,
        fontSize: 11,
        fontFamily: t.type.bodyFamily,
        color: t.color.foreground,
      }}
    >
      <span style={{ color: t.color.accent, fontWeight: 600 }}>Also viewed by:</span>
      <span style={{ color: t.color.muted }}>
        {others
          .map((id) => {
            const s = staffById[id]
            const count = counts.get(id) ?? 1
            return `${s?.fullName ?? id} (${count})`
          })
          .join(' · ')}
      </span>
    </div>
  )
}

// ─── OpsOwnerCorrectionDiff ───────────────────────────────────────────────
export function OpsOwnerCorrectionDiff({
  t,
  call,
}: {
  t: BrandTokens
  call: OpsCallRecord
}) {
  const u = t.space.unit
  if (!call.ownerCorrection) return null
  return (
    <div
      data-region="ops-owner-correction"
      style={{
        padding: u * 3,
        background: hexToRgba(t.color.accent, 0.1),
        border: `1px solid ${hexToRgba(t.color.accent, 0.35)}`,
        borderRadius: t.radius.sm,
        fontSize: 12,
      }}
    >
      <div
        style={{
          color: t.color.accent,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: u,
        }}
      >
        Owner corrected · {call.ownerCorrection.field}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: u * 2,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: t.type.monoFamily,
              fontSize: 10,
              color: t.color.muted,
              marginBottom: 2,
            }}
          >
            Before
          </div>
          <div
            style={{
              color: t.color.muted,
              textDecoration: 'line-through',
              fontStyle: 'italic',
            }}
          >
            {call.ownerCorrection.before}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: t.type.monoFamily,
              fontSize: 10,
              color: t.color.muted,
              marginBottom: 2,
            }}
          >
            After
          </div>
          <div style={{ color: t.color.foreground, fontWeight: 500 }}>
            {call.ownerCorrection.after}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── OpsAuditTail ───────────────────────────────────────────────────────────
// Bottom-of-card audit strip. Shows current-viewer + any reveal events
// the current session has triggered.
export function OpsAuditTail({
  t,
  staff,
  viewAt,
  revealEvents,
}: {
  t: BrandTokens
  staff: OpsStaff
  viewAt: Date
  revealEvents: { at: Date; reason: string }[]
}) {
  const u = t.space.unit
  return (
    <div
      data-region="ops-audit-tail"
      style={{
        padding: u * 3,
        borderTop: `1px solid ${t.color.border}`,
        background: t.color.surface,
        color: t.color.muted,
        fontFamily: t.type.monoFamily,
        fontSize: 10,
        letterSpacing: 0.3,
        lineHeight: 1.6,
      }}
    >
      <div>
        Viewed by{' '}
        <strong style={{ color: t.color.foreground }}>{staff.fullName}</strong> ({staff.role}) at{' '}
        {viewAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </div>
      {revealEvents.map((r, i) => (
        <div key={i} style={{ marginTop: 2 }}>
          PII revealed at{' '}
          {r.at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · reason:{' '}
          <em style={{ color: t.color.foreground }}>"{r.reason}"</em>
        </div>
      ))}
    </div>
  )
}

// Staff directory helper — keep all staff records in one place so
// previews can look up names + roles by id (multi-viewer strip etc.).
export const OPS_STAFF_BY_ID: Record<string, { fullName: string; role: OpsRole }> = {
  'staff-amrou': { fullName: 'Amrou Manaseer', role: 'owner' },
  'staff-cara': { fullName: 'Cara Reyes', role: 'ops' },
  'staff-han': { fullName: 'Han Park', role: 'on-call' },
  'staff-zoe': { fullName: 'Zoe Lin', role: 'read-only' },
}

export function lookupStaff(
  id: string,
): { fullName: string; role: OpsRole } | undefined {
  return OPS_STAFF_BY_ID[id]
}

// Re-export the canRevealPII as a render-prop component.
export function IfCanReveal({
  role,
  children,
}: {
  role: OpsRole
  children: ReactNode
}) {
  if (!canRevealPII(role)) return null
  return <>{children}</>
}

// Composite PII reveal flow component.
export function OpsPIIRevealFlow({
  t,
  staff,
  targetLabel,
  open,
  onCancel,
  onConfirm,
}: {
  t: BrandTokens
  staff: OpsStaff
  targetLabel: string
  open: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  if (!canRevealPII(staff.role)) return null
  return (
    <OpsRevealReasonModal
      t={t}
      open={open}
      targetLabel={targetLabel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
