import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import createGlobe from 'cobe'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import { useGlassPress } from '../../lib/glass/useGlassPress'
import { useOpsToast, OpsToastStack } from '../../components/shared/OpsToast'
import {
  OPS_AI_BURN,
  OPS_ALERTS,
  OPS_CALLS_24H,
  OPS_CUSTOMERS,
  OPS_EVAL_QUEUE,
  OPS_LAST_INCIDENT_AT,
  OPS_LIFETIME,
  OPS_LIVE_EVENTS,
  OPS_MRR,
  OPS_NORTH_STAR,
  OPS_PROVIDERS,
  OPS_PULSE,
  OPS_TRIAL_FUNNEL,
  type OpsAIBurn,
  type OpsAlert,
  type OpsCustomer,
  type OpsEvalQueueItem,
  type OpsFunnelStage,
  type OpsLifetimeStats,
  type OpsLiveEvent,
  type OpsMrrRollup,
  type OpsNorthStar,
  type OpsProviderCategory,
  type OpsProviderHealth,
  type OpsPulseRollup,
} from '../../data/opsFixture'
import { useOpsClient } from '../../lib/api/opsClient'

// OpsMissionPreview — the leave-on war-room dashboard. Single file by
// design: it's one surface, and keeping every cell co-located makes the
// composition obvious at a glance. Mirrors brand-studio's
// OpsMissionPreview.tsx verbatim, with the cma-rue-* → cma-agent-*
// keyframe rename + Vite-native imports + useQuery fixture wrap.
//
// Layout (1440×900, no scroll):
//   • StatusBar  — live clock + lifetime tally + uptime + 2FA + live ●
//   • HeroStrip  — 4 huge numbers (Today / Calls / MRR / Quality)
//   • NorthStar + HourlyHeat row
//   • Main grid — LiveWire (globe + EventStream) | AgentStack + Wins
//   • Bottom row — AIBurn | Trial→Paying funnel | NeedsYou
//   • MissionLine slogan at the bottom
//   • SoundToggle bottom-right
//
// Data wiring: useQuery wraps every fixture so the Mission Control
// query graph is in place from day one. Replace each fetchX() body with
// a real fetch when the backend ships.
//
// Per contract f9ee1622: NEVER say "Rue" — always "the agent".

const CATEGORY_LABEL: Record<OpsProviderCategory, string> = {
  telephony: 'Telephony',
  stt: 'Speech-to-Text',
  llm: 'LLM',
  tts: 'Text-to-Speech',
  app: 'App / Hosting',
  auth: 'Auth',
  billing: 'Billing',
}

const CATEGORY_ORDER: OpsProviderCategory[] = [
  'telephony',
  'stt',
  'llm',
  'tts',
  'app',
  'auth',
  'billing',
]

// ── Data shape ───────────────────────────────────────────────────────
// Every Mission Control endpoint is wrapped in a useQuery so the cache,
// background refresh, and devtools wiring are in place from the start.
// Real endpoints are called in parallel; fixture data is used as fallback
// and initialData so there's no loading flash on first render.
type MissionData = {
  providers: OpsProviderHealth[]
  events: OpsLiveEvent[]
  lifetime: OpsLifetimeStats
  mrr: OpsMrrRollup
  pulse: OpsPulseRollup
  northStar: OpsNorthStar
  burn: OpsAIBurn
  funnel: OpsFunnelStage[]
  hourly: number[]
  lastIncidentAt: string
  alerts: OpsAlert[]
  customers: OpsCustomer[]
  evalQueue: OpsEvalQueueItem[]
}

const SOUND_PREF_KEY = 'ops-mission-sound-on'

export type OpsMissionPreviewProps = {
  t: BrandTokens
}

export function OpsMissionPreview({ t }: OpsMissionPreviewProps) {
  const u = t.space.unit
  const { toasts, show: showToast } = useOpsToast()
  const client = useOpsClient()

  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(SOUND_PREF_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(SOUND_PREF_KEY, soundOn ? '1' : '0')
    } catch {
      /* localStorage may be unavailable (private mode) */
    }
  }, [soundOn])

  const [providerOverrides, setProviderOverrides] = useState<Map<string, string>>(
    new Map(),
  )
  const [pendingSwitch, setPendingSwitch] = useState<{
    category: OpsProviderCategory
    fromId: string
    toId: string
  } | null>(null)
  const [lastSwitch, setLastSwitch] = useState<{
    category: OpsProviderCategory
    fromId: string
    toId: string
  } | null>(null)

  const { data } = useQuery({
    queryKey: ['ops', 'mission'],
    queryFn: async (): Promise<MissionData> => {
      // Fire all endpoint calls in parallel; each falls back to fixture on error.
      const [
        providers,
        events,
        lifetime,
        mrr,
        pulse,
        northStar,
        burn,
        funnel,
        hourly,
        lastIncidentRes,
        alerts,
        customers,
        evalQueue,
      ] = await Promise.all([
        client.get<OpsProviderHealth[]>('/admin/ops/providers').catch(() => OPS_PROVIDERS),
        client.get<OpsLiveEvent[]>('/admin/ops/events').catch(() => OPS_LIVE_EVENTS),
        client.get<OpsLifetimeStats>('/admin/ops/lifetime').catch(() => OPS_LIFETIME),
        client.get<OpsMrrRollup>('/admin/ops/mrr').catch(() => OPS_MRR),
        client.get<OpsPulseRollup>('/admin/ops/pulse').catch(() => OPS_PULSE),
        client.get<OpsNorthStar>('/admin/ops/north-star').catch(() => OPS_NORTH_STAR),
        client.get<OpsAIBurn>('/admin/ops/burn').catch(() => OPS_AI_BURN),
        client.get<OpsFunnelStage[]>('/admin/ops/funnel').catch(() => OPS_TRIAL_FUNNEL),
        client.get<number[]>('/admin/ops/calls/hourly').catch(() => OPS_CALLS_24H),
        client.get<{ at: string | null }>('/admin/ops/incidents/last').catch(() => ({ at: OPS_LAST_INCIDENT_AT })),
        client.get<OpsAlert[]>('/admin/ops/alerts?resolved=false').catch(() => OPS_ALERTS),
        client.get<OpsCustomer[]>('/admin/ops/customers').catch(() => OPS_CUSTOMERS),
        client.get<OpsEvalQueueItem[]>('/admin/ops/eval/queue').catch(() => OPS_EVAL_QUEUE),
      ])
      return {
        providers: Array.isArray(providers) ? providers : OPS_PROVIDERS,
        events: Array.isArray(events) ? events : OPS_LIVE_EVENTS,
        lifetime: lifetime ?? OPS_LIFETIME,
        mrr: mrr ?? OPS_MRR,
        pulse: pulse ?? OPS_PULSE,
        northStar: northStar ?? OPS_NORTH_STAR,
        burn: burn ?? OPS_AI_BURN,
        funnel: Array.isArray(funnel) ? funnel : OPS_TRIAL_FUNNEL,
        hourly: Array.isArray(hourly) ? hourly : OPS_CALLS_24H,
        lastIncidentAt: lastIncidentRes?.at ?? OPS_LAST_INCIDENT_AT,
        alerts: Array.isArray(alerts) ? alerts : OPS_ALERTS,
        customers: Array.isArray(customers) ? customers : OPS_CUSTOMERS,
        evalQueue: Array.isArray(evalQueue) ? evalQueue : OPS_EVAL_QUEUE,
      }
    },
    initialData: {
      providers: OPS_PROVIDERS,
      events: OPS_LIVE_EVENTS,
      lifetime: OPS_LIFETIME,
      mrr: OPS_MRR,
      pulse: OPS_PULSE,
      northStar: OPS_NORTH_STAR,
      burn: OPS_AI_BURN,
      funnel: OPS_TRIAL_FUNNEL,
      hourly: OPS_CALLS_24H,
      lastIncidentAt: OPS_LAST_INCIDENT_AT,
      alerts: OPS_ALERTS,
      customers: OPS_CUSTOMERS,
      evalQueue: OPS_EVAL_QUEUE,
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const openAlerts = data.alerts.filter((a) => !a.resolved)
  const atRiskCustomers = data.customers.filter((c) => {
    if (!c.firstCallAt) return true
    if (c.qualityScore != null && c.qualityScore < 70) return true
    if (c.callsLast7d < 10 && c.plan !== 'trial') return true
    return false
  })
  const evalCount = data.evalQueue.length

  // Group providers by category for the dashboard render.
  const providersByCategory = useMemo(() => {
    const map = new Map<OpsProviderCategory, OpsProviderHealth[]>()
    for (const p of data.providers) {
      const arr = map.get(p.category) ?? []
      arr.push(p)
      map.set(p.category, arr)
    }
    return map
  }, [data.providers])

  function openSwitchModal(
    category: OpsProviderCategory,
    fromId: string,
    toId: string,
  ) {
    setPendingSwitch({ category, fromId, toId })
  }

  function commitSwitchPrimary(reason: string) {
    if (!pendingSwitch) return
    // TODO(backend-wireup): POST /admin/providers/switch-primary
    // with { category, fromId, toId, reason } body. The fixture short-
    // circuits the request and updates local override state directly.
    const { category, fromId, toId } = pendingSwitch
    setProviderOverrides((cur) => {
      const next = new Map(cur)
      next.set(category, toId)
      return next
    })
    setLastSwitch({ category, fromId, toId })
    const from = data.providers.find((p) => p.id === fromId)
    const to = data.providers.find((p) => p.id === toId)
    showToast(
      `Switched to ${to?.displayName ?? toId}`,
      `${from?.displayName ?? fromId} → ${to?.displayName ?? toId}. Reason logged: "${reason.slice(0, 40)}${reason.length > 40 ? '…' : ''}". Revert available.`,
    )
    setPendingSwitch(null)
  }

  function revertLastSwitch() {
    if (!lastSwitch) return
    const { category, fromId, toId } = lastSwitch
    setProviderOverrides((cur) => {
      const next = new Map(cur)
      next.delete(category)
      return next
    })
    const from = data.providers.find((p) => p.id === fromId)
    const to = data.providers.find((p) => p.id === toId)
    showToast(
      'Reverted',
      `${to?.displayName ?? toId} → ${from?.displayName ?? fromId}. Original primary restored.`,
    )
    setLastSwitch(null)
  }

  return (
    <div
      data-page="ops-mission"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 760,
        background: t.color.background,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
        overflow: 'hidden',
      }}
    >
      {/* ── Backdrop · subtle dot-matrix + center radial glow ─────────
       * War-room ambience without being noisy. The dot grid is masked
       * to fade at the edges so it doesn't fight the panels. */}
      <div
        aria-hidden="true"
        data-region="ops-mission-backdrop-dots"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `radial-gradient(${hexToRgba(t.color.foreground, 0.06)} 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
          maskImage:
            'radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 80%)',
        }}
      />
      <div
        aria-hidden="true"
        data-region="ops-mission-backdrop-glow"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 60% 50% at 50% 25%, ${hexToRgba(t.color.primary, 0.08)} 0%, transparent 70%)`,
        }}
      />

      {/* War-room body. Top→bottom: StatusBar · HeroStrip · NorthStar+
       * HourlyHeat · MainGrid (LiveWire | AgentStack+Wins) · Bottom row
       * (AIBurn | Funnel | NeedsYou) · MissionLine slogan. */}
      <div
        data-region="ops-mission-body"
        style={{
          position: 'relative',
          padding: `${u * 2}px ${u * 2.5}px ${u * 2}px ${u * 2.5}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: u * 1.5,
        }}
      >
        <StatusBar t={t} lifetime={data.lifetime} lastIncidentAt={data.lastIncidentAt} pulse={data.pulse} />
        <HeroStrip t={t} mrr={data.mrr} pulse={data.pulse} />

        <div
          data-region="ops-mission-row-northstar-heat"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: u * 1.5,
          }}
        >
          <NorthStarBar t={t} ns={data.northStar} />
          <HourlyHeatStrip t={t} hourly={data.hourly} />
        </div>

        <div
          data-region="ops-mission-main-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
            gap: u * 1.5,
            alignItems: 'stretch',
            // Fixed height — sized so the globe reads big AND the right
            // column (Agent Stack + Recent Wins) fits without spilling
            // into the row below at 1440×900.
            height: 408,
          }}
        >
          <LiveWire t={t} events={data.events} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: u * 1.5,
              minWidth: 0,
            }}
          >
            <CompactAgentStack
              t={t}
              providersByCategory={providersByCategory}
              providerOverrides={providerOverrides}
              onSwitchPrimary={openSwitchModal}
            />
            <RecentWinsFeed t={t} events={data.events} />
          </div>
        </div>

        <div
          data-region="ops-mission-row-bottom"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: u * 1.5,
          }}
        >
          <AIBurnTile t={t} burn={data.burn} />
          <TrialToPayingFunnel t={t} stages={data.funnel} />
          <AlertsStrip
            t={t}
            evalCount={evalCount}
            evalQueue={data.evalQueue}
            atRiskCount={atRiskCustomers.length}
            atRiskNames={atRiskCustomers.slice(0, 2).map((c) => c.ownerName)}
            openAlerts={openAlerts.slice(0, 3)}
          />
        </div>

        <MissionLine t={t} />

        {lastSwitch && (
          <div
            data-region="ops-mission-revert-strip"
            style={{
              position: 'absolute',
              bottom: t.space.unit * 2.5,
              left: t.space.unit * 3,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              background: hexToRgba(t.color.surface, 0.92),
              border: `1px solid ${t.color.border}`,
              borderRadius: t.radius.sm,
              fontSize: 11,
              color: t.color.muted,
            }}
          >
            <span>Primary switched.</span>
            <button
              type="button"
              data-region="ops-mission-revert-button"
              onClick={revertLastSwitch}
              style={{
                background: 'transparent',
                border: 'none',
                color: t.color.primary,
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 11,
                textDecoration: 'underline',
              }}
            >
              Revert
            </button>
          </div>
        )}
      </div>

      {/* Sound toggle — pinned bottom-right of the layout */}
      <SoundToggle
        t={t}
        on={soundOn}
        onToggle={() => {
          setSoundOn((v) => {
            const next = !v
            if (next) playChime(t, 'quiet')
            return next
          })
        }}
      />

      {pendingSwitch && (
        <SwitchPrimaryModal
          t={t}
          pending={pendingSwitch}
          providers={data.providers}
          onCancel={() => setPendingSwitch(null)}
          onConfirm={commitSwitchPrimary}
        />
      )}

      <OpsToastStack t={t} toasts={toasts} />
    </div>
  )
}

// ─── StatusBar — date · clock · lifetime · uptime · slogan ────────────
function StatusBar({
  t,
  lifetime,
  lastIncidentAt,
  pulse,
}: {
  t: BrandTokens
  lifetime: OpsLifetimeStats
  lastIncidentAt: string
  pulse: OpsPulseRollup
}) {
  const u = t.space.unit
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false })
  const yearStart = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor(
    (now.getTime() - yearStart.getTime()) / 86_400_000,
  )
  const incidentMs = now.getTime() - new Date(lastIncidentAt).getTime()
  const hrs = Math.floor(incidentMs / 3_600_000)
  const mins = Math.floor((incidentMs % 3_600_000) / 60_000)
  const secs = Math.floor((incidentMs % 60_000) / 1000)
  const uptime = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return (
    <div
      data-region="ops-mission-status-bar"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto 1fr auto auto',
        alignItems: 'center',
        gap: u * 2,
        padding: `${u}px ${u * 1.5}px`,
        background: hexToRgba(t.color.foreground, 0.02),
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.sm,
        fontFamily: t.type.monoFamily,
        fontSize: 10,
        color: t.color.muted,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
      }}
    >
      <span style={{ display: 'inline-flex', gap: u, alignItems: 'baseline' }}>
        <span style={{ color: t.color.foreground }}>Day {dayOfYear}</span>
        <span aria-hidden="true">·</span>
        <span
          data-region="ops-mission-clock"
          style={{ color: t.color.foreground, fontVariantNumeric: 'tabular-nums' }}
        >
          {timeStr}
        </span>
      </span>
      <span style={{ display: 'inline-flex', gap: u, alignItems: 'baseline' }}>
        <span>
          <span style={{ color: t.color.foreground, fontVariantNumeric: 'tabular-nums' }}>
            {lifetime.callsHandled.toLocaleString()}
          </span>{' '}
          calls handled
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <span style={{ color: t.color.foreground }}>{lifetime.businessesServed}</span>{' '}
          businesses
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <span style={{ color: t.color.foreground }}>{lifetime.hoursReturned.toLocaleString()}</span>{' '}
          hours returned
        </span>
      </span>
      <span
        style={{
          justifySelf: 'center',
          color: t.color.foreground,
          letterSpacing: 1.4,
          fontWeight: 600,
          fontSize: 11,
        }}
      >
        Mission Control
      </span>
      <span style={{ display: 'inline-flex', gap: u, alignItems: 'baseline' }}>
        <span>Last incident</span>
        <span style={{ color: t.color.primary, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {uptime}
        </span>
      </span>
      <span style={{ display: 'inline-flex', gap: u, alignItems: 'baseline' }}>
        <span>Session 30:00</span>
        <span aria-hidden="true">·</span>
        <span style={{ color: t.color.primary }}>2FA ✓</span>
        <span aria-hidden="true">·</span>
        <span
          style={{
            color: pulse.liveCalls > 0 ? t.color.primary : t.color.muted,
          }}
        >
          ● {pulse.liveCalls} live
        </span>
      </span>
    </div>
  )
}

// ─── HeroStrip — 4 huge numbers across the top ────────────────────────
function HeroStrip({
  t,
  mrr,
  pulse,
}: {
  t: BrandTokens
  mrr: OpsMrrRollup
  pulse: OpsPulseRollup
}) {
  const u = t.space.unit
  const escalRate = (
    (pulse.todayEscalations / pulse.todayCalls) *
    100
  ).toFixed(1)
  return (
    <div
      data-region="ops-mission-hero"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: u * 2,
      }}
    >
      <HeroStatCard
        t={t}
        label="Today"
        value={`$${mrr.todayRevenueDollars}`}
        valueAccent={t.color.primary}
        delta={`↑ +$${mrr.todayRevenueDeltaDollars} vs yest`}
        deltaTone="up"
        subline={`${pulse.todayBookings} booked · ${escalRate}% escalated`}
        sparkData={mrr.revenue7d}
        sparkColor={t.color.primary}
        glow
      />
      <HeroStatCard
        t={t}
        label="Calls"
        value={pulse.todayCalls.toString()}
        valueAccent={t.color.foreground}
        delta={`● ${pulse.liveCalls} live now`}
        deltaTone="live"
        subline={`${pulse.todayEscalations} escalated · ${pulse.todayCalls - pulse.todayEscalations} handled by agent`}
      />
      <HeroStatCard
        t={t}
        label="MRR"
        value={`$${(mrr.mrrDollars / 1000).toFixed(1)}k`}
        valueAccent={t.color.foreground}
        delta={`↑ +$${mrr.mrrDeltaDollars} this week`}
        deltaTone="up"
        subline={`${mrr.payingCount} paying · ${mrr.trialCount} on trial`}
        sparkData={mrr.revenue7d}
        sparkColor={t.color.muted}
      />
      <HeroStatCard
        t={t}
        label="Quality"
        value={pulse.todayQualityAvg.toString()}
        valueSuffix="/ 100"
        valueAccent={
          pulse.todayQualityAvg >= 85
            ? t.color.primary
            : pulse.todayQualityAvg >= 70
              ? t.color.accent
              : t.color.error
        }
        delta="↓ −2 vs yest"
        deltaTone="down"
        subline={`${escalRate}% escalation rate · 4.6★ avg CSAT`}
        sparkData={pulse.quality7d}
        sparkColor={t.color.accent}
      />
    </div>
  )
}

function HeroStatCard({
  t,
  label,
  value,
  valueSuffix,
  valueAccent,
  delta,
  deltaTone,
  subline,
  sparkData,
  sparkColor,
  glow = false,
}: {
  t: BrandTokens
  label: string
  value: string
  valueSuffix?: string
  valueAccent: string
  delta: string
  deltaTone: 'up' | 'down' | 'live' | 'flat'
  subline: string
  sparkData?: number[]
  sparkColor?: string
  glow?: boolean
}) {
  const u = t.space.unit
  const deltaColor =
    deltaTone === 'up'
      ? t.color.primary
      : deltaTone === 'down'
        ? t.color.error
        : deltaTone === 'live'
          ? t.color.primary
          : t.color.muted
  return (
    <section
      data-region="ops-mission-hero-card"
      data-label={label.toLowerCase()}
      style={{
        position: 'relative',
        background: hexToRgba(t.color.surface, 0.85),
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 1.5}px ${u * 2}px ${u * 1.5}px ${u * 2}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 0.5,
        minHeight: 124,
        overflow: 'hidden',
        boxShadow: glow
          ? `inset 0 0 40px ${hexToRgba(t.color.primary, 0.08)}`
          : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: u,
        }}
      >
        <span
          style={{
            color: t.color.muted,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: t.color.muted,
            fontSize: 10,
            letterSpacing: 0.3,
            textAlign: 'right',
            maxWidth: '65%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subline}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: u }}>
        <span
          style={{
            fontFamily: t.type.headingFamily,
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: valueAccent,
            textShadow: glow
              ? `0 0 30px ${hexToRgba(t.color.primary, 0.35)}`
              : undefined,
          }}
        >
          {value}
        </span>
        {valueSuffix && (
          <span
            style={{
              color: t.color.muted,
              fontSize: 16,
              fontFamily: t.type.bodyFamily,
            }}
          >
            {valueSuffix}
          </span>
        )}
      </div>
      <div
        style={{
          color: deltaColor,
          fontFamily: t.type.monoFamily,
          fontSize: 12,
          letterSpacing: 0.3,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {deltaTone === 'live' && (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: 999,
              background: t.color.primary,
              animation: 'cma-agent-glow 1600ms ease-in-out infinite',
            }}
          />
        )}
        <span>{delta}</span>
      </div>
      {sparkData && sparkColor && (
        <div
          style={{
            position: 'absolute',
            inset: 'auto 0 0 0',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        >
          <Sparkline data={sparkData} color={sparkColor} height={28} />
        </div>
      )}
    </section>
  )
}

// ─── hexToRgbTriplet — convert hex to [0–1, 0–1, 0–1] for cobe ──────
function hexToRgbTriplet(hex: string): [number, number, number] {
  const s = hex.replace('#', '')
  const r = parseInt(s.slice(0, 2), 16) / 255
  const g = parseInt(s.slice(2, 4), 16) / 255
  const b = parseInt(s.slice(4, 6), 16) / 255
  return [r || 0, g || 0, b || 0]
}

// ─── CobeGlobe — WebGL globe with auto-rotation + arc markers ────────
function CobeGlobe({ t, events }: { t: BrandTokens; events: OpsLiveEvent[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const phiRef = useRef(0)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let width = 0
    function onResize() {
      if (canvas && canvas.offsetWidth) width = canvas.offsetWidth
    }
    window.addEventListener('resize', onResize)
    onResize()
    if (!width) width = canvas.clientWidth || 600

    const markers = events
      .filter((ev) => ev.coords)
      .map((ev) => {
        const tone =
          ev.tone === 'good'
            ? t.color.primary
            : ev.tone === 'warn'
              ? t.color.accent
              : ev.tone === 'bad'
                ? t.color.error
                : t.color.muted
        const rgb = hexToRgbTriplet(tone)
        return {
          location: [ev.coords!.lat, ev.coords!.lng] as [number, number],
          size: ev.tone === 'good' ? 0.09 : ev.tone === 'bad' ? 0.09 : 0.075,
          color: rgb,
        }
      })

    const baseColor = hexToRgbTriplet(t.color.foreground)
    const glowColor = hexToRgbTriplet(t.color.primary)
    const markerColor = hexToRgbTriplet(t.color.primary)

    let globe: { update: (s: { phi: number }) => void; destroy: () => void } | null = null
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: 0.28,
        dark: 1,
        diffuse: 1.3,
        mapSamples: 16_000,
        mapBrightness: 4,
        baseColor: [baseColor[0] * 0.7, baseColor[1] * 0.7, baseColor[2] * 0.7],
        markerColor,
        glowColor,
        offset: [0, 0],
        markers,
      })
    } catch {
      // jsdom + headless test envs have no WebGL — silently no-op so
      // the surrounding surface still renders for tests.
      return () => {
        window.removeEventListener('resize', onResize)
      }
    }
    let rafId = 0
    const tick = () => {
      phiRef.current += 0.0024
      globe?.update({ phi: phiRef.current })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      globe?.destroy()
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])
  return (
    <canvas
      ref={canvasRef}
      data-region="ops-mission-globe-canvas"
      style={{
        width: '100%',
        height: '100%',
        opacity: 1,
        contain: 'layout paint size',
      }}
      aria-hidden="true"
    />
  )
}

// ─── LiveWire — globe centerpiece + stream side column ────────────────
function LiveWire({ t, events }: { t: BrandTokens; events: OpsLiveEvent[] }) {
  const u = t.space.unit
  return (
    <section
      data-region="ops-mission-ticker"
      style={{
        position: 'relative',
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 1.5}px ${u * 2}px ${u * 1.5}px ${u * 2}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: u,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: u,
            color: t.color.foreground,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: 999,
              background: t.color.primary,
              animation: 'cma-agent-glow 1600ms ease-in-out infinite',
            }}
          />
          Live Wire
        </span>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {events.length} events · {events.filter((e) => e.coords).length} mapped
        </span>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)',
          gap: u * 1.5,
          alignItems: 'stretch',
        }}
      >
        <div
          data-region="ops-mission-globe-wrap"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            minWidth: 0,
            minHeight: 0,
            containerType: 'size',
          }}
        >
          <div
            style={{
              width: 'min(100cqi, 100cqb)',
              height: 'min(100cqi, 100cqb)',
              display: 'flex',
            }}
          >
            <CobeGlobe t={t} events={events} />
          </div>
        </div>
        <EventStream t={t} events={events} />
      </div>
    </section>
  )
}

// ─── EventStream — shift-down stack, one event per line ──────────────
const STREAM_VISIBLE = 14
const STREAM_INTERVAL_MS = 4500

function EventStream({
  t,
  events,
}: {
  t: BrandTokens
  events: OpsLiveEvent[]
}) {
  type StreamEntry = { ev: OpsLiveEvent; instanceKey: string }
  const initial = events
    .slice(0, STREAM_VISIBLE)
    .map((ev, i) => ({ ev, instanceKey: `${ev.id}-init-${i}` }))
  const [visible, setVisible] = useState<StreamEntry[]>(initial)
  const cursorRef = useRef(STREAM_VISIBLE)
  useEffect(() => {
    if (events.length === 0) return
    const id = window.setInterval(() => {
      const next = events[cursorRef.current % events.length]
      cursorRef.current += 1
      setVisible((curr) => [
        { ev: next, instanceKey: `${next.id}-${Date.now()}` },
        ...curr.slice(0, STREAM_VISIBLE - 1),
      ])
    }, STREAM_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [events])
  return (
    <div
      data-region="ops-mission-event-stream"
      style={{
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {visible.map((entry, idx) => (
        <StreamLine
          key={entry.instanceKey}
          t={t}
          ev={entry.ev}
          isNew={idx === 0}
          rank={idx}
        />
      ))}
    </div>
  )
}

function StreamLine({
  t,
  ev,
  isNew,
  rank,
}: {
  t: BrandTokens
  ev: OpsLiveEvent
  isNew: boolean
  rank: number
}) {
  const toneColor =
    ev.tone === 'good'
      ? t.color.primary
      : ev.tone === 'warn'
        ? t.color.accent
        : ev.tone === 'bad'
          ? t.color.error
          : t.color.muted
  const fadeOpacity = Math.max(0.55, 1 - (rank / STREAM_VISIBLE) * 0.5)
  return (
    <div
      data-region="ops-mission-stream-line"
      data-event-id={ev.id}
      data-event-kind={ev.kind}
      data-event-city={ev.coords?.city}
      data-stream-new={isNew ? 'true' : 'false'}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        height: 26,
        background: isNew
          ? hexToRgba(toneColor, 0.12)
          : hexToRgba(t.color.background, 0.5),
        border: `1px solid ${isNew ? hexToRgba(toneColor, 0.35) : hexToRgba(t.color.foreground, 0.06)}`,
        borderLeft: `2px solid ${toneColor}`,
        borderRadius: 4,
        fontSize: 11,
        lineHeight: 1.3,
        opacity: fadeOpacity,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: isNew
          ? 'cma-stream-grow-in 420ms var(--motion-easing-enter, cubic-bezier(0.16, 1, 0.3, 1))'
          : undefined,
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: 999,
          background: toneColor,
          boxShadow: isNew ? `0 0 8px ${toneColor}` : undefined,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: t.color.muted,
          fontFamily: t.type.monoFamily,
          fontSize: 9,
          letterSpacing: 0.2,
          minWidth: 18,
        }}
      >
        {agoBrief(new Date(ev.at))}
      </span>
      <span
        style={{
          color: toneColor,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {STREAM_HEADLINE[ev.kind] ?? ev.headline.slice(0, 4).toUpperCase()}
      </span>
      <span
        style={{
          color: t.color.foreground,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {ev.context}
      </span>
      <span
        style={{
          color: t.color.muted,
          fontFamily: t.type.monoFamily,
          fontSize: 9,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {ev.coords?.city.split(',')[0] ?? 'Infra'}
      </span>
    </div>
  )
}

const STREAM_HEADLINE: Record<OpsLiveEvent['kind'], string> = {
  booking: 'BOOK',
  escalated: 'ESCL',
  takeover: 'TAKE',
  signup: 'NEW',
  upgrade: 'UPGR',
  downgrade: 'DOWN',
  churn: 'CHRN',
  'trial-end': 'TRIA',
  'provider-degraded': 'PROV',
  'provider-recovered': 'PROV',
  'provider-down': 'PROV',
  'alert-raised': 'ALRT',
  'alert-resolved': 'ALRT',
}

function agoBrief(d: Date): string {
  const ms = Date.now() - d.getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  return `${hr}h`
}

// ─── CompactAgentStack — one row per category, primary only ───────────
function CompactAgentStack({
  t,
  providersByCategory,
  providerOverrides,
  onSwitchPrimary,
}: {
  t: BrandTokens
  providersByCategory: Map<OpsProviderCategory, OpsProviderHealth[]>
  providerOverrides: Map<string, string>
  onSwitchPrimary: (
    category: OpsProviderCategory,
    fromId: string,
    toId: string,
  ) => void
}) {
  const u = t.space.unit
  return (
    <section
      data-region="ops-mission-providers"
      style={{
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 2}px ${u * 2.5}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 1.25,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: u,
        }}
      >
        <span
          style={{
            color: t.color.foreground,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Agent Stack
        </span>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {OPS_PROVIDERS.length} providers · p95 / err
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {CATEGORY_ORDER.map((category) => {
          const list = providersByCategory.get(category)
          if (!list || list.length === 0) return null
          const currentPrimaryId = providerOverrides.get(category) ?? list[0].id
          const currentPrimary =
            list.find((p) => p.id === currentPrimaryId) ?? list[0]
          const healthySiblings = list.filter(
            (p) => p.id !== currentPrimary.id && p.fallbackReady && p.status === 'healthy',
          )
          const switchTarget =
            list.length > 1 && (currentPrimary.status === 'degraded' || currentPrimary.status === 'down')
              ? healthySiblings[0]
              : undefined
          return (
            <CompactAgentRow
              key={category}
              t={t}
              category={category}
              primary={currentPrimary}
              fallbackCount={healthySiblings.length}
              switchTarget={switchTarget}
              onSwitch={() => {
                if (switchTarget)
                  onSwitchPrimary(category, currentPrimary.id, switchTarget.id)
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

function CompactAgentRow({
  t,
  category,
  primary,
  fallbackCount,
  switchTarget,
  onSwitch,
}: {
  t: BrandTokens
  category: OpsProviderCategory
  primary: OpsProviderHealth
  fallbackCount: number
  switchTarget?: OpsProviderHealth
  onSwitch: () => void
}) {
  const u = t.space.unit
  const statusColor =
    primary.status === 'down'
      ? t.color.error
      : primary.status === 'degraded'
        ? t.color.accent
        : primary.status === 'stale'
          ? t.color.muted
          : t.color.primary
  const isFloating = primary.status !== 'healthy'
  const latencyLabel =
    primary.p95LatencyMs >= 1000
      ? `${(primary.p95LatencyMs / 1000).toFixed(1)}s`
      : `${primary.p95LatencyMs}ms`
  const errColor =
    primary.errorRatePct > 1
      ? t.color.error
      : primary.errorRatePct > 0.3
        ? t.color.accent
        : t.color.muted
  return (
    <div
      data-region="ops-mission-agent-row"
      data-category={category}
      data-status={primary.status}
      style={{
        display: 'grid',
        gridTemplateColumns: '10px 64px minmax(0, 1fr) 56px 44px 22px',
        alignItems: 'center',
        gap: u * 0.75,
        padding: `${u * 0.5}px ${u}px`,
        background: isFloating ? hexToRgba(statusColor, 0.08) : 'transparent',
        borderRadius: 4,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: 999,
          background: statusColor,
          flexShrink: 0,
          animation: isFloating
            ? 'cma-agent-urgent-pulse 1200ms ease-in-out infinite'
            : undefined,
        }}
      />
      <span
        style={{
          color: t.color.muted,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {CATEGORY_LABEL[category]}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 6,
          color: t.color.foreground,
          fontSize: 12,
          minWidth: 0,
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primary.displayName}
        </span>
        {fallbackCount > 0 && (
          <span
            style={{
              color: t.color.muted,
              fontFamily: t.type.monoFamily,
              fontSize: 9,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
            title={`${fallbackCount} healthy fallback${fallbackCount === 1 ? '' : 's'} ready`}
          >
            +{fallbackCount}
          </span>
        )}
      </span>
      <span
        style={{
          color: statusColor,
          fontFamily: t.type.monoFamily,
          fontSize: 11,
          fontWeight: 600,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {latencyLabel}
      </span>
      <span
        style={{
          color: errColor,
          fontFamily: t.type.monoFamily,
          fontSize: 11,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {primary.errorRatePct.toFixed(1)}%
      </span>
      {switchTarget ? (
        <SwitchPrimaryButton
          t={t}
          toName={switchTarget.displayName}
          onClick={onSwitch}
        />
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  )
}

function SwitchPrimaryButton({
  t,
  toName,
  onClick,
}: {
  t: BrandTokens
  toName: string
  onClick: () => void
}) {
  const { pressStyle, pressHandlers } = useGlassPress(t, {
    pressColor: t.color.accent,
  })
  return (
    <button
      type="button"
      data-region="ops-mission-switch-primary"
      data-press="true"
      aria-label={`Switch primary to ${toName}`}
      title={`Switch primary to ${toName}`}
      onClick={onClick}
      {...pressHandlers}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        padding: 0,
        background: hexToRgba(t.color.accent, 0.22),
        color: t.color.accent,
        border: `1px solid ${hexToRgba(t.color.accent, 0.65)}`,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'box-shadow 220ms var(--glass-ease, ease)',
        ...pressStyle,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 4h6l-2-2" />
        <path d="M10 8H4l2 2" />
      </svg>
    </button>
  )
}

// ─── SwitchPrimaryModal — reason-required confirmation (≥12 chars) ────
// Per acceptance scenario: clicking the switch CTA opens a reason modal,
// minimum 12 chars enforced, then POSTs to /admin/providers/switch-primary
// (TODO: backend), then shows a toast with Revert.
function SwitchPrimaryModal({
  t,
  pending,
  providers,
  onCancel,
  onConfirm,
}: {
  t: BrandTokens
  pending: { category: OpsProviderCategory; fromId: string; toId: string }
  providers: OpsProviderHealth[]
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const u = t.space.unit
  const [reason, setReason] = useState('')
  const from = providers.find((p) => p.id === pending.fromId)
  const to = providers.find((p) => p.id === pending.toId)
  const ok = reason.trim().length >= 12
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ops-mission-switch-modal-title"
      data-region="ops-mission-switch-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: hexToRgba(t.color.background, 0.7),
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: u * 4,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        style={{
          width: 'min(480px, 100%)',
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.lg,
          padding: u * 3,
          display: 'flex',
          flexDirection: 'column',
          gap: u * 1.5,
          boxShadow: 'var(--glass-rim), var(--glass-lift)',
        }}
      >
        <div>
          <h2
            id="ops-mission-switch-modal-title"
            style={{
              margin: 0,
              fontFamily: t.type.headingFamily,
              fontWeight: t.type.headingWeight,
              fontSize: 18,
              color: t.color.foreground,
            }}
          >
            Switch {CATEGORY_LABEL[pending.category]} primary
          </h2>
          <p
            style={{
              margin: `${u}px 0 0 0`,
              color: t.color.muted,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {from?.displayName ?? pending.fromId} →{' '}
            <strong style={{ color: t.color.foreground }}>
              {to?.displayName ?? pending.toId}
            </strong>
            . Reason will be logged to the audit trail and posted to the
            provider switch endpoint.
          </p>
        </div>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 12,
            color: t.color.muted,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          Reason (min 12 characters)
          <textarea
            data-region="ops-mission-switch-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Whisper p95 above 2s for 18m, escalating to Deepgram"
            rows={3}
            style={{
              padding: u,
              background: hexToRgba(t.color.background, 0.6),
              border: `1px solid ${t.color.border}`,
              borderRadius: t.radius.sm,
              color: t.color.foreground,
              fontFamily: t.type.bodyFamily,
              fontSize: 13,
              fontWeight: 400,
              textTransform: 'none',
              letterSpacing: 0,
              resize: 'vertical',
            }}
          />
          <span
            style={{
              alignSelf: 'flex-end',
              color: ok ? t.color.primary : t.color.muted,
              fontFamily: t.type.monoFamily,
              fontWeight: 400,
              letterSpacing: 0,
            }}
          >
            {reason.trim().length}/12
          </span>
        </label>
        <div
          style={{
            display: 'flex',
            gap: u,
            justifyContent: 'flex-end',
            marginTop: u,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: `${u}px ${u * 2}px`,
              background: 'transparent',
              color: t.color.muted,
              border: `1px solid ${t.color.border}`,
              borderRadius: t.radius.sm,
              cursor: 'pointer',
              fontFamily: t.type.bodyFamily,
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-region="ops-mission-switch-confirm"
            disabled={!ok}
            onClick={() => ok && onConfirm(reason.trim())}
            style={{
              padding: `${u}px ${u * 2}px`,
              background: ok ? t.color.primary : hexToRgba(t.color.primary, 0.3),
              color: t.color.foreground,
              border: `1px solid ${t.color.primary}`,
              borderRadius: t.radius.sm,
              cursor: ok ? 'pointer' : 'not-allowed',
              fontFamily: t.type.bodyFamily,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Switch primary
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AlertsStrip — "Needs You" unified attention list ─────────────────
function AlertsStrip({
  t,
  evalCount,
  evalQueue,
  atRiskCount,
  atRiskNames,
  openAlerts,
}: {
  t: BrandTokens
  evalCount: number
  evalQueue: OpsEvalQueueItem[]
  atRiskCount: number
  atRiskNames: string[]
  openAlerts: OpsAlert[]
}) {
  const u = t.space.unit
  type NeedsItem = {
    key: string
    kind: 'alert' | 'risk' | 'eval'
    severity: 'urgent' | 'warn' | 'low'
    title: string
  }
  const items: NeedsItem[] = []
  for (const a of openAlerts) {
    items.push({
      key: `alert-${a.id}`,
      kind: 'alert',
      severity: a.severity === 'urgent' ? 'urgent' : a.severity === 'warn' ? 'warn' : 'low',
      title: a.title,
    })
  }
  for (const name of atRiskNames) {
    items.push({
      key: `risk-${name}`,
      kind: 'risk',
      severity: 'warn',
      title: `${name} — at risk`,
    })
  }
  for (const ev of evalQueue.filter((e) => e.priority === 'urgent').slice(0, 2)) {
    items.push({
      key: `eval-${ev.callId}`,
      kind: 'eval',
      severity: 'warn',
      title: ev.reason,
    })
  }
  const total = openAlerts.length + atRiskCount + evalCount
  const visible = items.slice(0, 3)
  return (
    <section
      data-region="ops-mission-alerts"
      style={{
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 1.5}px ${u * 2}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: u,
        }}
      >
        <span
          style={{
            color: t.color.foreground,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Needs You
        </span>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {total} items · {openAlerts.length} alert · {atRiskCount} risk · {evalCount} eval
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visible.map((item) => {
          const sevColor =
            item.severity === 'urgent'
              ? t.color.error
              : item.severity === 'warn'
                ? t.color.accent
                : t.color.muted
          const kindLabel =
            item.kind === 'alert' ? 'ALERT' : item.kind === 'risk' ? 'RISK' : 'EVAL'
          return (
            <div
              key={item.key}
              data-region="ops-mission-needs-row"
              data-kind={item.kind}
              data-severity={item.severity}
              style={{
                display: 'grid',
                gridTemplateColumns: '8px 44px minmax(0, 1fr)',
                alignItems: 'center',
                gap: u,
                padding: `${u * 0.25}px ${u * 0.75}px`,
                fontSize: 12,
                borderRadius: 4,
                background: hexToRgba(sevColor, 0.06),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: sevColor,
                  boxShadow:
                    item.severity === 'urgent'
                      ? `0 0 6px ${sevColor}`
                      : undefined,
                }}
              />
              <span
                style={{
                  color: sevColor,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {kindLabel}
              </span>
              <span
                style={{
                  color: t.color.foreground,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── NorthStarBar — progress toward the MRR goal ──────────────────────
function NorthStarBar({ t, ns }: { t: BrandTokens; ns: OpsNorthStar }) {
  const u = t.space.unit
  const pct = Math.min(1, ns.currentDollars / ns.goalDollars)
  const remaining = ns.goalDollars - ns.currentDollars
  return (
    <section
      data-region="ops-mission-north-star"
      style={{
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 1.5}px ${u * 2.5}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 0.75,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: u,
        }}
      >
        <span
          style={{
            color: t.color.muted,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          North Star · {ns.label}
        </span>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 11,
            letterSpacing: 0.4,
          }}
        >
          ${remaining.toLocaleString()} to go · projected {ns.etaLabel}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: u }}>
        <span
          style={{
            fontFamily: t.type.headingFamily,
            fontWeight: 700,
            fontSize: 22,
            color: t.color.foreground,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${ns.currentDollars.toLocaleString()}
        </span>
        <span style={{ color: t.color.muted, fontSize: 12 }}>
          / ${ns.goalDollars.toLocaleString()}
        </span>
        <span
          style={{
            color: t.color.primary,
            fontFamily: t.type.monoFamily,
            fontSize: 11,
            marginLeft: 'auto',
          }}
        >
          {(pct * 100).toFixed(1)}%
        </span>
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          width: '100%',
          height: 8,
          background: hexToRgba(t.color.foreground, 0.06),
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct * 100}%`,
            background: `linear-gradient(90deg, ${hexToRgba(t.color.primary, 0.4)} 0%, ${t.color.primary} 100%)`,
            boxShadow: `0 0 18px ${hexToRgba(t.color.primary, 0.5)}`,
            borderRadius: 4,
          }}
        />
      </div>
    </section>
  )
}

// ─── HourlyHeatStrip — 24-bar call volume ─────────────────────────────
function HourlyHeatStrip({ t, hourly }: { t: BrandTokens; hourly: number[] }) {
  const u = t.space.unit
  const max = Math.max(...hourly, 1)
  const peakHourIdx = hourly.indexOf(max)
  const totalCalls = hourly.reduce((a, b) => a + b, 0)
  return (
    <section
      data-region="ops-mission-hourly-heat"
      style={{
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 1.5}px ${u * 2}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 0.75,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: u,
        }}
      >
        <span
          style={{
            color: t.color.muted,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          24h · {totalCalls} calls · peak hour {peakHourIdx}:00
        </span>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
          }}
        >
          0 — 24
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
          gap: 2,
          alignItems: 'end',
          height: 44,
        }}
      >
        {hourly.map((v, i) => {
          const intensity = v / max
          return (
            <div
              key={i}
              data-region="ops-mission-hourly-bar"
              data-hour={i}
              title={`${i}:00 · ${v} calls`}
              style={{
                height: `${Math.max(8, intensity * 100)}%`,
                background:
                  intensity > 0.7
                    ? t.color.primary
                    : intensity > 0.35
                      ? hexToRgba(t.color.primary, 0.6)
                      : hexToRgba(t.color.foreground, 0.12),
                borderRadius: 2,
                boxShadow:
                  i === peakHourIdx
                    ? `0 0 8px ${hexToRgba(t.color.primary, 0.6)}`
                    : undefined,
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

// ─── RecentWinsFeed — curated good-tone events ────────────────────────
function RecentWinsFeed({ t, events }: { t: BrandTokens; events: OpsLiveEvent[] }) {
  const u = t.space.unit
  const wins = events.filter(
    (ev) =>
      ev.tone === 'good' &&
      (ev.kind === 'booking' || ev.kind === 'signup' || ev.kind === 'upgrade'),
  )
  return (
    <section
      data-region="ops-mission-recent-wins"
      style={{
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 1.5}px ${u * 2}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u,
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: u,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: t.color.foreground,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Recent Wins
        </span>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {wins.length} · last hour
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {wins.map((ev) => (
          <div
            key={ev.id}
            data-region="ops-mission-win-row"
            data-kind={ev.kind}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 80px 1fr auto',
              alignItems: 'center',
              gap: u,
              padding: `${u * 0.5}px ${u}px`,
              fontSize: 12,
              borderRadius: 4,
              background: hexToRgba(t.color.primary, 0.04),
            }}
          >
            <span
              aria-hidden="true"
              style={{ color: t.color.primary, fontSize: 14, lineHeight: 1 }}
            >
              ★
            </span>
            <span
              style={{
                color: t.color.primary,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              {ev.kind === 'booking'
                ? 'Booking'
                : ev.kind === 'signup'
                  ? 'New customer'
                  : 'Upgrade'}
            </span>
            <span
              style={{
                color: t.color.foreground,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ev.context}
            </span>
            <span
              style={{
                color: t.color.muted,
                fontFamily: t.type.monoFamily,
                fontSize: 10,
              }}
            >
              {agoBrief(new Date(ev.at))}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── AIBurnTile — today's spend + margin ──────────────────────────────
function AIBurnTile({ t, burn }: { t: BrandTokens; burn: OpsAIBurn }) {
  const u = t.space.unit
  const marginDollars = burn.todayRevenueDollars - burn.todaySpendDollars
  const marginPct = (marginDollars / burn.todayRevenueDollars) * 100
  return (
    <section
      data-region="ops-mission-ai-burn"
      style={{
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 1.5}px ${u * 2.5}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 0.75,
      }}
    >
      <span
        style={{
          color: t.color.muted,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        AI burn · today
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: u }}>
        <span
          style={{
            fontFamily: t.type.headingFamily,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '-0.02em',
            color: t.color.accent,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${burn.todaySpendDollars.toFixed(2)}
        </span>
        <span style={{ color: t.color.muted, fontSize: 12 }}>spent</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: u,
          marginTop: 2,
        }}
      >
        <div>
          <div style={{ color: t.color.muted, fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Cost / call
          </div>
          <div
            style={{
              color: t.color.foreground,
              fontFamily: t.type.monoFamily,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ${burn.costPerCallDollars.toFixed(3)}
          </div>
        </div>
        <div>
          <div style={{ color: t.color.muted, fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Margin
          </div>
          <div
            style={{
              color: marginPct > 50 ? t.color.primary : t.color.accent,
              fontFamily: t.type.monoFamily,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {marginPct.toFixed(1)}% · +${marginDollars.toFixed(0)}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── TrialToPayingFunnel — signups → conversion ───────────────────────
function TrialToPayingFunnel({ t, stages }: { t: BrandTokens; stages: OpsFunnelStage[] }) {
  const u = t.space.unit
  const start = stages[0].count
  const end = stages[stages.length - 1].count
  const conversionPct = (end / start) * 100
  return (
    <section
      data-region="ops-mission-funnel"
      style={{
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        padding: `${u * 1.5}px ${u * 2}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 1.25,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: u,
        }}
      >
        <span
          style={{
            color: t.color.foreground,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Trial → Paying
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <span
            data-region="ops-mission-funnel-conversion"
            style={{
              color: t.color.primary,
              fontFamily: t.type.headingFamily,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {conversionPct.toFixed(0)}%
          </span>
          <span
            style={{
              color: t.color.muted,
              fontSize: 10,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            end-to-end · 30d
          </span>
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: stages
            .map((_, i) => (i === stages.length - 1 ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 16px'))
            .join(' '),
          alignItems: 'stretch',
          gap: u * 0.75,
        }}
      >
        {stages.flatMap((s, i) => {
          const pctOfStart = (s.count / start) * 100
          const dropPct =
            i > 0 ? Math.round((1 - s.count / stages[i - 1].count) * 100) : 0
          const nodes: React.ReactNode[] = [
            <div
              key={s.label}
              data-region="ops-mission-funnel-stage"
              data-stage-index={i}
              data-stage-pct={pctOfStart.toFixed(0)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: u * 0.5,
                padding: `${u * 0.75}px ${u}px`,
                minWidth: 0,
                background: hexToRgba(t.color.primary, 0.04 + (i / stages.length) * 0.04),
                border: `1px solid ${hexToRgba(t.color.primary, 0.18)}`,
                borderRadius: t.radius.sm,
              }}
            >
              <div
                style={{
                  color: t.color.muted,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {s.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    fontFamily: t.type.headingFamily,
                    fontWeight: 700,
                    fontSize: 22,
                    color: t.color.foreground,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}
                >
                  {s.count}
                </span>
                <span
                  style={{
                    color: t.color.muted,
                    fontFamily: t.type.monoFamily,
                    fontSize: 10,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {pctOfStart.toFixed(0)}%
                </span>
              </div>
              <div
                aria-hidden="true"
                style={{
                  position: 'relative',
                  height: 4,
                  background: hexToRgba(t.color.foreground, 0.06),
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${pctOfStart}%`,
                    background: `linear-gradient(90deg, ${hexToRgba(t.color.primary, 0.4)} 0%, ${t.color.primary} 100%)`,
                  }}
                />
              </div>
            </div>,
          ]
          if (i < stages.length - 1) {
            const dropColor = dropPct > 40 ? t.color.error : dropPct > 25 ? t.color.accent : t.color.muted
            nodes.push(
              <div
                key={`drop-${i}`}
                aria-hidden="true"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  color: dropColor,
                  fontFamily: t.type.monoFamily,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>›</span>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.2 }}>
                  −{dropPct}
                </span>
              </div>,
            )
          }
          return nodes
        })}
      </div>
    </section>
  )
}

// ─── MissionLine — inspirational anchor at the bottom ─────────────────
function MissionLine({ t }: { t: BrandTokens }) {
  const u = t.space.unit
  return (
    <div
      data-region="ops-mission-line"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: u * 2,
        padding: `${u * 1.5}px ${u * 2}px`,
        borderTop: `1px solid ${t.color.border}`,
        color: t.color.muted,
        fontFamily: t.type.monoFamily,
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        textAlign: 'center',
      }}
    >
      <span>Build your empire</span>
      <span aria-hidden="true" style={{ color: t.color.primary }}>●</span>
      <span style={{ color: t.color.foreground }}>One answered call at a time</span>
      <span aria-hidden="true" style={{ color: t.color.primary }}>●</span>
      <span>Call My Agent</span>
    </div>
  )
}

// ─── Sparkline — small SVG polyline with stroke-draw animation ────────
function Sparkline({
  data,
  color,
  height,
}: {
  data: number[]
  color: string
  height: number
}) {
  const W = 180
  const H = height
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = Math.max(max - min, 1)
  const pad = 2
  const points = data
    .map((v, i) => {
      const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2)
      const y = H - pad - ((v - min) / range) * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{
          strokeDasharray: 500,
          strokeDashoffset: 500,
          animation: `cma-svg-stroke-draw 720ms var(--motion-easing-enter, ease-out) forwards`,
        }}
      />
    </svg>
  )
}

// ─── SoundToggle — icon-only round button, pinned bottom-right ────────
function SoundToggle({
  t,
  on,
  onToggle,
}: {
  t: BrandTokens
  on: boolean
  onToggle: () => void
}) {
  const { pressStyle, pressHandlers } = useGlassPress(t, { skipDepress: true })
  return (
    <button
      type="button"
      data-region="ops-mission-sound-toggle"
      data-on={on ? 'true' : 'false'}
      data-press="true"
      aria-label={on ? 'Sound on — click to mute' : 'Sound off — click to enable'}
      title={on ? 'Sound on' : 'Sound off'}
      onClick={onToggle}
      {...pressHandlers}
      style={{
        position: 'absolute',
        bottom: t.space.unit * 2.5,
        right: t.space.unit * 3,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        background: on
          ? hexToRgba(t.color.primary, 0.18)
          : hexToRgba(t.color.background, 0.6),
        color: on ? t.color.primary : t.color.muted,
        border: `1px solid ${on ? hexToRgba(t.color.primary, 0.5) : t.color.border}`,
        borderRadius: 999,
        cursor: 'pointer',
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        WebkitBackdropFilter:
          'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        transition: 'box-shadow 220ms var(--glass-ease, ease)',
        ...pressStyle,
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 5.2v3.6h2.4L7.6 11V3L4.4 5.2H2Z" fill="currentColor" stroke="none" />
        {on ? (
          <>
            <path d="M9.8 5.2c.6.5.9 1.1.9 1.8s-.3 1.3-.9 1.8" />
            <path d="M11.4 3.6c1.1.9 1.7 2 1.7 3.4s-.6 2.5-1.7 3.4" />
          </>
        ) : (
          <>
            <path d="M10 5l3 4" />
            <path d="M13 5l-3 4" />
          </>
        )}
      </svg>
    </button>
  )
}

// ─── playChime — Web Audio API synthesized chimes ───────────────────
// Production ships dedicated audio files. The fixture synthesizes them
// inline so the demo plays a real sound when you flip the toggle.
// TODO(backend-wireup): replace with prebaked WAV/MP3 assets served by
// /admin/assets/sounds/* once the audio kit ships.
function playChime(t: BrandTokens, kind: 'quiet' | 'critical' | 'catastrophic') {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const now = ctx.currentTime
    const notes =
      kind === 'quiet'
        ? [{ f: 880, t: 0, dur: 0.25 }]
        : kind === 'critical'
          ? [
              { f: 880, t: 0, dur: 0.18 },
              { f: 660, t: 0.12, dur: 0.22 },
            ]
          : [
              { f: 880, t: 0, dur: 0.18 },
              { f: 660, t: 0.18, dur: 0.18 },
              { f: 440, t: 0.36, dur: 0.32 },
            ]
    const peakGain =
      kind === 'quiet' ? 0.18 : kind === 'critical' ? 0.32 : 0.46
    for (const n of notes) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = n.f
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, now + n.t)
      g.gain.linearRampToValueAtTime(peakGain, now + n.t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(now + n.t)
      o.stop(now + n.t + n.dur + 0.05)
    }
    void t
  } catch {
    /* AudioContext blocked (no user gesture) */
  }
}
