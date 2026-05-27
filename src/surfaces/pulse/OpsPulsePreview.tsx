import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import { useGlassPress } from '../../lib/glass/useGlassPress'
import { Icon } from '../../components/shared/Icon'
import {
  OPS_ALERTS,
  OPS_PULSE,
  OPS_SINCE_LAST_VISIT,
  type OpsAlert,
  type OpsPulseRollup,
  type OpsSinceLastVisit,
} from '../../data/opsFixture'
import { useOpsClient } from '../../lib/api/opsClient'

// OpsPulsePreview — the morning check surface.
//
// Single screen. Hierarchy:
// 1. Since-last-visit strip
// 2. Heading row (Today + live badge)
// 3. Stat tiles (4)
// 4. 7-day sparklines strip (4)
// 5. Open alerts list
//
// Voice is matter-of-fact. Numbers are plain. No marketing copy.
// Per contract f9ee1622: NEVER say "Rue" — always "the agent".
//
// Data wiring: useQuery with queryKey ['ops', 'pulse'] calls real backend.
// Fixture is used as initialData so there's no loading flash on first render.
// Backend endpoints:
//   GET /admin/ops/pulse        -> OpsPulseRollup
//   GET /admin/ops/alerts       -> OpsAlert[]

type PulseData = {
  pulse: OpsPulseRollup
  sinceLastVisit: OpsSinceLastVisit
  alerts: OpsAlert[]
}

export type OpsPulsePreviewProps = {
  t: BrandTokens
}

export function OpsPulsePreview({ t }: OpsPulsePreviewProps) {
  const u = t.space.unit
  const client = useOpsClient()

  const { data } = useQuery({
    queryKey: ['ops', 'pulse'],
    queryFn: async (): Promise<PulseData> => {
      const [pulse, alerts] = await Promise.all([
        client.get<OpsPulseRollup>('/admin/ops/pulse').catch(() => OPS_PULSE),
        client.get<OpsAlert[]>('/admin/ops/alerts?resolved=false').catch(() => OPS_ALERTS),
      ])
      return { pulse, sinceLastVisit: OPS_SINCE_LAST_VISIT, alerts }
    },
    // Fixture as initialData — no loading state on first render.
    initialData: {
      pulse: OPS_PULSE,
      sinceLastVisit: OPS_SINCE_LAST_VISIT,
      alerts: OPS_ALERTS,
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(
    () => new Set(),
  )

  const openAlerts = data.alerts.filter(
    (a) => !a.resolved && !dismissedAlertIds.has(a.id),
  )

  return (
    <div
      data-page="ops-pulse"
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
      {/* 1. Since-last-visit strip */}
      <SinceLastVisitStrip
        t={t}
        sinceLastVisit={data.sinceLastVisit}
        alertsCount={openAlerts.length}
      />

      {/* 2. Heading row */}
      <div
        data-region="ops-pulse-heading"
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: u * 4,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: t.type.headingFamily,
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: '-0.015em',
              margin: 0,
            }}
          >
            Today
          </h1>
          <p
            style={{
              margin: `${u}px 0 0 0`,
              color: t.color.muted,
              fontSize: 13,
            }}
          >
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}{' '}
            · live as of{' '}
            {new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
        <LiveBadge t={t} count={data.pulse.liveCalls} />
      </div>

      {/* 3. Stat tiles */}
      <div
        data-region="ops-pulse-tiles"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: u * 3,
        }}
      >
        <StatTile
          t={t}
          label="Calls today"
          value={data.pulse.todayCalls.toString()}
          delta="+18% vs yest"
          deltaTone="positive"
          cascadeDelay={0}
          drillHint="Open all calls"
        />
        <StatTile
          t={t}
          label="Quality avg"
          value={`${data.pulse.todayQualityAvg}`}
          unit="/ 100"
          delta="-2 vs yest"
          deltaTone="negative"
          cascadeDelay={60}
          drillHint="Open eval queue"
        />
        <StatTile
          t={t}
          label="Escalations"
          value={data.pulse.todayEscalations.toString()}
          delta={`${((data.pulse.todayEscalations / data.pulse.todayCalls) * 100).toFixed(1)}% rate`}
          deltaTone="neutral"
          cascadeDelay={120}
          drillHint="Filter escalations"
        />
        <StatTile
          t={t}
          label="Revenue today"
          value={`$${data.pulse.todayRevenueDollars}`}
          delta="+$71 vs yest"
          deltaTone="positive"
          cascadeDelay={180}
          drillHint="Open costs"
        />
      </div>

      {/* 4. 7-day sparklines */}
      <div
        data-region="ops-pulse-sparks"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: u * 3,
          padding: u * 4,
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.md,
        }}
      >
        <Sparkline
          t={t}
          label="7-day calls"
          data={data.pulse.calls7d}
          color={t.color.primary}
          cascadeDelay={0}
        />
        <Sparkline
          t={t}
          label="7-day quality"
          data={data.pulse.quality7d}
          color={t.color.accent}
          cascadeDelay={80}
        />
        <Sparkline
          t={t}
          label="7-day escalations"
          data={data.pulse.escalations7d}
          color={t.color.error}
          cascadeDelay={160}
        />
        <Sparkline
          t={t}
          label="7-day revenue"
          data={data.pulse.revenue7d}
          color={t.color.primary}
          cascadeDelay={240}
        />
      </div>

      {/* 5. Open alerts */}
      <div data-region="ops-pulse-alerts">
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: u * 3,
          }}
        >
          <h2
            style={{
              fontFamily: t.type.headingFamily,
              fontWeight: 600,
              fontSize: 18,
              margin: 0,
            }}
          >
            Open alerts
          </h2>
          <span
            style={{
              color: t.color.muted,
              fontSize: 12,
              fontFamily: t.type.monoFamily,
            }}
          >
            {openAlerts.length} unresolved
          </span>
        </div>
        {openAlerts.length === 0 ? (
          <div
            data-region="ops-pulse-alerts-empty"
            style={{
              padding: u * 4,
              color: t.color.muted,
              fontSize: 13,
              background: t.color.surface,
              border: `1px solid ${t.color.border}`,
              borderRadius: t.radius.md,
              textAlign: 'center',
            }}
          >
            Nothing on fire. Carry on.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: u * 2,
            }}
          >
            {openAlerts.map((alert, i) => (
              <AlertRow
                key={alert.id}
                t={t}
                alert={alert}
                cascadeDelay={i * 60}
                onAction={() => {
                  setDismissedAlertIds((cur) => {
                    const next = new Set(cur)
                    next.add(alert.id)
                    return next
                  })
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Live badge ──────────────────────────────────────────────────────────
function LiveBadge({ t, count }: { t: BrandTokens; count: number }) {
  const live = count > 0
  return (
    <div
      data-region="ops-pulse-live-badge"
      data-live={live ? 'true' : 'false'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: live
          ? hexToRgba(t.color.primary, 0.18)
          : t.color.surface,
        border: `1px solid ${live ? hexToRgba(t.color.primary, 0.5) : t.color.border}`,
        color: t.color.foreground,
        fontSize: 12,
        fontFamily: t.type.bodyFamily,
        fontWeight: 600,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: live ? t.color.primary : t.color.muted,
          animation: live
            ? 'cma-agent-glow 1600ms ease-in-out infinite'
            : undefined,
        }}
      />
      <span>
        {live
          ? `${count} live ${count === 1 ? 'call' : 'calls'}`
          : 'No live calls'}
      </span>
    </div>
  )
}

// ── Since-last-visit strip ──────────────────────────────────────────────
function SinceLastVisitStrip({
  t,
  sinceLastVisit,
  alertsCount,
}: {
  t: BrandTokens
  sinceLastVisit: OpsSinceLastVisit
  alertsCount: number
}) {
  const u = t.space.unit
  const lastVisitMins = Math.floor(
    (Date.now() - new Date(sinceLastVisit.lastVisitAt).getTime()) / 60000,
  )
  const lastVisitLabel =
    lastVisitMins < 60
      ? `${lastVisitMins} min ago`
      : `${Math.round(lastVisitMins / 60)} hr ago`

  return (
    <div
      data-region="ops-pulse-since-last"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: u * 3,
        padding: `${u * 2}px ${u * 4}px`,
        background: hexToRgba(t.color.primary, 0.1),
        border: `1px solid ${hexToRgba(t.color.primary, 0.3)}`,
        borderRadius: t.radius.md,
      }}
    >
      <span
        style={{
          color: t.color.muted,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        Since you last visited · {lastVisitLabel}
      </span>
      <SinceChip
        t={t}
        dataRegion="ops-pulse-since-calls"
        accent={t.color.primary}
        accentValue={sinceLastVisit.newCalls}
        labelTail="new calls"
      />
      <SinceChip
        t={t}
        dataRegion="ops-pulse-since-alerts"
        accent={alertsCount > 0 ? t.color.error : t.color.primary}
        accentValue={sinceLastVisit.newAlerts}
        labelTail="new alerts"
      />
      <SinceChip
        t={t}
        dataRegion="ops-pulse-since-eval"
        accent={t.color.primary}
        accentValue={sinceLastVisit.newRatings}
        labelTail="rated by team"
      />
      <span style={{ flex: 1 }} />
      <span
        style={{
          color: t.color.muted,
          fontSize: 11,
          fontFamily: t.type.monoFamily,
          letterSpacing: 0.3,
        }}
      >
        Pulse below
      </span>
    </div>
  )
}

function SinceChip({
  t,
  dataRegion,
  accent,
  accentValue,
  labelTail,
  onClick,
}: {
  t: BrandTokens
  dataRegion: string
  accent: string
  accentValue: number
  labelTail: string
  onClick?: () => void
}) {
  const { pressStyle, pressHandlers } = useGlassPress(t, {
    skipDepress: true,
    enabled: !!onClick,
  })
  return (
    <button
      type="button"
      data-region={dataRegion}
      data-press={onClick ? 'true' : undefined}
      onClick={onClick}
      {...pressHandlers}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '4px 10px',
        width: 168,
        background: 'transparent',
        color: t.color.foreground,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.sm,
        fontSize: 12,
        fontFamily: t.type.bodyFamily,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 220ms ease',
        ...pressStyle,
      }}
    >
      <strong style={{ color: accent }}>{accentValue}</strong>
      <span style={{ color: t.color.foreground }}>{labelTail}</span>
    </button>
  )
}

// ── Stat tile ────────────────────────────────────────────────────────────
function StatTile({
  t,
  label,
  value,
  unit,
  delta,
  deltaTone,
  cascadeDelay,
  onClick,
  drillHint,
}: {
  t: BrandTokens
  label: string
  value: string
  unit?: string
  delta: string
  deltaTone: 'positive' | 'negative' | 'neutral'
  cascadeDelay: number
  onClick?: () => void
  drillHint?: string
}) {
  const deltaColor =
    deltaTone === 'positive'
      ? t.color.primary
      : deltaTone === 'negative'
        ? t.color.error
        : t.color.muted
  const Component: 'button' | 'div' = onClick ? 'button' : 'div'
  const { pressStyle, pressHandlers } = useGlassPress(t, { enabled: !!onClick })
  return (
    <Component
      data-region="ops-pulse-tile"
      data-clickable={onClick ? 'true' : 'false'}
      data-press={onClick ? 'true' : undefined}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      {...(onClick ? pressHandlers : {})}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.unit,
        padding: t.space.unit * 4,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        WebkitBackdropFilter:
          'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        boxShadow: 'var(--glass-rim), var(--glass-lift)',
        opacity: 0,
        animation: `cma-cascade-in 320ms var(--motion-easing-enter, ease-out) ${cascadeDelay}ms forwards`,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
        transition:
          'transform 120ms var(--glass-ease), box-shadow 220ms var(--glass-ease)',
        ...(onClick ? pressStyle : {}),
      }}
    >
      <span
        style={{
          color: t.color.muted,
          fontSize: 11,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          fontFamily: t.type.headingFamily,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: '-0.015em',
          color: t.color.foreground,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              fontFamily: t.type.bodyFamily,
              color: t.color.muted,
            }}
          >
            {unit}
          </span>
        )}
      </span>
      <span
        style={{
          color: deltaColor,
          fontSize: 12,
          fontFamily: t.type.monoFamily,
          letterSpacing: 0.2,
        }}
      >
        {delta}
      </span>
      {drillHint && (
        <span
          style={{
            marginTop: 2,
            color: t.color.muted,
            fontSize: 10,
            fontFamily: t.type.monoFamily,
            letterSpacing: 0.3,
          }}
        >
          {drillHint}
        </span>
      )}
    </Component>
  )
}

// ── Sparkline ────────────────────────────────────────────────────────────
function Sparkline({
  t,
  label,
  data,
  color,
  cascadeDelay,
}: {
  t: BrandTokens
  label: string
  data: number[]
  color: string
  cascadeDelay: number
}) {
  const W = 180
  const H = 50
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = Math.max(max - min, 1)
  const pad = 4
  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (W - pad * 2)
      const y = H - pad - ((v - min) / range) * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const lastValue = data[data.length - 1]
  const firstValue = data[0]
  const deltaPct = (((lastValue - firstValue) / firstValue) * 100).toFixed(0)
  const positive = lastValue >= firstValue
  return (
    <div
      data-region="ops-pulse-spark"
      data-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.unit * 1.5,
        opacity: 0,
        animation: `cma-cascade-in 360ms var(--motion-easing-enter, ease-out) ${cascadeDelay}ms forwards`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            color: t.color.muted,
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: positive ? t.color.primary : t.color.error,
            fontFamily: t.type.monoFamily,
            fontSize: 11,
          }}
        >
          {positive ? '+' : ''}
          {deltaPct}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ overflow: 'visible' }}
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          style={{
            strokeDasharray: 500,
            strokeDashoffset: 500,
            animation: `cma-svg-stroke-draw 720ms var(--motion-easing-enter, ease-out) ${cascadeDelay + 80}ms forwards`,
          }}
        />
        <circle
          cx={pad + (W - pad * 2)}
          cy={H - pad - ((lastValue - min) / range) * (H - pad * 2)}
          r={3}
          fill={color}
          style={{
            opacity: 0,
            animation: `cma-cascade-in 240ms ease-out ${cascadeDelay + 600}ms forwards`,
          }}
        />
      </svg>
    </div>
  )
}

// ── Alert row ─────────────────────────────────────────────────────────────
function AlertRow({
  t,
  alert,
  cascadeDelay,
  onAction,
}: {
  t: BrandTokens
  alert: OpsAlert
  cascadeDelay: number
  onAction: () => void
}) {
  const u = t.space.unit
  const severityColor =
    alert.severity === 'urgent'
      ? t.color.error
      : alert.severity === 'warn'
        ? t.color.accent
        : t.color.muted
  const { pressStyle, pressHandlers } = useGlassPress(t, {
    pressColor: severityColor,
  })
  return (
    <button
      type="button"
      data-region="ops-pulse-alert"
      data-alert-id={alert.id}
      data-severity={alert.severity}
      data-press="true"
      onClick={onAction}
      {...pressHandlers}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: u * 3,
        padding: u * 3,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderLeft: `3px solid ${severityColor}`,
        borderRadius: t.radius.md,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
        textAlign: 'left',
        cursor: 'pointer',
        opacity: 0,
        animation: `cma-cascade-in 320ms var(--motion-easing-enter, ease-out) ${cascadeDelay}ms forwards`,
        transition:
          'background var(--motion-duration-fast, 160ms) ease, transform 120ms ease, box-shadow 220ms ease',
        ...pressStyle,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: hexToRgba(severityColor, 0.18),
          color: severityColor,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Icon
          name={alert.severity === 'urgent' ? 'warning' : 'info'}
          size={14}
          color={severityColor}
        />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: t.color.foreground,
            marginBottom: 2,
          }}
        >
          {alert.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: t.color.muted,
            lineHeight: 1.45,
          }}
        >
          {alert.body}
        </div>
        <div
          style={{
            marginTop: u,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
            color: t.color.muted,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          {timeAgo(new Date(alert.raisedAt))}
        </div>
      </div>
    </button>
  )
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
