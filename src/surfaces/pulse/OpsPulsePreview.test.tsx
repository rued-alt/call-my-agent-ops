import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpsPulsePreview } from './OpsPulsePreview'
import { TOKENS } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import {
  OPS_PULSE,
  OPS_SINCE_LAST_VISIT,
  OPS_ALERTS,
  type OpsAlert,
} from '../../data/opsFixture'

// jsdom normalises hex inline styles to rgb(). Helper to match either form.
function borderContainsColor(borderLeft: string, hexColor: string): boolean {
  if (borderLeft.includes(hexColor)) return true
  // Convert hex -> rgb components and check the rgb() form
  const m = hexColor.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return false
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return borderLeft.includes(`rgb(${r}, ${g}, ${b})`)
}

// Wrap the component in a fresh QueryClient for each test.
function renderPulse() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <OpsPulsePreview t={TOKENS} />
    </QueryClientProvider>,
  )
}

describe('OpsPulsePreview', () => {
  // ── Since-last-visit strip ────────────────────────────────────────────
  describe('SinceLastVisitStrip', () => {
    it('renders the since-last-visit strip', () => {
      renderPulse()
      expect(
        screen.getByText(/Since you last visited/i),
      ).toBeInTheDocument()
    })

    it('renders the newCalls chip with fixture value', () => {
      renderPulse()
      const chip = screen
        .getByRole('button', { name: (n) => n.includes('new calls') })
      expect(chip).toBeInTheDocument()
      expect(chip).toHaveTextContent(OPS_SINCE_LAST_VISIT.newCalls.toString())
    })

    it('renders the newAlerts chip with fixture value', () => {
      renderPulse()
      const chip = screen
        .getByRole('button', { name: (n) => n.includes('new alerts') })
      expect(chip).toBeInTheDocument()
      expect(chip).toHaveTextContent(OPS_SINCE_LAST_VISIT.newAlerts.toString())
    })

    it('renders the newRatings chip with fixture value', () => {
      renderPulse()
      const chip = screen
        .getByRole('button', { name: (n) => n.includes('rated by team') })
      expect(chip).toBeInTheDocument()
      expect(chip).toHaveTextContent(OPS_SINCE_LAST_VISIT.newRatings.toString())
    })

    it('formats relative time as hr ago (fixture visit was 14 hrs ago)', () => {
      renderPulse()
      // lastVisitAt is 14 hr ago in the fixture — should show some "hr ago" text
      expect(
        screen.getByText(/hr ago/i),
      ).toBeInTheDocument()
    })
  })

  // ── Stat tiles ────────────────────────────────────────────────────────
  describe('Stat tiles', () => {
    it('renders all 4 stat tile labels', () => {
      renderPulse()
      const tiles = document.querySelectorAll('[data-region="ops-pulse-tile"]')
      expect(tiles).toHaveLength(4)
    })

    it('renders "Calls today" label', () => {
      renderPulse()
      expect(screen.getByText('Calls today')).toBeInTheDocument()
    })

    it('renders "Quality avg" label', () => {
      renderPulse()
      expect(screen.getByText('Quality avg')).toBeInTheDocument()
    })

    it('renders "Escalations" label', () => {
      renderPulse()
      expect(screen.getByText('Escalations')).toBeInTheDocument()
    })

    it('renders "Revenue today" label', () => {
      renderPulse()
      expect(screen.getByText('Revenue today')).toBeInTheDocument()
    })

    it('todayCalls tile shows fixture value (188)', () => {
      renderPulse()
      expect(
        screen.getByText(OPS_PULSE.todayCalls.toString()),
      ).toBeInTheDocument()
    })

    it('todayQualityAvg tile shows fixture value (85)', () => {
      renderPulse()
      expect(
        screen.getByText(OPS_PULSE.todayQualityAvg.toString()),
      ).toBeInTheDocument()
    })

    it('todayEscalations tile shows fixture value (11)', () => {
      renderPulse()
      expect(
        screen.getByText(OPS_PULSE.todayEscalations.toString()),
      ).toBeInTheDocument()
    })

    it('todayRevenueDollars tile shows fixture value ($412)', () => {
      renderPulse()
      expect(
        screen.getByText(`$${OPS_PULSE.todayRevenueDollars}`),
      ).toBeInTheDocument()
    })

    it('quality tile shows "/ 100" unit', () => {
      renderPulse()
      expect(screen.getByText('/ 100')).toBeInTheDocument()
    })
  })

  // ── 7-day sparklines ─────────────────────────────────────────────────
  describe('7-day sparklines', () => {
    it('renders 4 sparklines', () => {
      renderPulse()
      const sparks = document.querySelectorAll('[data-region="ops-pulse-spark"]')
      expect(sparks).toHaveLength(4)
    })

    it('calls7d sparkline has the correct data-label', () => {
      renderPulse()
      const spark = document.querySelector(
        '[data-region="ops-pulse-spark"][data-label="7-day calls"]',
      )
      expect(spark).toBeInTheDocument()
    })

    it('quality7d sparkline has the correct data-label', () => {
      renderPulse()
      const spark = document.querySelector(
        '[data-region="ops-pulse-spark"][data-label="7-day quality"]',
      )
      expect(spark).toBeInTheDocument()
    })

    it('escalations7d sparkline has the correct data-label', () => {
      renderPulse()
      const spark = document.querySelector(
        '[data-region="ops-pulse-spark"][data-label="7-day escalations"]',
      )
      expect(spark).toBeInTheDocument()
    })

    it('revenue7d sparkline has the correct data-label', () => {
      renderPulse()
      const spark = document.querySelector(
        '[data-region="ops-pulse-spark"][data-label="7-day revenue"]',
      )
      expect(spark).toBeInTheDocument()
    })

    it('calls7d sparkline polyline has the right number of points (7)', () => {
      renderPulse()
      const spark = document.querySelector(
        '[data-region="ops-pulse-spark"][data-label="7-day calls"]',
      )!
      const polyline = spark.querySelector('polyline')!
      // points attr: "x,y x,y ..." — 7 points = 7 pairs
      const pairs = polyline.getAttribute('points')!.trim().split(/\s+/)
      expect(pairs).toHaveLength(OPS_PULSE.calls7d.length)
    })

    it('quality7d sparkline polyline has 7 points', () => {
      renderPulse()
      const spark = document.querySelector(
        '[data-region="ops-pulse-spark"][data-label="7-day quality"]',
      )!
      const polyline = spark.querySelector('polyline')!
      const pairs = polyline.getAttribute('points')!.trim().split(/\s+/)
      expect(pairs).toHaveLength(OPS_PULSE.quality7d.length)
    })
  })

  // ── Open alerts list ─────────────────────────────────────────────────
  describe('Open alerts list', () => {
    it('renders the "Open alerts" heading', () => {
      renderPulse()
      expect(screen.getByText('Open alerts')).toBeInTheDocument()
    })

    it('renders all unresolved fixture alerts', () => {
      renderPulse()
      const unresolvedAlerts = OPS_ALERTS.filter((a) => !a.resolved)
      const alertEls = document.querySelectorAll('[data-region="ops-pulse-alert"]')
      expect(alertEls).toHaveLength(unresolvedAlerts.length)
    })

    it('renders alert titles', () => {
      renderPulse()
      const unresolvedAlerts = OPS_ALERTS.filter((a) => !a.resolved)
      for (const alert of unresolvedAlerts) {
        expect(screen.getByText(alert.title)).toBeInTheDocument()
      }
    })

    it('urgent alert has error-colored left border (data-severity=urgent)', () => {
      renderPulse()
      const urgentAlert = OPS_ALERTS.find((a) => a.severity === 'urgent')!
      const el = document.querySelector(
        `[data-alert-id="${urgentAlert.id}"]`,
      ) as HTMLElement
      expect(el).toBeInTheDocument()
      expect(el.getAttribute('data-severity')).toBe('urgent')
      // Border-left color is set inline — jsdom normalises hex to rgb()
      expect(borderContainsColor(el.style.borderLeft, TOKENS.color.error)).toBe(true)
    })

    it('warn alert has accent-colored left border (data-severity=warn)', () => {
      renderPulse()
      const warnAlert = OPS_ALERTS.find((a) => a.severity === 'warn')!
      const el = document.querySelector(
        `[data-alert-id="${warnAlert.id}"]`,
      ) as HTMLElement
      expect(el).toBeInTheDocument()
      expect(el.getAttribute('data-severity')).toBe('warn')
      expect(borderContainsColor(el.style.borderLeft, TOKENS.color.accent)).toBe(true)
    })

    it('info alert has muted-colored left border (data-severity=info)', () => {
      renderPulse()
      const infoAlert = OPS_ALERTS.find((a) => a.severity === 'info')!
      const el = document.querySelector(
        `[data-alert-id="${infoAlert.id}"]`,
      ) as HTMLElement
      expect(el).toBeInTheDocument()
      expect(el.getAttribute('data-severity')).toBe('info')
      expect(borderContainsColor(el.style.borderLeft, TOKENS.color.muted)).toBe(true)
    })

    it('clicking an alert dismisses it from the list', () => {
      renderPulse()
      const firstAlert = OPS_ALERTS.filter((a) => !a.resolved)[0]
      const el = document.querySelector(
        `[data-alert-id="${firstAlert.id}"]`,
      ) as HTMLElement
      fireEvent.click(el)
      // After dismiss, the alert should no longer be in the DOM
      expect(
        document.querySelector(`[data-alert-id="${firstAlert.id}"]`),
      ).not.toBeInTheDocument()
    })
  })

  // ── Empty state ───────────────────────────────────────────────────────
  describe('Empty state', () => {
    it('shows "Nothing on fire" when all alerts are resolved', () => {
      // Render with a custom QueryClient that pre-loads resolved-only alerts
      const resolvedAlerts: OpsAlert[] = OPS_ALERTS.map((a) => ({
        ...a,
        resolved: true,
      }))
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      // Seed the cache so the component picks it up via initialData override:
      // The component uses initialData — we simulate by dismissing all alerts.
      // Render normally, then dismiss each alert to reach the empty state.
      render(
        <QueryClientProvider client={qc}>
          <OpsPulsePreview t={TOKENS} />
        </QueryClientProvider>,
      )
      // Dismiss all open alerts
      const openAlerts = OPS_ALERTS.filter((a) => !a.resolved)
      for (const alert of openAlerts) {
        const el = document.querySelector(
          `[data-alert-id="${alert.id}"]`,
        ) as HTMLElement
        if (el) fireEvent.click(el)
      }
      expect(screen.getByText('Nothing on fire. Carry on.')).toBeInTheDocument()
      expect(
        document.querySelector('[data-region="ops-pulse-alerts-empty"]'),
      ).toBeInTheDocument()
    })
  })

  // ── Live badge ────────────────────────────────────────────────────────
  describe('Live badge', () => {
    it('shows live call count from fixture (3)', () => {
      renderPulse()
      const badge = document.querySelector('[data-region="ops-pulse-live-badge"]')!
      expect(badge).toBeInTheDocument()
      expect(badge.getAttribute('data-live')).toBe('true')
      expect(badge.textContent).toContain(OPS_PULSE.liveCalls.toString())
    })
  })

  // ── Unresolved count ─────────────────────────────────────────────────
  describe('Unresolved count', () => {
    it('shows correct unresolved count in header', () => {
      renderPulse()
      const unresolvedCount = OPS_ALERTS.filter((a) => !a.resolved).length
      expect(
        screen.getByText(`${unresolvedCount} unresolved`),
      ).toBeInTheDocument()
    })
  })
})
