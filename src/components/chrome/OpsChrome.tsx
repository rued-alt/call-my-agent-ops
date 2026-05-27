import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import { useGlassPress } from '../../lib/glass/useGlassPress'
import { Icon } from '../shared/Icon'
import { AgentOrb } from '../shared/AgentOrb'
import type { AgentOrbState } from '../shared/AgentOrb'
import { OPS_AUDIT_LOG, type OpsAuditAction, type OpsAuditEntry } from '../../data/opsFixture'

// OpsChrome — the chrome (top nav + session/role indicator + agent-
// health orb) for the internal ops/monitor app. Different from the
// customer app's DashboardChrome: ops is desktop-first, lives behind
// founder auth, surfaces its own integrity primitives (PII redaction,
// audit-log trail, session timeout, role badges) right in the chrome.
// This tool is agent-name-agnostic — each customer names their own
// agent; the ops view uses generic "agent" language throughout.
//
// Per contract f9ee1622: NEVER say "Rue" — always "the agent" / "agent stack".
//
// Brand DNA matches the customer app — same glass + same typography +
// same press-glow on every clickable element. Voice is matter-of-fact
// (internal copy, factual numbers, no marketing speak).
//
// Tabs (left → right): Pulse · Calls · Eval · Customers · Costs.
// Right edge: agent-health orb (monitors the agent stack — LLM + STT +
// TTS + telephony — not voiced as any specific agent persona).
// Far right: staff identity + role badge.

export type OpsTab =
  | 'mission'
  | 'pulse'
  | 'calls'
  | 'eval'
  | 'customers'
  | 'costs'

export type OpsRole = 'owner' | 'ops' | 'on-call' | 'read-only'

export type OpsStaff = {
  id: string
  fullName: string
  initials: string
  role: OpsRole
  /** Whether the staff member has 2FA on. Surfaces a warning chip when off. */
  twoFactorOn: boolean
}

export type OpsAgentHealth =
  | 'healthy' // green — all signals normal
  | 'degraded' // amber — one signal off (latency / error rate / cost)
  | 'down' // red — outage

// Mission is NOT in TAB_ORDER — it lives as an icon-only button in the
// chrome right cluster (left of Audit). The chrome tab strip is for the
// regular daily-work surfaces; Mission Control is the leave-on monitor
// view, accessed by tapping its dashboard glyph in the chrome.
const TAB_ORDER: OpsTab[] = ['pulse', 'calls', 'eval', 'customers', 'costs']
const TAB_LABEL: Record<OpsTab, string> = {
  mission: 'Mission',
  pulse: 'Pulse',
  calls: 'Calls',
  eval: 'Eval',
  customers: 'Customers',
  costs: 'Costs',
}
const ROLE_LABEL: Record<OpsRole, string> = {
  owner: 'Owner',
  ops: 'Ops',
  'on-call': 'On-call',
  'read-only': 'Read-only',
}

export type OpsChromeProps = {
  t: BrandTokens
  activeTab?: OpsTab
  onChangeTab?: (tab: OpsTab) => void
  staff: OpsStaff
  agentHealth: OpsAgentHealth
  /** Pending eval-queue count — surfaces a small badge on the Eval tab. */
  evalQueueCount?: number
  /** Open-alert count — surfaces an urgency dot on the Pulse tab. */
  openAlertCount?: number
  /** Seconds until the session auto-expires. The chrome surfaces a soft
   *  warning chip when ≤ 5 minutes; passing 0 triggers the re-auth modal
   *  (rendered by the parent). */
  sessionSecondsLeft?: number
}

export function OpsChrome({
  t,
  activeTab,
  onChangeTab,
  staff,
  agentHealth,
  evalQueueCount = 0,
  openAlertCount = 0,
  sessionSecondsLeft,
}: OpsChromeProps) {
  const u = t.space.unit
  const sessionExpiringSoon =
    sessionSecondsLeft !== undefined && sessionSecondsLeft <= 5 * 60
  const [auditOpen, setAuditOpen] = useState(false)

  // Derive active tab from router state if not explicitly passed
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const derivedActiveTab: OpsTab = activeTab ?? (
    currentPath.startsWith('/pulse') ? 'pulse' :
    currentPath.startsWith('/calls') ? 'calls' :
    currentPath.startsWith('/eval') ? 'eval' :
    currentPath.startsWith('/customers') ? 'customers' :
    currentPath.startsWith('/costs') ? 'costs' :
    currentPath.startsWith('/mission') ? 'mission' :
    'mission'
  )

  const orbState: AgentOrbState =
    agentHealth === 'healthy'
      ? 'idle'
      : agentHealth === 'degraded'
        ? 'thinking'
        : 'urgent'

  return (
    <div
      data-region="ops-chrome"
      data-agent-health={agentHealth}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: u * 3,
        padding: `${u * 2}px ${u * 5}px`,
        background: hexToRgba(t.color.background, 0.88),
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        WebkitBackdropFilter:
          'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        borderBottom: `1px solid ${t.color.border}`,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
      }}
    >
      {/* ── Brand mark (left) ───────────────────────────────────────────────── */}
      <div
        data-region="ops-chrome-brand"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: u * 2,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: t.radius.sm,
            background: hexToRgba(t.color.primary, 0.85),
            color: t.color.foreground,
          }}
        >
          <Icon name="phone" size={14} color={t.color.foreground} />
        </span>
        <span
          style={{
            fontFamily: t.type.headingFamily,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '-0.01em',
          }}
        >
          Ops
        </span>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          callmyagent
        </span>
      </div>

      {/* ── Tabs (center) — TanStack Router Links ─────────────────────────── */}
      <nav
        data-region="ops-chrome-tabs"
        aria-label="Ops sections"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: u * 0.5,
          flex: 1,
          minWidth: 0,
          marginLeft: u * 4,
        }}
      >
        {TAB_ORDER.map((tab) => {
          const isActive = tab === derivedActiveTab
          const badgeCount =
            tab === 'eval'
              ? evalQueueCount
              : tab === 'pulse'
                ? openAlertCount
                : 0
          return (
            <ChromeTab
              key={tab}
              t={t}
              tab={tab}
              active={isActive}
              badgeCount={badgeCount}
              onClick={() => onChangeTab?.(tab)}
            />
          )
        })}
      </nav>

      {/* ── Session-expiring warning ────────────────────────────────────────── */}
      {sessionExpiringSoon && (
        <div
          data-region="ops-chrome-session-warning"
          role="status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: u,
            padding: `${u * 0.75}px ${u * 2}px`,
            background: hexToRgba(t.color.error, 0.18),
            color: t.color.foreground,
            border: `1px solid ${hexToRgba(t.color.error, 0.5)}`,
            borderRadius: t.radius.sm,
            fontSize: 12,
            fontFamily: t.type.bodyFamily,
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            Session ends in {Math.max(0, Math.ceil((sessionSecondsLeft ?? 0) / 60))}m
          </span>
        </div>
      )}

      {/* ── Mission button (icon-only, left of Audit) ────────────────────── */}
      <ChromeMissionButton
        t={t}
        active={derivedActiveTab === 'mission'}
        onClick={() => onChangeTab?.('mission')}
      />

      {/* ── Audit button (right of session warning, left of orb) ─────────── */}
      <ChromeAuditButton t={t} onClick={() => setAuditOpen(true)} />

      {/* ── Agent-health orb (right side) ─────────────────────────────────── */}
      <div
        data-region="ops-chrome-agent-health"
        data-agent-health={agentHealth}
        title={
          agentHealth === 'healthy'
            ? 'Agent stack healthy'
            : agentHealth === 'degraded'
              ? 'Agent stack degraded — see Pulse'
              : 'Agent stack down — see Pulse'
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: u,
          flexShrink: 0,
        }}
      >
        <AgentOrb t={t} state={orbState} size={22} />
        <span
          data-region="ops-chrome-agent-health-label"
          style={{
            color:
              agentHealth === 'down'
                ? t.color.error
                : agentHealth === 'degraded'
                  ? t.color.accent
                  : t.color.muted,
            fontSize: 11,
            fontFamily: t.type.monoFamily,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {agentHealth === 'healthy'
            ? 'AI ok'
            : agentHealth === 'degraded'
              ? 'AI degraded'
              : 'AI down'}
        </span>
      </div>

      {/* ── Staff identity + role (far right) ─────────────────────────────── */}
      <div
        data-region="ops-chrome-staff"
        data-staff-id={staff.id}
        data-role={staff.role}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: u * 1.5,
          flexShrink: 0,
        }}
      >
        <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: 12,
              fontFamily: t.type.bodyFamily,
              color: t.color.foreground,
            }}
          >
            {staff.fullName}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontFamily: t.type.monoFamily,
              color: staff.twoFactorOn ? t.color.muted : t.color.error,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            <span data-region="ops-chrome-role-badge">{ROLE_LABEL[staff.role]}</span>
            <span aria-hidden="true">·</span>
            <span
              data-region="ops-chrome-2fa-indicator"
              data-2fa={staff.twoFactorOn ? 'on' : 'off'}
              title={staff.twoFactorOn ? '2FA enabled' : '2FA NOT enabled — enable it'}
            >
              {staff.twoFactorOn ? '2FA on' : '2FA OFF'}
            </span>
          </div>
        </div>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: hexToRgba(t.color.primary, 0.5),
            color: t.color.foreground,
            fontFamily: t.type.bodyFamily,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.4,
            border: `1px solid ${t.color.border}`,
          }}
        >
          {staff.initials}
        </span>
      </div>

      {auditOpen && <OpsAuditDrawer t={t} onClose={() => setAuditOpen(false)} />}
    </div>
  )
}

// ─── ChromeAuditButton ────────────────────────────────────────────────
function ChromeAuditButton({
  t,
  onClick,
}: {
  t: BrandTokens
  onClick: () => void
}) {
  const { pressStyle, pressHandlers } = useGlassPress(t, { skipDepress: true })
  return (
    <button
      type="button"
      data-region="ops-chrome-audit-button"
      aria-label="Open audit log"
      data-press="true"
      onClick={onClick}
      {...pressHandlers}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'transparent',
        color: t.color.muted,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.sm,
        fontSize: 11,
        fontFamily: t.type.bodyFamily,
        fontWeight: 500,
        cursor: 'pointer',
        flexShrink: 0,
        transition:
          'box-shadow 220ms var(--glass-ease, ease), transform 120ms var(--glass-ease, ease)',
        ...pressStyle,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span>Audit</span>
    </button>
  )
}

// ─── ChromeMissionButton ─────────────────────────────────────────────────
// Icon-only entry to Mission Control. Sits in the right cluster, immediately
// left of the Audit button. Uses a 2×2 grid glyph (the universal "dashboard"
// mark). When Mission is the active surface the button gets the same primary
// wash the chrome tabs use.
function ChromeMissionButton({
  t,
  active,
  onClick,
}: {
  t: BrandTokens
  active: boolean
  onClick: () => void
}) {
  const { pressStyle, pressHandlers } = useGlassPress(t, { skipDepress: true })
  return (
    <Link
      to="/mission"
      data-region="ops-chrome-mission-button"
      data-active={active ? 'true' : 'false'}
      aria-label="Mission Control"
      aria-current={active ? 'page' : undefined}
      title="Mission Control — leave-on overview"
      data-press="true"
      onClick={onClick}
      {...pressHandlers}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        padding: 0,
        background: active
          ? hexToRgba(t.color.primary, 0.22)
          : 'transparent',
        color: active ? t.color.foreground : t.color.muted,
        border: `1px solid ${active ? hexToRgba(t.color.primary, 0.5) : t.color.border}`,
        borderRadius: t.radius.sm,
        cursor: 'pointer',
        flexShrink: 0,
        textDecoration: 'none',
        transition:
          'background var(--motion-duration-fast, 160ms) var(--motion-easing-standard, ease), color var(--motion-duration-fast, 160ms) var(--motion-easing-standard, ease), border-color var(--motion-duration-fast, 160ms) var(--motion-easing-standard, ease), box-shadow 220ms var(--glass-ease)',
        ...pressStyle,
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
        <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
        <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
        <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
      </svg>
    </Link>
  )
}

// ─── ChromeTab — top-nav tab with TanStack Router Link ────────────────────
const TAB_ROUTES: Record<OpsTab, string> = {
  mission: '/mission',
  pulse: '/pulse',
  calls: '/calls',
  eval: '/eval',
  customers: '/customers',
  costs: '/costs',
}

function ChromeTab({
  t,
  tab,
  active,
  badgeCount,
  onClick,
}: {
  t: BrandTokens
  tab: OpsTab
  active: boolean
  badgeCount: number
  onClick: () => void
}) {
  const u = t.space.unit
  const { pressStyle, pressHandlers } = useGlassPress(t, { skipDepress: true })
  return (
    <Link
      to={TAB_ROUTES[tab] as '/pulse' | '/calls' | '/eval' | '/customers' | '/costs' | '/mission'}
      data-region="ops-chrome-tab"
      data-tab={tab}
      data-active={active ? 'true' : 'false'}
      data-press="true"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      {...pressHandlers}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: u,
        padding: `${u * 1.25}px ${u * 2.5}px`,
        minWidth: 112,
        background: active ? hexToRgba(t.color.primary, 0.14) : 'transparent',
        color: active ? t.color.foreground : t.color.muted,
        fontFamily: t.type.bodyFamily,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        border: 'none',
        borderRadius: t.radius.sm,
        cursor: 'pointer',
        textDecoration: 'none',
        transition:
          'background var(--motion-duration-fast, 160ms) var(--motion-easing-standard, ease), color var(--motion-duration-fast, 160ms) var(--motion-easing-standard, ease), box-shadow 220ms var(--glass-ease)',
        ...pressStyle,
      }}
    >
      <span>{TAB_LABEL[tab]}</span>
      {badgeCount > 0 && (
        <span
          data-region="ops-chrome-tab-badge"
          data-tab={tab}
          style={{
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 999,
            background:
              tab === 'pulse' && badgeCount > 0
                ? t.color.error
                : t.color.primary,
            color: t.color.foreground,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
            fontWeight: 600,
            lineHeight: '18px',
            textAlign: 'center',
          }}
        >
          {badgeCount}
        </span>
      )}
    </Link>
  )
}

// ─── OpsAuditDrawer ───────────────────────────────────────────────────────
// Global audit log — every staff action across the ops surface.
// Filterable by action type. Slides down from top of OpsChrome.
const AUDIT_ACTION_LABEL: Record<OpsAuditAction, string> = {
  'view-call': 'View call',
  'reveal-pii': 'Reveal PII',
  'rate-call': 'Rate call',
  'view-customer': 'View customer',
  'view-cost': 'View cost',
  'dismiss-alert': 'Dismiss alert',
  'change-plan': 'Change plan',
  export: 'Export',
  login: 'Login',
}

const HIGH_RISK_ACTIONS: OpsAuditAction[] = [
  'reveal-pii',
  'change-plan',
  'export',
  'dismiss-alert',
]

function OpsAuditDrawer({
  t,
  onClose,
}: {
  t: BrandTokens
  onClose: () => void
}) {
  const u = t.space.unit
  const [filterRisk, setFilterRisk] = useState(false)
  const entries = OPS_AUDIT_LOG.filter((e) =>
    filterRisk ? HIGH_RISK_ACTIONS.includes(e.action) : true,
  ).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return (
    <aside
      data-region="ops-audit-drawer"
      role="dialog"
      aria-modal="false"
      aria-label="Audit log"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        maxHeight: 'calc(100vh - 56px)',
        background: hexToRgba(t.color.background, 0.96),
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        WebkitBackdropFilter:
          'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        borderBottom: `1px solid ${t.color.border}`,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9,
        animation:
          'mov-slide-down var(--motion-duration-base, 240ms) var(--motion-easing-enter, ease-out)',
        boxShadow: 'var(--glass-rim), var(--glass-lift)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: u * 4,
          borderBottom: `1px solid ${t.color.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: t.color.muted,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Security
          </div>
          <h3
            style={{
              margin: `${u}px 0 0 0`,
              fontFamily: t.type.headingFamily,
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            Audit log
          </h3>
          <div
            style={{
              marginTop: 4,
              color: t.color.muted,
              fontSize: 12,
            }}
          >
            {entries.length} entries · trailing 24h
          </div>
        </div>
        <div style={{ display: 'flex', gap: u * 2, alignItems: 'center' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: t.color.muted,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={filterRisk}
              onChange={(e) => setFilterRisk(e.target.checked)}
            />
            <span>High-risk only</span>
          </label>
          <button
            type="button"
            data-region="ops-audit-close"
            aria-label="Close audit log"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${t.color.border}`,
              borderRadius: t.radius.sm,
              padding: 6,
              color: t.color.muted,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={14} color={t.color.muted} />
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: u * 3,
          display: 'flex',
          flexDirection: 'column',
          gap: u * 1.5,
        }}
      >
        {entries.length === 0 ? (
          <div
            style={{
              padding: u * 6,
              textAlign: 'center',
              color: t.color.muted,
              fontSize: 13,
            }}
          >
            No entries match this filter.
          </div>
        ) : (
          entries.map((entry) => (
            <AuditEntryRow key={entry.id} t={t} entry={entry} />
          ))
        )}
      </div>
    </aside>
  )
}

function AuditEntryRow({
  t,
  entry,
}: {
  t: BrandTokens
  entry: OpsAuditEntry
}) {
  const u = t.space.unit
  const isHighRisk = HIGH_RISK_ACTIONS.includes(entry.action)
  return (
    <div
      data-region="ops-audit-entry"
      data-action={entry.action}
      data-high-risk={isHighRisk ? 'true' : 'false'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: u * 0.5,
        padding: u * 2,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderLeft: `3px solid ${isHighRisk ? t.color.error : t.color.border}`,
        borderRadius: t.radius.sm,
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: u * 2,
        }}
      >
        <span style={{ color: t.color.foreground, fontWeight: 600 }}>
          {AUDIT_ACTION_LABEL[entry.action]}
        </span>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 10,
            letterSpacing: 0.3,
          }}
        >
          {new Date(entry.at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div
        style={{
          color: t.color.muted,
          fontSize: 11,
          fontFamily: t.type.monoFamily,
        }}
      >
        {entry.staffName} ({entry.staffRole}) · {entry.target}
      </div>
      {entry.reason && (
        <div
          style={{
            marginTop: 2,
            color: t.color.foreground,
            fontSize: 11,
            fontStyle: 'italic',
          }}
        >
          "{entry.reason}"
        </div>
      )}
    </div>
  )
}

// ─── Live session tick helper ─────────────────────────────────────────────
// Studio previews can use this to drive a countdown that ticks down to
// the re-auth modal. Real backend would tie this to the actual session
// expiry time delivered by the auth provider.
export function useOpsSessionCountdown(initialSec: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSec)
  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [secondsLeft])
  return { secondsLeft, reset: (n: number) => setSecondsLeft(n) }
}

// ─── Default staff fixture ───────────────────────────────────────────────
export const DEFAULT_OPS_STAFF: OpsStaff = {
  id: 'staff-amrou',
  fullName: 'Amrou Manaseer',
  initials: 'AM',
  role: 'owner',
  twoFactorOn: true,
}
