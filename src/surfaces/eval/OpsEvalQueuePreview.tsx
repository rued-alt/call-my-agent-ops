import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import { AnimatedCheckmark } from '../../components/shared/AnimatedCheckmark'
import {
  OPS_CALLS,
  OPS_EVAL_QUEUE,
  type OpsCallRecord,
  type OpsEvalQueueItem,
  type OpsOutcomeClass,
  type OpsAutonomy,
} from '../../data/opsFixture'
import {
  OPS_STAFF_BY_ID,
  OpsLatencyTimeline,
  OpsMultiViewerStrip,
  OpsOwnerCorrectionDiff,
  OpsPIIRevealFlow,
  OpsRevealButton,
  OpsTranscriptView,
} from '../../components/security/OpsSecurity'
import type { OpsStaff } from '../../components/chrome/OpsChrome'
import { DEFAULT_OPS_STAFF } from '../../components/chrome/OpsChrome'

// OpsEvalQueuePreview — the daily rating ritual. The moat.
//
// One call at a time. Big centered surface. 4-question rubric on the
// right rail. Keyboard-driven (1/2/3 keys per question, ↵ to advance).
// Goal: 20–50 calls rated in under 15 minutes.
//
// Data wiring: useQuery with queryKey ['ops', 'eval'] returns fixture.
// TODO(backend-wireup): replace queryFn with real endpoint calls:
//   GET  /admin/ops/eval/queue      -> OpsEvalQueueItem[]
//   POST /admin/ops/eval/rate       -> { callId, rating } -> 200
//   GET  /admin/ops/eval/calls/:id  -> OpsCallRecord
// When backend ships, swap the async fixture wrappers below with fetch calls.

const OUTCOME_LABEL: Record<OpsOutcomeClass, string> = {
  booking: 'Booking',
  'info-request': 'Info',
  complaint: 'Complaint',
  'transfer-needed': 'Transfer',
  'no-business': 'No biz',
  spam: 'Spam',
}

const AUTONOMY_LABEL: Record<OpsAutonomy, string> = {
  autonomous: 'Auto',
  escalated: 'Escalated',
  corrected: 'Corrected',
  takeover: 'Takeover',
}

const PRIORITY_LABEL: Record<OpsEvalQueueItem['priority'], string> = {
  urgent: 'Urgent',
  flagged: 'Flagged',
  sample: 'Sample',
}

export type Rating = {
  understood: 'yes' | 'partial' | 'no' | null
  answered: 'yes' | 'no' | 'na' | null
  tone: 'yes' | 'no' | null
  approved: 'yes' | 'no' | null
}

const EMPTY_RATING: Rating = {
  understood: null,
  answered: null,
  tone: null,
  approved: null,
}

function redactPhone(phone: string): string {
  return phone.replace(/(\(\d{3}\)\s?)\d{3}(-\d{4})/, '$1***$2')
}

function redactName(name: string | null): string {
  if (!name) return 'Unknown caller'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0][0] + '. (redacted)'
  return parts[0] + ' ' + parts[parts.length - 1][0] + '.'
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

type EvalQueueData = {
  queue: Array<OpsEvalQueueItem & { call: OpsCallRecord }>
}

// TODO(backend-wireup): replace with fetch('/admin/ops/eval/queue') etc.
async function fetchEvalQueue(): Promise<EvalQueueData> {
  const queue = OPS_EVAL_QUEUE.map((item) => {
    const call = OPS_CALLS.find((c) => c.id === item.callId)
    return call ? { ...item, call } : null
  }).filter(Boolean) as Array<OpsEvalQueueItem & { call: OpsCallRecord }>

  return { queue }
}

export type OpsEvalQueuePreviewProps = {
  t: BrandTokens
  staff?: OpsStaff
}

export function OpsEvalQueuePreview({ t, staff = DEFAULT_OPS_STAFF }: OpsEvalQueuePreviewProps) {
  const u = t.space.unit

  const { data } = useQuery({
    queryKey: ['ops', 'eval'],
    queryFn: fetchEvalQueue,
    initialData: {
      queue: OPS_EVAL_QUEUE.map((item) => {
        const call = OPS_CALLS.find((c) => c.id === item.callId)
        return call ? { ...item, call } : null
      }).filter(Boolean) as Array<OpsEvalQueueItem & { call: OpsCallRecord }>,
    },
  })

  const queue = data.queue
  const total = queue.length

  const [cursor, setCursor] = useState(0)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [streak, setStreak] = useState(0)
  const [rating, setRating] = useState<Rating>(EMPTY_RATING)
  const [piiRevealed, setPiiRevealed] = useState(false)
  const [, setRevealReason] = useState<string | null>(null)
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [showJustRated, setShowJustRated] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const current = queue[cursor]
  const remaining = total - completedIds.size

  useEffect(() => {
    setRating(EMPTY_RATING)
    setPiiRevealed(false)
    setRevealReason(null)
    setReasonModalOpen(false)
  }, [cursor])

  function commitRating(complete: boolean) {
    if (!current) return
    if (!complete) {
      setStreak(0)
      advance()
      return
    }
    setCompletedIds((cur) => {
      const next = new Set(cur)
      next.add(current.callId)
      return next
    })
    setStreak((s) => s + 1)
    setShowJustRated(current.callId)
    window.setTimeout(() => setShowJustRated(null), 700)
    advance()
  }

  function advance() {
    if (cursor + 1 >= queue.length) {
      setDone(true)
      return
    }
    setCursor((c) => c + 1)
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (done) return
      if (e.key === 'ArrowRight') {
        commitRating(false)
        return
      }
      if (e.key === 'Enter') {
        if (rating.understood && rating.answered && rating.tone && rating.approved) {
          commitRating(true)
        }
        return
      }
      const idx = ['1', '2', '3'].indexOf(e.key)
      if (idx === -1) return
      setRating((cur) => {
        if (!cur.understood) {
          const v = (['yes', 'partial', 'no'] as const)[idx]
          return v ? { ...cur, understood: v } : cur
        }
        if (!cur.answered) {
          const v = (['yes', 'no', 'na'] as const)[idx]
          return v ? { ...cur, answered: v } : cur
        }
        if (!cur.tone) {
          const v = (['yes', 'no'] as const)[idx]
          return v ? { ...cur, tone: v } : cur
        }
        if (!cur.approved) {
          const v = (['yes', 'no'] as const)[idx]
          return v ? { ...cur, approved: v } : cur
        }
        return cur
      })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rating, cursor, done])

  return (
    <div
      data-page="ops-eval"
      style={{
        padding: `${u * 5}px ${u * 8}px ${u * 8}px ${u * 8}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 5,
        maxHeight: '80vh',
        overflowY: 'auto',
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
      }}
    >
      {/* Progress strip */}
      <div
        data-region="ops-eval-progress"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: u * 3,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: u,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: t.type.headingFamily,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              Eval queue
            </h2>
            <span
              data-region="ops-eval-progress-counter"
              style={{
                fontFamily: t.type.monoFamily,
                fontSize: 11,
                color: t.color.muted,
                letterSpacing: 0.3,
              }}
            >
              {completedIds.size} / {total} rated today
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: t.color.surface,
              border: `1px solid ${t.color.border}`,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              data-region="ops-eval-progress-bar"
              style={{
                height: '100%',
                width: `${total > 0 ? (completedIds.size / total) * 100 : 0}%`,
                background: hexToRgba(t.color.primary, 0.85),
                transition: 'width 320ms cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            />
          </div>
        </div>
        {streak >= 10 && (
          <div
            data-region="ops-eval-streak"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: hexToRgba(t.color.accent, 0.2),
              color: t.color.accent,
              fontSize: 12,
              fontFamily: t.type.bodyFamily,
              fontWeight: 600,
            }}
          >
            {streak} in a row
          </div>
        )}
      </div>

      {done ? (
        <DoneState t={t} count={completedIds.size} />
      ) : current ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 320px',
              gap: u * 5,
              minHeight: 400,
            }}
          >
            {/* Current call card */}
            <CallCard
              key={current.callId}
              t={t}
              staff={staff}
              queueItem={current}
              piiRevealed={piiRevealed}
              onOpenRevealGate={() => setReasonModalOpen(true)}
              justRated={showJustRated === current.callId}
            />

            {/* Rubric rail */}
            <RubricRail
              t={t}
              rating={rating}
              setRating={setRating}
              onCommit={() => commitRating(true)}
              onSkip={() => commitRating(false)}
            />
          </div>
          <OpsPIIRevealFlow
            t={t}
            staff={staff}
            targetLabel={`call ${current.callId}'s caller details`}
            open={reasonModalOpen}
            onCancel={() => setReasonModalOpen(false)}
            onConfirm={(reason) => {
              setPiiRevealed(true)
              setRevealReason(reason)
              setReasonModalOpen(false)
            }}
          />
        </>
      ) : (
        <DoneState t={t} count={completedIds.size} />
      )}
    </div>
  )
}

// ── Call card ─────────────────────────────────────────────────────────────
function CallCard({
  t,
  staff,
  queueItem,
  piiRevealed,
  onOpenRevealGate,
  justRated,
}: {
  t: BrandTokens
  staff: OpsStaff
  queueItem: OpsEvalQueueItem & { call: OpsCallRecord }
  piiRevealed: boolean
  onOpenRevealGate: () => void
  justRated: boolean
}) {
  const u = t.space.unit
  const c = queueItem.call
  const priorityColor =
    queueItem.priority === 'urgent'
      ? t.color.error
      : queueItem.priority === 'flagged'
        ? t.color.accent
        : t.color.muted

  return (
    <article
      data-region="ops-eval-card"
      data-call-id={c.id}
      data-priority={queueItem.priority}
      style={{
        position: 'relative',
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        boxShadow: 'var(--glass-rim), var(--glass-lift)',
        padding: u * 5,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 4,
        animation:
          'cma-modal-slide-up var(--motion-duration-modal, 220ms) cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: u * 3,
        }}
      >
        <div>
          <span
            data-region="ops-eval-priority-badge"
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 999,
              background: hexToRgba(priorityColor, 0.18),
              color: priorityColor,
              fontSize: 10,
              fontFamily: t.type.bodyFamily,
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
              marginBottom: u * 2,
            }}
          >
            {PRIORITY_LABEL[queueItem.priority]}
          </span>
          <div
            data-region="ops-eval-queue-reason"
            style={{
              marginBottom: u,
              color: t.color.muted,
              fontSize: 11,
              fontFamily: t.type.monoFamily,
              letterSpacing: 0.2,
            }}
          >
            {queueItem.reason}
          </div>
          <h3
            data-region="ops-eval-business"
            style={{
              margin: 0,
              fontFamily: t.type.headingFamily,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '-0.01em',
            }}
          >
            {c.customerBusiness}
          </h3>
          <div
            data-region="ops-eval-call-meta"
            style={{
              marginTop: u * 0.5,
              color: t.color.muted,
              fontSize: 12,
              fontFamily: t.type.monoFamily,
            }}
          >
            {new Date(c.startedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}{' '}
            · {formatDuration(c.durationSec)} · {OUTCOME_LABEL[c.outcomeClass]} ·{' '}
            {AUTONOMY_LABEL[c.autonomy]}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              color: t.color.muted,
              fontSize: 10,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Auto quality
          </div>
          <div
            data-region="ops-eval-auto-quality"
            style={{
              fontFamily: t.type.monoFamily,
              fontSize: 28,
              fontWeight: 700,
              color:
                c.autoQuality == null
                  ? t.color.muted
                  : c.autoQuality >= 85
                    ? t.color.primary
                    : c.autoQuality >= 70
                      ? t.color.accent
                      : t.color.error,
            }}
          >
            {c.autoQuality ?? '—'}
          </div>
        </div>
      </div>

      {/* Caller + PII */}
      <div
        data-region="ops-eval-caller"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: u * 3,
          background: hexToRgba(t.color.background, 0.5),
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.sm,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {piiRevealed ? c.callerName ?? 'Unknown caller' : redactName(c.callerName)}
          </div>
          <div
            style={{
              marginTop: 2,
              color: t.color.muted,
              fontFamily: t.type.monoFamily,
              fontSize: 12,
            }}
          >
            {piiRevealed ? c.callerPhone : redactPhone(c.callerPhone)}
          </div>
        </div>
        {!piiRevealed && (
          <OpsRevealButton t={t} role={staff.role} onClick={onOpenRevealGate} />
        )}
      </div>

      {/* Multi-viewer signal + latency timeline */}
      <OpsMultiViewerStrip
        t={t}
        viewerIds={c.recentViewerIds}
        staffById={OPS_STAFF_BY_ID}
        selfId={staff.id}
      />
      <OpsLatencyTimeline t={t} call={c} />

      {/* Owner correction diff */}
      <OpsOwnerCorrectionDiff t={t} call={c} />

      {/* Full transcript */}
      <div data-region="ops-eval-transcript">
        <OpsTranscriptView t={t} call={c} revealed={piiRevealed} />
      </div>

      {/* Audit strip */}
      <div
        data-region="ops-eval-audit"
        style={{
          marginTop: 'auto',
          paddingTop: u * 2,
          borderTop: `1px solid ${t.color.border}`,
          color: t.color.muted,
          fontFamily: t.type.monoFamily,
          fontSize: 10,
          letterSpacing: 0.3,
        }}
      >
        Viewed by{' '}
        <strong style={{ color: t.color.foreground }}>{staff.fullName}</strong>{' '}
        ({staff.role}) at{' '}
        {new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>

      {/* Just-rated overlay */}
      {justRated && (
        <div
          data-region="ops-eval-just-rated"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: hexToRgba(t.color.primary, 0.18),
            borderRadius: t.radius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <AnimatedCheckmark t={t} size={48} />
        </div>
      )}
    </article>
  )
}

// ── Rubric rail ────────────────────────────────────────────────────────────
function RubricRail({
  t,
  rating,
  setRating,
  onCommit,
  onSkip,
}: {
  t: BrandTokens
  rating: Rating
  setRating: (r: Rating | ((cur: Rating) => Rating)) => void
  onCommit: () => void
  onSkip: () => void
}) {
  const u = t.space.unit
  const allAnswered =
    !!rating.understood && !!rating.answered && !!rating.tone && !!rating.approved
  return (
    <aside
      data-region="ops-eval-rubric"
      style={{
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 3,
      }}
    >
      <div
        style={{
          color: t.color.muted,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Rate (1 / 2 / 3 keys, ↵ to commit)
      </div>
      <RubricQuestion
        t={t}
        label="Did the agent understand?"
        value={rating.understood}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'partial', label: 'Partial' },
          { value: 'no', label: 'No' },
        ]}
        onChange={(v) => setRating((cur) => ({ ...cur, understood: v as Rating['understood'] }))}
      />
      <RubricQuestion
        t={t}
        label="Did the agent answer correctly?"
        value={rating.answered}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'na', label: 'N/A' },
        ]}
        onChange={(v) => setRating((cur) => ({ ...cur, answered: v as Rating['answered'] }))}
      />
      <RubricQuestion
        t={t}
        label="Tone appropriate?"
        value={rating.tone}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
        onChange={(v) => setRating((cur) => ({ ...cur, tone: v as Rating['tone'] }))}
      />
      <RubricQuestion
        t={t}
        label="Would the owner approve?"
        value={rating.approved}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
        onChange={(v) => setRating((cur) => ({ ...cur, approved: v as Rating['approved'] }))}
      />

      <div
        style={{
          display: 'flex',
          gap: u * 2,
          marginTop: u * 2,
        }}
      >
        <button
          type="button"
          data-region="ops-eval-commit"
          data-press="true"
          disabled={!allAnswered}
          onClick={onCommit}
          style={{
            flex: 1,
            padding: `${u * 2}px ${u * 3}px`,
            background: allAnswered
              ? hexToRgba(t.color.primary, 0.85)
              : hexToRgba(t.color.muted, 0.2),
            color: t.color.foreground,
            border: 'none',
            backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
            boxShadow: allAnswered ? 'var(--glass-rim), var(--glass-lift)' : undefined,
            borderRadius: t.radius.md,
            fontFamily: t.type.bodyFamily,
            fontSize: 13,
            fontWeight: 600,
            cursor: allAnswered ? 'pointer' : 'not-allowed',
            opacity: allAnswered ? 1 : 0.6,
          }}
        >
          Commit · ↵
        </button>
        <button
          type="button"
          data-region="ops-eval-skip"
          data-press="true"
          onClick={onSkip}
          style={{
            padding: `${u * 2}px ${u * 3}px`,
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
          Skip · →
        </button>
      </div>
    </aside>
  )
}

function RubricQuestion({
  t,
  label,
  value,
  options,
  onChange,
}: {
  t: BrandTokens
  label: string
  value: string | null
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const u = t.space.unit
  return (
    <div
      data-region="ops-eval-question"
      data-answered={value ? 'true' : 'false'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: u * 1.5,
        padding: u * 2,
        background: t.color.surface,
        border: `1px solid ${value ? hexToRgba(t.color.primary, 0.4) : t.color.border}`,
        borderRadius: t.radius.sm,
        transition: 'border-color 220ms ease',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: t.color.foreground,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {options.map((opt, i) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              data-region="ops-eval-option"
              data-answer={opt.value}
              data-active={active ? 'true' : 'false'}
              data-press="true"
              onClick={() => onChange(opt.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: active ? hexToRgba(t.color.primary, 0.85) : 'transparent',
                color: active ? t.color.foreground : t.color.muted,
                border: `1px solid ${active ? t.color.primary : t.color.border}`,
                borderRadius: t.radius.sm,
                fontFamily: t.type.bodyFamily,
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: t.type.monoFamily,
                  fontSize: 9,
                  opacity: 0.7,
                }}
              >
                {i + 1}
              </span>
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Done state ─────────────────────────────────────────────────────────────
function DoneState({ t, count }: { t: BrandTokens; count: number }) {
  const u = t.space.unit
  return (
    <div
      data-region="ops-eval-done"
      style={{
        padding: `${u * 12}px ${u * 8}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: u * 3,
        textAlign: 'center',
        minHeight: 400,
      }}
    >
      <AnimatedCheckmark t={t} size={72} />
      <h2
        style={{
          margin: 0,
          fontFamily: t.type.headingFamily,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '-0.01em',
        }}
      >
        Inbox zero — daily eval queue cleared
      </h2>
      <p
        style={{
          margin: 0,
          color: t.color.muted,
          fontSize: 14,
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        Rated {count} {count === 1 ? 'call' : 'calls'} today. Come back tomorrow. Auto-scorer will
        calibrate against your ratings overnight.
      </p>
    </div>
  )
}

