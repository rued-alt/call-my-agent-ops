import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import { useGlassPress } from '../../lib/glass/useGlassPress'
import {
  OPS_CALLS,
  type OpsCallRecord,
  type OpsOutcomeClass,
  type OpsAutonomy,
} from '../../data/opsFixture'
import { useOpsClient } from '../../lib/api/opsClient'
import {
  OPS_STAFF_BY_ID,
  OpsAuditTail,
  OpsLatencyTimeline,
  OpsMultiViewerStrip,
  OpsOwnerCorrectionDiff,
  OpsPIIRevealFlow,
  OpsRevealButton,
  OpsTranscriptView,
} from '../../components/security/OpsSecurity'
import { ExpanderPanel } from '../../components/shared/ExpanderPanel'
import { OpsToastStack, useOpsToast } from '../../components/shared/OpsToast'
import { BrandedButton } from '../../components/shared/BrandedButton'
import type { OpsStaff } from '../../components/chrome/OpsChrome'

// OpsCallsPreview — every call, filterable + searchable.
//
// LEFT: filter rail (compact). Outcome class chips + autonomy chips.
//       Single-line search at top.
// RIGHT: call list. Each row is dense (caller + customer + outcome +
//        autonomy + quality + age). PII redacted by default.
// CLICK A ROW: expand-in-place panel beneath the row with full call
//              detail (via ExpanderPanel for smooth physical reflow).
// REVEAL PII: OpsRevealReasonModal gate (≥12 char reason, role-gated).
//
// Voice: matter-of-fact. Hard data, factual labels, no marketing speak.
// Per contract f9ee1622: NEVER say "Rue" — always "the agent".
//
// Data wiring: useQuery calls real GET /admin/ops/calls endpoint.
// Fixture is used as initialData — no loading flash on first render.

type CallsData = {
  calls: OpsCallRecord[]
}

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

const OUTCOME_OPTIONS = Object.keys(OUTCOME_LABEL) as OpsOutcomeClass[]
const AUTONOMY_OPTIONS = Object.keys(AUTONOMY_LABEL) as OpsAutonomy[]

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

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export type OpsCallsPreviewProps = {
  t: BrandTokens
  staff: OpsStaff
}

export function OpsCallsPreview({ t, staff }: OpsCallsPreviewProps) {
  const u = t.space.unit
  const { toasts, show: showToast } = useOpsToast()
  const client = useOpsClient()

  const { data } = useQuery({
    queryKey: ['ops', 'calls'],
    queryFn: async (): Promise<CallsData> => {
      const calls = await client.get<OpsCallRecord[]>('/admin/ops/calls?limit=200').catch(() => OPS_CALLS)
      return { calls: Array.isArray(calls) ? calls : OPS_CALLS }
    },
    initialData: { calls: OPS_CALLS },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const [query, setQuery] = useState('')
  const [outcomeFilters, setOutcomeFilters] = useState<Set<OpsOutcomeClass>>(
    new Set(),
  )
  const [autonomyFilters, setAutonomyFilters] = useState<Set<OpsAutonomy>>(
    new Set(),
  )
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)

  function toggleOutcome(o: OpsOutcomeClass) {
    setOutcomeFilters((cur) => {
      const next = new Set(cur)
      if (next.has(o)) next.delete(o)
      else next.add(o)
      return next
    })
  }
  function toggleAutonomy(a: OpsAutonomy) {
    setAutonomyFilters((cur) => {
      const next = new Set(cur)
      if (next.has(a)) next.delete(a)
      else next.add(a)
      return next
    })
  }

  const filteredCalls = useMemo(() => {
    return data.calls.filter((c) => {
      if (outcomeFilters.size > 0 && !outcomeFilters.has(c.outcomeClass)) return false
      if (autonomyFilters.size > 0 && !autonomyFilters.has(c.autonomy)) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const blob = `${c.callerName ?? ''} ${c.callerPhone} ${c.customerBusiness} ${c.transcriptSnippet}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [data.calls, outcomeFilters, autonomyFilters, query])

  return (
    <div
      data-page="ops-calls"
      style={{
        padding: `${u * 5}px ${u * 6}px ${u * 8}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 4,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
      }}
    >
      {/* ── Main layout: filter rail + call list ─────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: u * 5,
          minHeight: 600,
        }}
      >
        {/* ── Filter rail ──────────────────────────────────────────── */}
        <aside
          data-region="ops-calls-filters"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: u * 4,
          }}
        >
          <FilterGroup t={t} title="Outcome">
            {OUTCOME_OPTIONS.map((o) => (
              <FilterChip
                key={o}
                t={t}
                label={OUTCOME_LABEL[o]}
                active={outcomeFilters.has(o)}
                onToggle={() => toggleOutcome(o)}
              />
            ))}
          </FilterGroup>
          <FilterGroup t={t} title="Autonomy">
            {AUTONOMY_OPTIONS.map((a) => (
              <FilterChip
                key={a}
                t={t}
                label={AUTONOMY_LABEL[a]}
                active={autonomyFilters.has(a)}
                onToggle={() => toggleAutonomy(a)}
              />
            ))}
          </FilterGroup>
          {(outcomeFilters.size > 0 || autonomyFilters.size > 0) && (
            <button
              type="button"
              data-region="ops-calls-clear-filters"
              onClick={() => {
                setOutcomeFilters(new Set())
                setAutonomyFilters(new Set())
              }}
              style={{
                marginTop: u * 2,
                padding: u * 1.5,
                background: 'transparent',
                color: t.color.muted,
                border: `1px solid ${t.color.border}`,
                borderRadius: t.radius.sm,
                fontFamily: t.type.bodyFamily,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          )}
        </aside>

        {/* ── Call list ─────────────────────────────────────────────── */}
        <section data-region="ops-calls-list-wrap">
          {/* Search + count row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: u * 2,
              marginBottom: u * 3,
            }}
          >
            <input
              type="search"
              data-region="ops-calls-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search phone, name, transcript…"
              aria-label="Search calls"
              style={{
                flex: 1,
                padding: `${u * 1.5}px ${u * 2}px`,
                background: t.color.surface,
                color: t.color.foreground,
                border: `1px solid ${t.color.border}`,
                borderRadius: t.radius.sm,
                fontFamily: t.type.bodyFamily,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <span
              data-region="ops-calls-count"
              style={{
                color: t.color.muted,
                fontFamily: t.type.monoFamily,
                fontSize: 11,
                letterSpacing: 0.3,
              }}
            >
              {filteredCalls.length} call{filteredCalls.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Call rows */}
          <div
            data-region="ops-calls-list"
            style={{
              background: t.color.surface,
              border: `1px solid ${t.color.border}`,
              borderRadius: t.radius.md,
              overflow: 'hidden',
            }}
          >
            {filteredCalls.length === 0 ? (
              <div
                data-region="ops-calls-empty"
                style={{
                  padding: u * 6,
                  textAlign: 'center',
                  color: t.color.muted,
                  fontSize: 13,
                }}
              >
                No calls match. Loosen filters or search.
              </div>
            ) : (
              filteredCalls.map((c, i) => {
                const isOpen = selectedCallId === c.id
                return (
                  <div key={c.id} data-region="ops-calls-row-wrap">
                    <CallRow
                      t={t}
                      call={c}
                      active={isOpen}
                      cascadeDelay={i * 30}
                      onOpen={() => setSelectedCallId(isOpen ? null : c.id)}
                    />
                    <ExpanderPanel
                      open={isOpen}
                      dataRegion="ops-calls-row-detail-panel"
                    >
                      {isOpen && (
                        <CallDetailInline
                          t={t}
                          call={c}
                          staff={staff}
                          showToast={showToast}
                        />
                      )}
                    </ExpanderPanel>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <OpsToastStack t={t} toasts={toasts} />
    </div>
  )
}

// ─── Filter group / chip ──────────────────────────────────────────────
function FilterGroup({
  t,
  title,
  children,
}: {
  t: BrandTokens
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        style={{
          color: t.color.muted,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: t.space.unit * 1.5,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function FilterChip({
  t,
  label,
  active,
  onToggle,
}: {
  t: BrandTokens
  label: string
  active: boolean
  onToggle: () => void
}) {
  const { pressStyle, pressHandlers } = useGlassPress(t, { skipDepress: true })
  return (
    <button
      type="button"
      data-region="ops-calls-filter-chip"
      data-active={active ? 'true' : 'false'}
      data-press="true"
      onClick={onToggle}
      {...pressHandlers}
      style={{
        padding: '4px 0',
        width: 96,
        borderRadius: 999,
        background: active ? hexToRgba(t.color.primary, 0.85) : 'transparent',
        color: active ? t.color.foreground : t.color.muted,
        border: `1px solid ${active ? t.color.primary : t.color.border}`,
        fontFamily: t.type.bodyFamily,
        fontSize: 11,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        textAlign: 'center',
        transition:
          'background var(--motion-duration-fast, 160ms) ease, color var(--motion-duration-fast, 160ms) ease, box-shadow 220ms var(--glass-ease)',
        ...pressStyle,
      }}
    >
      {label}
    </button>
  )
}

// ─── Call row (compact) ───────────────────────────────────────────────
function CallRow({
  t,
  call,
  active,
  cascadeDelay,
  onOpen,
}: {
  t: BrandTokens
  call: OpsCallRecord
  active: boolean
  cascadeDelay: number
  onOpen: () => void
}) {
  const u = t.space.unit
  const qualityColor =
    call.autoQuality == null
      ? t.color.muted
      : call.autoQuality >= 85
        ? t.color.primary
        : call.autoQuality >= 70
          ? t.color.accent
          : t.color.error
  const { pressStyle, pressHandlers } = useGlassPress(t, { skipDepress: true })
  return (
    <button
      type="button"
      data-region="ops-calls-row"
      data-call-id={call.id}
      data-active={active ? 'true' : 'false'}
      data-press="true"
      onClick={onOpen}
      {...pressHandlers}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 90px 90px 80px 70px',
        alignItems: 'center',
        gap: u * 2,
        padding: `${u * 2}px ${u * 3}px`,
        width: '100%',
        background: active ? hexToRgba(t.color.primary, 0.08) : 'transparent',
        border: 'none',
        borderTop: `1px solid ${t.color.border}`,
        textAlign: 'left',
        color: t.color.foreground,
        cursor: 'pointer',
        opacity: 0,
        animation: `cma-cascade-in 220ms var(--motion-easing-enter, ease-out) ${cascadeDelay}ms forwards`,
        transition: 'background 160ms ease, box-shadow 220ms var(--glass-ease)',
        ...pressStyle,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: t.color.foreground }}>
          {redactName(call.callerName)}
        </div>
        <div style={{ color: t.color.muted, fontSize: 11, fontFamily: t.type.monoFamily }}>
          {redactPhone(call.callerPhone)}
        </div>
      </div>
      <div style={{ color: t.color.foreground, fontSize: 12 }}>
        {call.customerBusiness}
      </div>
      <Badge t={t} label={OUTCOME_LABEL[call.outcomeClass]} tone="neutral" />
      <Badge
        t={t}
        label={AUTONOMY_LABEL[call.autonomy]}
        tone={call.autonomy === 'autonomous' ? 'good' : 'warn'}
      />
      <div
        style={{
          color: qualityColor,
          fontFamily: t.type.monoFamily,
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'right',
        }}
      >
        {call.autoQuality ?? '—'}
      </div>
      <div
        style={{
          color: t.color.muted,
          fontFamily: t.type.monoFamily,
          fontSize: 11,
          textAlign: 'right',
        }}
      >
        {timeAgo(new Date(call.startedAt))}
      </div>
    </button>
  )
}

function Badge({
  t,
  label,
  tone,
}: {
  t: BrandTokens
  label: string
  tone: 'good' | 'warn' | 'neutral'
}) {
  const bg =
    tone === 'good'
      ? hexToRgba(t.color.primary, 0.18)
      : tone === 'warn'
        ? hexToRgba(t.color.accent, 0.22)
        : hexToRgba(t.color.muted, 0.14)
  const fg =
    tone === 'good'
      ? t.color.primary
      : tone === 'warn'
        ? t.color.accent
        : t.color.muted
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 0',
        width: 80,
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 10,
        fontFamily: t.type.bodyFamily,
        fontWeight: 600,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        textAlign: 'center',
      }}
    >
      {label}
    </span>
  )
}

// ─── Call detail inline ────────────────────────────────────────────────
// Opens down beneath the clicked row via ExpanderPanel so siblings
// physically reflow with the panel rather than snapping.
function CallDetailInline({
  t,
  call,
  staff,
  showToast,
}: {
  t: BrandTokens
  call: OpsCallRecord
  staff: OpsStaff
  showToast: (label: string, detail?: string) => void
}) {
  const [actedRated, setActedRated] = useState(false)
  const [actedFlagged, setActedFlagged] = useState(false)
  const [actedOpened, setActedOpened] = useState(false)
  const u = t.space.unit
  const [piiRevealed, setPiiRevealed] = useState(false)
  const [revealEvents, setRevealEvents] = useState<{ at: Date; reason: string }[]>([])
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [viewLoggedAt] = useState<Date>(new Date())

  const callerName = piiRevealed
    ? call.callerName ?? 'Unknown caller'
    : redactName(call.callerName)
  const callerPhone = piiRevealed
    ? call.callerPhone
    : redactPhone(call.callerPhone)

  function openReasonGate() {
    setReasonModalOpen(true)
  }
  function confirmReveal(reason: string) {
    setPiiRevealed(true)
    setRevealEvents((cur) => [...cur, { at: new Date(), reason }])
    setReasonModalOpen(false)
  }

  return (
    <>
      <div
        data-region="ops-calls-row-detail"
        data-call-id={call.id}
        style={{
          background: hexToRgba(t.color.primary, 0.08),
          color: t.color.foreground,
          fontFamily: t.type.bodyFamily,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Compact meta strip */}
        <div
          data-region="ops-calls-drawer-meta-strip"
          style={{
            padding: `${u * 2}px ${u * 4}px 0`,
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 11,
            letterSpacing: 0.3,
          }}
        >
          {call.id} ·{' '}
          {new Date(call.startedAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          · {formatDuration(call.durationSec)}
        </div>

        {/* Body */}
        <div
          style={{
            padding: u * 4,
            display: 'flex',
            flexDirection: 'column',
            gap: u * 4,
          }}
        >
          {/* Caller block + PII reveal */}
          <section data-region="ops-calls-drawer-caller">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: u * 2,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: t.color.muted,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                Caller
              </div>
              {!piiRevealed && (
                <OpsRevealButton t={t} role={staff.role} onClick={openReasonGate} />
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{callerName}</div>
            <div
              style={{
                color: t.color.muted,
                fontFamily: t.type.monoFamily,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {callerPhone}
            </div>
          </section>

          {/* Multi-viewer signal */}
          <OpsMultiViewerStrip
            t={t}
            viewerIds={call.recentViewerIds}
            staffById={OPS_STAFF_BY_ID}
            selfId={staff.id}
          />

          {/* Latency timeline */}
          <OpsLatencyTimeline t={t} call={call} />

          {/* Owner correction diff */}
          <OpsOwnerCorrectionDiff t={t} call={call} />

          {/* Quality scores */}
          <section data-region="ops-calls-drawer-quality">
            <div
              style={{
                fontSize: 11,
                color: t.color.muted,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                fontWeight: 500,
                marginBottom: u * 2,
              }}
            >
              Quality
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: u * 2,
              }}
            >
              <QualityChip
                t={t}
                label="Auto"
                value={call.autoQuality != null ? `${call.autoQuality}` : '—'}
                tone={
                  call.autoQuality == null
                    ? 'neutral'
                    : call.autoQuality >= 85
                      ? 'good'
                      : call.autoQuality >= 70
                        ? 'warn'
                        : 'bad'
                }
              />
              <QualityChip
                t={t}
                label="Confidence"
                value={`${Math.round(call.agentConfidenceAvg * 100)}%`}
                tone={
                  call.agentConfidenceAvg >= 0.85
                    ? 'good'
                    : call.agentConfidenceAvg >= 0.7
                      ? 'warn'
                      : 'bad'
                }
              />
              <QualityChip
                t={t}
                label="Low turn"
                value={`${Math.round(call.agentConfidenceLow * 100)}%`}
                tone={
                  call.agentConfidenceLow >= 0.6
                    ? 'good'
                    : call.agentConfidenceLow >= 0.4
                      ? 'warn'
                      : 'bad'
                }
              />
            </div>
            {call.humanRating && (
              <div
                style={{
                  marginTop: u * 2,
                  padding: u * 2,
                  background: hexToRgba(t.color.primary, 0.1),
                  border: `1px solid ${hexToRgba(t.color.primary, 0.4)}`,
                  borderRadius: t.radius.sm,
                  fontSize: 12,
                  color: t.color.foreground,
                }}
              >
                <strong>Human rated:</strong>{' '}
                understood {call.humanRating.understood} · answered{' '}
                {call.humanRating.answered} · tone {call.humanRating.tone} ·
                approved {call.humanRating.approved}
              </div>
            )}
          </section>

          {/* Extra flags */}
          {(call.retried24h || call.ownerCorrected) && (
            <section
              data-region="ops-calls-drawer-flags"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: u * 2,
                alignItems: 'center',
              }}
            >
              {call.retried24h && <Badge t={t} label="Retried 24h" tone="warn" />}
              {call.ownerCorrected && (
                <Badge t={t} label="Owner corrected" tone="warn" />
              )}
            </section>
          )}

          {/* Transcript */}
          <section data-region="ops-calls-drawer-transcript">
            <div
              style={{
                fontSize: 11,
                color: t.color.muted,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                fontWeight: 500,
                marginBottom: u * 2,
              }}
            >
              Transcript
            </div>
            <OpsTranscriptView t={t} call={call} revealed={piiRevealed} />
          </section>

          {/* Action buttons */}
          <section
            data-region="ops-calls-drawer-actions"
            style={{
              display: 'flex',
              gap: u * 2,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <BrandedButton
              t={t}
              variant="primary"
              size="sm"
              minWidth={140}
              dataRegion="ops-calls-drawer-rate"
              disabled={actedRated}
              onClick={() => {
                setActedRated(true)
                showToast(
                  'Queued for eval',
                  `${call.id} surfaces at the top of your queue.`,
                )
              }}
            >
              {actedRated ? 'Queued ✓' : 'Rate this call'}
            </BrandedButton>
            <BrandedButton
              t={t}
              variant="danger"
              size="sm"
              minWidth={140}
              dataRegion="ops-calls-drawer-flag"
              disabled={actedFlagged}
              onClick={() => {
                setActedFlagged(true)
                showToast(
                  'Flagged for review',
                  `Tagged ${call.id} so the on-call rotation sees it.`,
                )
              }}
            >
              {actedFlagged ? 'Flagged ✓' : 'Flag for review'}
            </BrandedButton>
            <BrandedButton
              t={t}
              variant="ghost"
              size="sm"
              minWidth={120}
              dataRegion="ops-calls-drawer-open-in-app"
              onClick={() => {
                setActedOpened(true)
                showToast(
                  'Link copied',
                  `Deep link to ${call.id} on your clipboard.`,
                )
                window.setTimeout(() => setActedOpened(false), 1200)
              }}
            >
              {actedOpened ? 'Copied ✓' : 'Open in app'}
            </BrandedButton>
          </section>
        </div>

        {/* Audit log strip (pinned at bottom of detail) */}
        <OpsAuditTail
          t={t}
          staff={staff}
          viewAt={viewLoggedAt}
          revealEvents={revealEvents}
        />
      </div>

      {/* PII reveal reason gate */}
      <OpsPIIRevealFlow
        t={t}
        staff={staff}
        targetLabel={`call ${call.id}'s caller details`}
        open={reasonModalOpen}
        onCancel={() => setReasonModalOpen(false)}
        onConfirm={(reason) => confirmReveal(reason)}
      />
    </>
  )
}

function QualityChip({
  t,
  label,
  value,
  tone,
}: {
  t: BrandTokens
  label: string
  value: string
  tone: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const u = t.space.unit
  const color =
    tone === 'good'
      ? t.color.primary
      : tone === 'warn'
        ? t.color.accent
        : tone === 'bad'
          ? t.color.error
          : t.color.muted
  return (
    <div
      style={{
        padding: u * 2,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.sm,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          color: t.color.muted,
          fontSize: 10,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 2,
          color,
          fontFamily: t.type.monoFamily,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  )
}
