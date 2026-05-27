import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OpsChrome } from './OpsChrome'
import type { OpsStaff } from './OpsChrome'
import { TOKENS } from '../../lib/brand'

// TanStack Router requires a router context. We use a lightweight mock
// so OpsChrome renders without a full RouterProvider.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Link: ({ children, to, style, onClick, 'data-region': dataRegion, 'data-tab': dataTab, 'data-active': dataActive, ...rest }: any) => (
      <a
        href={to as string}
        style={style}
        onClick={onClick}
        data-region={dataRegion}
        data-tab={dataTab}
        data-active={dataActive}
        {...rest}
      >
        {children}
      </a>
    ),
    useRouterState: () => ({
      location: { pathname: '/mission' },
    }),
  }
})

const t = TOKENS

const defaultStaff: OpsStaff = {
  id: 'staff-test',
  fullName: 'Test Staff',
  initials: 'TS',
  role: 'owner',
  twoFactorOn: true,
}

function renderChrome(props: Partial<React.ComponentProps<typeof OpsChrome>> = {}) {
  return render(
    <OpsChrome
      t={t}
      staff={defaultStaff}
      agentHealth="healthy"
      {...props}
    />
  )
}

describe('OpsChrome', () => {
  it('renders the brand mark', () => {
    renderChrome()
    expect(screen.getByText('Ops')).toBeInTheDocument()
    expect(screen.getByText('callmyagent')).toBeInTheDocument()
  })

  it('renders all 5 nav tabs', () => {
    renderChrome()
    expect(screen.getByText('Pulse')).toBeInTheDocument()
    expect(screen.getByText('Calls')).toBeInTheDocument()
    expect(screen.getByText('Eval')).toBeInTheDocument()
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('Costs')).toBeInTheDocument()
  })

  it('renders all 5 tab links with correct data-tab attributes', () => {
    renderChrome()
    const tabs = document.querySelectorAll('[data-tab]')
    const tabNames = Array.from(tabs).map((t) => t.getAttribute('data-tab'))
    expect(tabNames).toContain('pulse')
    expect(tabNames).toContain('calls')
    expect(tabNames).toContain('eval')
    expect(tabNames).toContain('customers')
    expect(tabNames).toContain('costs')
  })

  it('renders staff name and role', () => {
    renderChrome()
    expect(screen.getByText('Test Staff')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
  })

  it('shows 2FA on indicator', () => {
    renderChrome({ staff: { ...defaultStaff, twoFactorOn: true } })
    expect(screen.getByText('2FA on')).toBeInTheDocument()
  })

  it('shows 2FA OFF indicator when 2FA is disabled', () => {
    renderChrome({ staff: { ...defaultStaff, twoFactorOn: false } })
    expect(screen.getByText('2FA OFF')).toBeInTheDocument()
  })

  it('renders admin role badge — owner shows "Owner"', () => {
    renderChrome({ staff: { ...defaultStaff, role: 'owner' } })
    const badge = document.querySelector('[data-region="ops-chrome-role-badge"]')
    expect(badge).toBeTruthy()
    expect(badge?.textContent).toBe('Owner')
  })

  it('renders read-only role badge', () => {
    renderChrome({ staff: { ...defaultStaff, role: 'read-only' } })
    const badge = document.querySelector('[data-region="ops-chrome-role-badge"]')
    expect(badge?.textContent).toBe('Read-only')
  })

  it('does NOT show session warning when sessionSecondsLeft is undefined', () => {
    renderChrome()
    expect(document.querySelector('[data-region="ops-chrome-session-warning"]')).toBeNull()
  })

  it('does NOT show session warning when > 5 minutes left', () => {
    renderChrome({ sessionSecondsLeft: 360 }) // 6 minutes
    expect(document.querySelector('[data-region="ops-chrome-session-warning"]')).toBeNull()
  })

  it('shows session warning when <= 5 minutes left', () => {
    renderChrome({ sessionSecondsLeft: 300 }) // exactly 5 minutes
    expect(document.querySelector('[data-region="ops-chrome-session-warning"]')).toBeTruthy()
  })

  it('shows session warning at 1 second left', () => {
    renderChrome({ sessionSecondsLeft: 1 })
    expect(document.querySelector('[data-region="ops-chrome-session-warning"]')).toBeTruthy()
    expect(screen.getByText(/Session ends in/)).toBeInTheDocument()
  })

  it('shows session warning text with correct minutes', () => {
    renderChrome({ sessionSecondsLeft: 180 }) // 3 minutes
    expect(screen.getByText('Session ends in 3m')).toBeInTheDocument()
  })

  it('renders agent-health region', () => {
    renderChrome({ agentHealth: 'healthy' })
    const healthRegion = document.querySelector('[data-region="ops-chrome-agent-health"]')
    expect(healthRegion).toBeTruthy()
    expect(healthRegion?.getAttribute('data-agent-health')).toBe('healthy')
  })

  it('agent orb shows idle state when healthy', () => {
    renderChrome({ agentHealth: 'healthy' })
    const orb = document.querySelector('[data-region="agent-orb"]')
    expect(orb?.getAttribute('data-state')).toBe('idle')
  })

  it('agent orb shows thinking state when degraded', () => {
    renderChrome({ agentHealth: 'degraded' })
    const orb = document.querySelector('[data-region="agent-orb"]')
    expect(orb?.getAttribute('data-state')).toBe('thinking')
  })

  it('agent orb shows urgent state when down', () => {
    renderChrome({ agentHealth: 'down' })
    const orb = document.querySelector('[data-region="agent-orb"]')
    expect(orb?.getAttribute('data-state')).toBe('urgent')
  })

  it('shows "AI ok" label when healthy', () => {
    renderChrome({ agentHealth: 'healthy' })
    expect(screen.getByText('AI ok')).toBeInTheDocument()
  })

  it('shows "AI degraded" label when degraded', () => {
    renderChrome({ agentHealth: 'degraded' })
    expect(screen.getByText('AI degraded')).toBeInTheDocument()
  })

  it('shows "AI down" label when down', () => {
    renderChrome({ agentHealth: 'down' })
    expect(screen.getByText('AI down')).toBeInTheDocument()
  })

  it('shows eval badge when evalQueueCount > 0', () => {
    renderChrome({ evalQueueCount: 7 })
    const evalBadge = document.querySelector('[data-region="ops-chrome-tab-badge"][data-tab="eval"]')
    expect(evalBadge?.textContent).toBe('7')
  })

  it('shows pulse badge when openAlertCount > 0', () => {
    renderChrome({ openAlertCount: 3 })
    const pulseBadge = document.querySelector('[data-region="ops-chrome-tab-badge"][data-tab="pulse"]')
    expect(pulseBadge?.textContent).toBe('3')
  })

  it('does not show eval badge when evalQueueCount is 0', () => {
    renderChrome({ evalQueueCount: 0 })
    expect(document.querySelector('[data-region="ops-chrome-tab-badge"][data-tab="eval"]')).toBeNull()
  })

  it('renders audit button', () => {
    renderChrome()
    expect(document.querySelector('[data-region="ops-chrome-audit-button"]')).toBeTruthy()
  })

  it('opens audit drawer when audit button is clicked', () => {
    renderChrome()
    const auditBtn = document.querySelector('[data-region="ops-chrome-audit-button"]') as HTMLButtonElement
    fireEvent.click(auditBtn)
    expect(document.querySelector('[data-region="ops-audit-drawer"]')).toBeTruthy()
  })

  it('closes audit drawer when close button is clicked', () => {
    renderChrome()
    const auditBtn = document.querySelector('[data-region="ops-chrome-audit-button"]') as HTMLButtonElement
    fireEvent.click(auditBtn)
    expect(document.querySelector('[data-region="ops-audit-drawer"]')).toBeTruthy()
    const closeBtn = document.querySelector('[data-region="ops-audit-close"]') as HTMLButtonElement
    fireEvent.click(closeBtn)
    expect(document.querySelector('[data-region="ops-audit-drawer"]')).toBeNull()
  })

  it('renders mission button in right cluster', () => {
    renderChrome()
    expect(document.querySelector('[data-region="ops-chrome-mission-button"]')).toBeTruthy()
  })

  it('calls onChangeTab when tab is clicked', () => {
    const onChangeTab = vi.fn()
    renderChrome({ onChangeTab })
    const pulseTab = document.querySelector('[data-tab="pulse"]') as HTMLElement
    fireEvent.click(pulseTab)
    expect(onChangeTab).toHaveBeenCalledWith('pulse')
  })
})
