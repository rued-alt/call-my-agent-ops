import { useMemo, useState } from 'react'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import { useGlassPress } from '../../lib/glass/useGlassPress'
import { ExpanderPanel } from '../../components/shared/ExpanderPanel'
import { OpsToastStack, useOpsToast } from '../../components/shared/OpsToast'
import { BrandedButton } from '../../components/shared/BrandedButton'
import {
  OPS_CUSTOMERS,
  OPS_CUSTOMER_CALLS,
  BUCKET_ORDER,
  bucketFor,
  type OpsCustomer,
  type OpsCustomerPlan,
  type HealthBucket,
} from '../../data/opsFixture'

// OpsCustomersPreview — customer health list.
//
// Goals:
//   • Who's stuck in setup? (first-call-not-yet)
//   • Who's at churn risk? (usage drop + low quality)
//   • Who's near trial end? (countdown)
//   • Who needs a check-in this week?
//
// Layout: dense table — one row per customer, grouped by health bucket
// (at-risk > stuck > trial-ending > watch > healthy).
// Click a row → inline expander with full customer data + recent calls.
//
// PII (owner name) is shown by default since this is an ops surface.
// Per contract f9ee1622: NEVER say "Rue" — always "the agent".
//
// Data wiring: useQuery with queryKey ['ops', 'customers'] returns fixture.
// TODO(backend-wireup): replace queryFn with real endpoint call:
//   GET /admin/ops/customers -> OpsCustomer[]
// When backend ships, swap the async fixture wrapper below with a fetch call.

const BUCKET_LABEL: Record<HealthBucket, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  'at-risk': 'At risk',
  stuck: 'Stuck in setup',
  'trial-ending': 'Trial ending',
}

const PLAN_LABEL: Record<OpsCustomerPlan, string> = {
  trial: 'Trial',
  solo: 'Solo',
  team: 'Team',
  pro: 'Pro',
}

export type OpsCustomersPreviewProps = {
  t: BrandTokens
}

export function OpsCustomersPreview({ t }: OpsCustomersPreviewProps) {
  const u = t.space.unit
  const { toasts, show: showToast } = useOpsToast()
  const [activeBucket, setActiveBucket] = useState<HealthBucket | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Pre-build map of bucket → customers for chip counts.
  const bucketed = useMemo(() => {
    const map = new Map<HealthBucket, OpsCustomer[]>()
    for (const c of OPS_CUSTOMERS) {
      const b = bucketFor(c)
      const arr = map.get(b) ?? []
      arr.push(c)
      map.set(b, arr)
    }
    return map
  }, [])

  // Visible rows: sorted by bucket priority when showing all.
  const visible = useMemo(() => {
    if (activeBucket === 'all') {
      return [...OPS_CUSTOMERS].sort((a, b) => {
        const ai = BUCKET_ORDER.indexOf(bucketFor(a))
        const bi = BUCKET_ORDER.indexOf(bucketFor(b))
        return ai - bi
      })
    }
    return bucketed.get(activeBucket) ?? []
  }, [activeBucket, bucketed])

  return (
    <div
      data-page="ops-customers"
      style={{
        padding: `${u * 5}px ${u * 8}px ${u * 8}px ${u * 8}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 4,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
      }}
    >
      {/* Heading row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <h1
          style={{
            fontFamily: t.type.headingFamily,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '-0.015em',
            margin: 0,
          }}
        >
          Customers
        </h1>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 11,
            letterSpacing: 0.3,
          }}
        >
          {OPS_CUSTOMERS.length} accounts
        </span>
      </div>

      {/* Bucket chips */}
      <div
        data-region="ops-customers-buckets"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: u,
        }}
      >
        <BucketChip
          t={t}
          label="All"
          count={OPS_CUSTOMERS.length}
          active={activeBucket === 'all'}
          onSelect={() => setActiveBucket('all')}
          tone="neutral"
        />
        {BUCKET_ORDER.map((b) => {
          const count = bucketed.get(b)?.length ?? 0
          if (count === 0) return null
          return (
            <BucketChip
              key={b}
              t={t}
              label={BUCKET_LABEL[b]}
              count={count}
              active={activeBucket === b}
              onSelect={() => setActiveBucket(b)}
              tone={
                b === 'at-risk' || b === 'stuck'
                  ? 'bad'
                  : b === 'trial-ending'
                    ? 'warn'
                    : b === 'watch'
                      ? 'warn'
                      : 'good'
              }
            />
          )
        })}
      </div>

      {/* Table */}
      <div
        data-region="ops-customers-table"
        style={{
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.md,
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          data-region="ops-customers-table-head"
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1.6fr 0.8fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 110px',
            alignItems: 'center',
            gap: u * 2,
            padding: `${u * 1.5}px ${u * 3}px`,
            background: hexToRgba(t.color.background, 0.6),
            borderBottom: `1px solid ${t.color.border}`,
            color: t.color.muted,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          <div>Business · Owner</div>
          <div>Plan</div>
          <div style={{ textAlign: 'right' }}>Calls 7d</div>
          <div style={{ textAlign: 'right' }}>Escal 7d</div>
          <div style={{ textAlign: 'right' }}>Quality</div>
          <div style={{ textAlign: 'right' }}>Last seen</div>
          <div style={{ textAlign: 'right' }}>Trial</div>
          <div style={{ textAlign: 'right' }}>Health</div>
        </div>

        {/* Rows */}
        {visible.map((c, i) => {
          const isOpen = selectedId === c.id
          return (
            <div key={c.id} data-region="ops-customers-row-wrap">
              <CustomerRow
                t={t}
                customer={c}
                active={isOpen}
                cascadeDelay={i * 25}
                onOpen={() => setSelectedId(isOpen ? null : c.id)}
              />
              <ExpanderPanel
                open={isOpen}
                dataRegion="ops-customers-row-detail-panel"
              >
                {isOpen && (
                  <CustomerDetailInline t={t} customer={c} showToast={showToast} />
                )}
              </ExpanderPanel>
            </div>
          )
        })}
      </div>

      <OpsToastStack t={t} toasts={toasts} />
    </div>
  )
}

// ── Customer detail inline ─────────────────────────────────────────────
// Opens beneath the clicked row via ExpanderPanel. Siblings physically
// reflow with the panel (canonical accordion pattern).

function CustomerDetailInline({
  t,
  customer,
  showToast,
}: {
  t: BrandTokens
  customer: OpsCustomer
  showToast: (label: string, detail?: string) => void
}) {
  const [actedActionIds, setActedActionIds] = useState<Set<string>>(new Set())
  const handleAction = (a: { id: string; label: string }) => {
    setActedActionIds((cur) => {
      const next = new Set(cur)
      next.add(a.id)
      return next
    })
    showToast(actionToast(a.id, customer), actionDetail(a.id, customer))
  }
  const u = t.space.unit
  const recentCalls = OPS_CUSTOMER_CALLS.filter((c) => c.customerId === customer.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5)
  const bucket = bucketFor(customer)
  const reason = reasonForBucket(customer, bucket)

  return (
    <div
      data-region="ops-customers-row-detail"
      data-customer-id={customer.id}
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
        data-region="ops-customers-drawer-meta-strip"
        style={{
          padding: `${u * 2}px ${u * 4}px 0`,
          color: t.color.muted,
          fontFamily: t.type.monoFamily,
          fontSize: 11,
          letterSpacing: 0.3,
        }}
      >
        {customer.id} · signed up{' '}
        {new Date(customer.signedUpAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
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
        {/* Health summary */}
        <section
          data-region="ops-customers-drawer-health"
          style={{
            padding: u * 3,
            background: hexToRgba(
              bucket === 'healthy'
                ? t.color.primary
                : bucket === 'watch' || bucket === 'trial-ending'
                  ? t.color.accent
                  : t.color.error,
              0.12,
            ),
            border: `1px solid ${hexToRgba(
              bucket === 'healthy'
                ? t.color.primary
                : bucket === 'watch' || bucket === 'trial-ending'
                  ? t.color.accent
                  : t.color.error,
              0.4,
            )}`,
            borderRadius: t.radius.md,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: t.color.muted,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: u,
            }}
          >
            {BUCKET_LABEL[bucket]}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{reason}</div>
        </section>

        {/* Quick stats */}
        <section
          data-region="ops-customers-drawer-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: u * 2,
          }}
        >
          <MiniStat t={t} label="Calls 7d" value={customer.callsLast7d.toString()} />
          <MiniStat
            t={t}
            label="Escal 7d"
            value={customer.escalationsLast7d.toString()}
            tone={customer.escalationsLast7d > 5 ? 'warn' : 'neutral'}
          />
          <MiniStat
            t={t}
            label="Quality"
            value={customer.qualityScore?.toString() ?? '—'}
            tone={
              customer.qualityScore == null
                ? 'neutral'
                : customer.qualityScore >= 85
                  ? 'good'
                  : customer.qualityScore >= 70
                    ? 'warn'
                    : 'bad'
            }
          />
          <MiniStat
            t={t}
            label="Last seen"
            value={lastSeenAgo(new Date(customer.lastSeenAt))}
          />
        </section>

        {/* Recent calls */}
        {recentCalls.length > 0 && (
          <section data-region="ops-customers-drawer-calls">
            <div
              style={{
                fontSize: 11,
                color: t.color.muted,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: u * 2,
              }}
            >
              Recent calls
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: u }}>
              {recentCalls.map((c) => (
                <div
                  key={c.id}
                  data-region="ops-customers-drawer-call"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: u * 2,
                    padding: u * 2,
                    background: t.color.surface,
                    border: `1px solid ${t.color.border}`,
                    borderRadius: t.radius.sm,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      color: t.color.muted,
                      fontFamily: t.type.monoFamily,
                      fontSize: 11,
                    }}
                  >
                    {new Date(c.startedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <span style={{ flex: 1, marginLeft: u }}>
                    {c.outcomeClass} · {c.autonomy}
                  </span>
                  <span
                    style={{
                      fontFamily: t.type.monoFamily,
                      fontWeight: 600,
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
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trial days left badge (shown when trial-ending bucket) */}
        {bucket === 'trial-ending' && customer.trialDaysLeft != null && (
          <div
            data-region="ops-customers-drawer-trial-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: u,
              padding: `${u}px ${u * 2}px`,
              background: hexToRgba(t.color.accent, 0.18),
              border: `1px solid ${hexToRgba(t.color.accent, 0.5)}`,
              borderRadius: t.radius.sm,
              color: t.color.accent,
              fontFamily: t.type.monoFamily,
              fontSize: 12,
              fontWeight: 600,
              alignSelf: 'flex-start',
            }}
          >
            {customer.trialDaysLeft}d left on trial
          </div>
        )}

        {/* Suggested actions */}
        <section
          data-region="ops-customers-drawer-actions"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: u * 2,
          }}
        >
          {suggestedActions(customer, bucket).map((a) => {
            const acted = actedActionIds.has(a.id)
            return (
              <BrandedButton
                key={a.label}
                t={t}
                variant={a.tone === 'primary' ? 'primary' : 'ghost'}
                size="sm"
                dataRegion="ops-customers-drawer-action"
                dataAction={a.id}
                disabled={acted}
                onClick={() => handleAction(a)}
              >
                {acted ? `${a.label} ✓` : a.label}
              </BrandedButton>
            )
          })}
        </section>
      </div>
    </div>
  )
}

// ── Helper: action strings ─────────────────────────────────────────────

function actionToast(id: string, _c: OpsCustomer): string {
  switch (id) {
    case 'help-setup': return 'Setup help sent'
    case 'upgrade-nudge': return 'Upgrade nudge queued'
    case 'check-in': return 'Check-in scheduled'
    case 'tune-agent': return 'Tuning session opened'
    case 'view-calls': return 'Filtered calls by customer'
    default: return 'Action queued'
  }
}

function actionDetail(id: string, c: OpsCustomer): string | undefined {
  switch (id) {
    case 'help-setup': return `Email drafted for ${c.ownerName} with forwarding setup steps.`
    case 'upgrade-nudge': return `Owner will see an in-app nudge on next sign-in.`
    case 'check-in': return `Added to your tasks for tomorrow morning.`
    case 'tune-agent': return `Opens the prompt-tuning surface for ${c.business}.`
    case 'view-calls': return `Calls tab will filter to ${c.business}.`
    default: return undefined
  }
}

function reasonForBucket(c: OpsCustomer, b: HealthBucket): string {
  if (b === 'stuck') return 'Signed up but no first call yet. Forwarding likely not configured.'
  if (b === 'trial-ending') return `${c.trialDaysLeft} day${c.trialDaysLeft === 1 ? '' : 's'} left on trial. ${c.callsLast7d > 0 ? 'Engaged — good upgrade candidate.' : 'Low engagement — needs a nudge.'}`
  if (b === 'at-risk') {
    if (c.callsLast7d < 10 && c.plan !== 'trial') {
      return `Call volume dropped sharply (${c.callsLast7d} calls in trailing 7 days). Worth a check-in this week.`
    }
    if (c.qualityScore != null && c.qualityScore < 70) {
      return `Quality below 70 (${c.qualityScore}) — the agent's struggling on this account. Review escalations.`
    }
    return 'Multiple risk signals. Worth a check-in.'
  }
  if (b === 'watch') return `Quality is in watch range (${c.qualityScore}). Trending the wrong way; surface in eval queue.`
  return 'Healthy. Calls steady, quality good, no escalation spikes.'
}

type SuggestedAction = { id: string; label: string; tone: 'primary' | 'ghost' }

function suggestedActions(c: OpsCustomer, b: HealthBucket): SuggestedAction[] {
  const actions: SuggestedAction[] = [
    { id: 'view-calls', label: 'View all calls', tone: 'ghost' },
  ]
  if (b === 'stuck') actions.unshift({ id: 'help-setup', label: 'Help set up forwarding', tone: 'primary' })
  if (b === 'trial-ending') actions.unshift({ id: 'upgrade-nudge', label: 'Send upgrade nudge', tone: 'primary' })
  if (b === 'at-risk') actions.unshift({ id: 'check-in', label: 'Schedule a check-in', tone: 'primary' })
  if (c.escalationsLast7d > 5) actions.push({ id: 'tune-agent', label: 'Tune agent prompt', tone: 'ghost' })
  return actions
}

// ── Subcomponents ──────────────────────────────────────────────────────

function MiniStat({
  t,
  label,
  value,
  tone,
}: {
  t: BrandTokens
  label: string
  value: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const u = t.space.unit
  const color =
    tone === 'good'
      ? t.color.primary
      : tone === 'warn'
        ? t.color.accent
        : tone === 'bad'
          ? t.color.error
          : t.color.foreground
  return (
    <div
      data-region="ops-customers-drawer-ministat"
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
          letterSpacing: 0.3,
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

function BucketChip({
  t,
  label,
  count,
  active,
  onSelect,
  tone,
}: {
  t: BrandTokens
  label: string
  count: number
  active: boolean
  onSelect: () => void
  tone: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const accent =
    tone === 'good'
      ? t.color.primary
      : tone === 'warn'
        ? t.color.accent
        : tone === 'bad'
          ? t.color.error
          : t.color.muted
  const { pressStyle, pressHandlers } = useGlassPress(t, {
    skipDepress: true,
    pressColor: accent,
  })
  return (
    <button
      type="button"
      data-region="ops-customers-bucket-chip"
      data-active={active ? 'true' : 'false'}
      data-press="true"
      onClick={onSelect}
      {...pressHandlers}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        padding: '5px 12px',
        width: 144,
        borderRadius: 999,
        background: active ? hexToRgba(accent, 0.22) : 'transparent',
        color: active ? t.color.foreground : t.color.muted,
        border: `1px solid ${active ? accent : t.color.border}`,
        fontFamily: t.type.bodyFamily,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        transition: 'background 160ms ease, color 160ms ease, box-shadow 220ms var(--glass-ease)',
        ...pressStyle,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontFamily: t.type.monoFamily,
          fontSize: 11,
          color: active ? t.color.foreground : t.color.muted,
        }}
      >
        {count}
      </span>
    </button>
  )
}

function CustomerRow({
  t,
  customer,
  active,
  cascadeDelay,
  onOpen,
}: {
  t: BrandTokens
  customer: OpsCustomer
  active: boolean
  cascadeDelay: number
  onOpen: () => void
}) {
  const u = t.space.unit
  const bucket = bucketFor(customer)
  const healthColor =
    bucket === 'healthy'
      ? t.color.primary
      : bucket === 'watch' || bucket === 'trial-ending'
        ? t.color.accent
        : t.color.error
  const qualityColor =
    customer.qualityScore == null
      ? t.color.muted
      : customer.qualityScore >= 85
        ? t.color.primary
        : customer.qualityScore >= 70
          ? t.color.accent
          : t.color.error

  // Trend arrow for calls_7d vs calls_7d_prev
  const trendUp = customer.callsLast7d >= customer.callsLast7dPrev
  const trendArrow = customer.callsLast7dPrev === 0
    ? null
    : trendUp ? '↑' : '↓'
  const trendColor = trendUp ? t.color.primary : t.color.error

  const { pressStyle, pressHandlers } = useGlassPress(t, { skipDepress: true })
  return (
    <button
      type="button"
      data-region="ops-customers-row"
      data-customer-id={customer.id}
      data-health-bucket={bucket}
      data-press="true"
      onClick={onOpen}
      {...pressHandlers}
      style={{
        display: 'grid',
        gridTemplateColumns:
          '1.6fr 0.8fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 110px',
        alignItems: 'center',
        gap: u * 2,
        padding: `${u * 2}px ${u * 3}px`,
        background: active ? hexToRgba(t.color.primary, 0.08) : 'transparent',
        border: 'none',
        borderTop: `1px solid ${t.color.border}`,
        borderLeft: `3px solid ${healthColor}`,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
        fontSize: 13,
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        opacity: 0,
        animation: `cma-cascade-in 220ms var(--motion-easing-enter, ease-out) ${cascadeDelay}ms forwards`,
        transition: 'background 160ms ease, box-shadow 220ms var(--glass-ease)',
        ...pressStyle,
      }}
    >
      {/* Business + owner */}
      <div>
        <div style={{ fontWeight: 600 }}>{customer.business}</div>
        <div style={{ color: t.color.muted, fontSize: 11, marginTop: 2 }}>
          {customer.ownerName}
        </div>
      </div>

      {/* Plan badge */}
      <div>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 0',
            width: 64,
            textAlign: 'center',
            borderRadius: 999,
            background:
              customer.plan === 'pro'
                ? hexToRgba(t.color.primary, 0.22)
                : customer.plan === 'team'
                  ? hexToRgba(t.color.primary, 0.14)
                  : customer.plan === 'trial'
                    ? hexToRgba(t.color.accent, 0.22)
                    : 'transparent',
            color: t.color.foreground,
            fontSize: 11,
            fontWeight: 600,
            border: `1px solid ${customer.plan === 'trial' ? t.color.accent : t.color.border}`,
          }}
        >
          {PLAN_LABEL[customer.plan]}
        </span>
      </div>

      {/* Calls 7d + trend arrow */}
      <div
        style={{
          fontFamily: t.type.monoFamily,
          fontSize: 13,
          textAlign: 'right',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 3,
        }}
      >
        <span>{customer.callsLast7d}</span>
        {trendArrow && (
          <span
            data-region="ops-customers-row-trend"
            data-trend={trendUp ? 'up' : 'down'}
            style={{ color: trendColor, fontSize: 11 }}
          >
            {trendArrow}
          </span>
        )}
      </div>

      {/* Escalations 7d */}
      <div
        style={{
          fontFamily: t.type.monoFamily,
          fontSize: 13,
          textAlign: 'right',
          color: customer.escalationsLast7d > 5 ? t.color.accent : t.color.foreground,
        }}
      >
        {customer.escalationsLast7d}
      </div>

      {/* Quality score */}
      <div
        style={{
          fontFamily: t.type.monoFamily,
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'right',
          color: qualityColor,
        }}
      >
        {customer.qualityScore ?? '—'}
      </div>

      {/* Last seen */}
      <div
        style={{
          fontFamily: t.type.monoFamily,
          fontSize: 11,
          color: t.color.muted,
          textAlign: 'right',
        }}
      >
        {lastSeenAgo(new Date(customer.lastSeenAt))}
      </div>

      {/* Trial days left */}
      <div
        style={{
          fontFamily: t.type.monoFamily,
          fontSize: 11,
          color:
            customer.trialDaysLeft != null && customer.trialDaysLeft <= 5
              ? t.color.accent
              : t.color.muted,
          textAlign: 'right',
        }}
      >
        {customer.trialDaysLeft != null ? `${customer.trialDaysLeft}d` : '—'}
      </div>

      {/* Health badge */}
      <div style={{ textAlign: 'right' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 0',
            width: 96,
            textAlign: 'center',
            borderRadius: 999,
            background: hexToRgba(healthColor, 0.18),
            color: healthColor,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          {BUCKET_LABEL[bucket]}
        </span>
      </div>
    </button>
  )
}

function lastSeenAgo(date: Date): string {
  const ms = Date.now() - date.getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}
