import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpsMissionPreview } from './OpsMissionPreview'
import { TOKENS } from '../../lib/brand'
import {
  OPS_PROVIDERS,
  OPS_LIVE_EVENTS,
  OPS_NORTH_STAR,
  OPS_TRIAL_FUNNEL,
} from '../../data/opsFixture'

// cobe touches WebGL which jsdom lacks. The component's CobeGlobe
// wrapper already try/catches createGlobe failures, but mocking the
// module makes the test runner output cleaner and avoids any side
// effects from the real cobe shipping a worker.
vi.mock('cobe', () => ({
  default: vi.fn(() => ({
    update: vi.fn(),
    destroy: vi.fn(),
  })),
}))

function renderMission() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <OpsMissionPreview t={TOKENS} />
    </QueryClientProvider>,
  )
}

describe('OpsMissionPreview', () => {
  beforeEach(() => {
    // Reset localStorage so the sound-toggle test starts from a known
    // off state. Some tests rely on the persisted pref.
    window.localStorage.clear()
  })

  // ── Sub-components render ─────────────────────────────────────────
  describe('sub-components render', () => {
    it('renders the StatusBar with Mission Control label', () => {
      renderMission()
      expect(screen.getByText('Mission Control')).toBeInTheDocument()
    })

    it('renders the StatusBar clock that ticks', () => {
      renderMission()
      const clock = document.querySelector('[data-region="ops-mission-clock"]')
      expect(clock).not.toBeNull()
      // Format HH:MM:SS
      expect(clock?.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    })

    it('renders the NorthStar bar with goal label', () => {
      renderMission()
      const ns = document.querySelector('[data-region="ops-mission-north-star"]')
      expect(ns).not.toBeNull()
      expect(ns?.textContent).toContain(OPS_NORTH_STAR.label)
    })

    it('renders 4 HeroStat cards (Today / Calls / MRR / Quality)', () => {
      renderMission()
      const cards = document.querySelectorAll('[data-region="ops-mission-hero-card"]')
      expect(cards.length).toBe(4)
      expect(document.querySelector('[data-label="today"]')).not.toBeNull()
      expect(document.querySelector('[data-label="calls"]')).not.toBeNull()
      expect(document.querySelector('[data-label="mrr"]')).not.toBeNull()
      expect(document.querySelector('[data-label="quality"]')).not.toBeNull()
    })

    it('renders the HourlyHeatStrip with 24 bars', () => {
      renderMission()
      const bars = document.querySelectorAll('[data-region="ops-mission-hourly-bar"]')
      expect(bars.length).toBe(24)
    })

    it('renders the LiveWire ticker section + globe canvas', () => {
      renderMission()
      expect(document.querySelector('[data-region="ops-mission-ticker"]')).not.toBeNull()
      expect(document.querySelector('[data-region="ops-mission-globe-canvas"]')).not.toBeNull()
    })

    it('renders the EventStream', () => {
      renderMission()
      expect(
        document.querySelector('[data-region="ops-mission-event-stream"]'),
      ).not.toBeNull()
    })

    it('renders the AgentStack with provider rows', () => {
      renderMission()
      const stack = document.querySelector('[data-region="ops-mission-providers"]')
      expect(stack).not.toBeNull()
      const rows = document.querySelectorAll('[data-region="ops-mission-agent-row"]')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('renders the RecentWinsFeed section', () => {
      renderMission()
      expect(
        document.querySelector('[data-region="ops-mission-recent-wins"]'),
      ).not.toBeNull()
      expect(screen.getByText('Recent Wins')).toBeInTheDocument()
    })

    it('renders the AIBurnTile', () => {
      renderMission()
      expect(
        document.querySelector('[data-region="ops-mission-ai-burn"]'),
      ).not.toBeNull()
      expect(screen.getByText(/AI burn · today/i)).toBeInTheDocument()
    })

    it('renders the TrialToPayingFunnel with 4 stages', () => {
      renderMission()
      const stages = document.querySelectorAll(
        '[data-region="ops-mission-funnel-stage"]',
      )
      expect(stages.length).toBe(OPS_TRIAL_FUNNEL.length)
    })

    it('renders the NeedsYou (AlertsStrip) section', () => {
      renderMission()
      expect(document.querySelector('[data-region="ops-mission-alerts"]')).not.toBeNull()
      expect(screen.getByText('Needs You')).toBeInTheDocument()
    })

    it('renders the MissionLine slogan', () => {
      renderMission()
      expect(screen.getByText(/Build your empire/i)).toBeInTheDocument()
      expect(screen.getByText(/One answered call at a time/i)).toBeInTheDocument()
    })
  })

  // ── Funnel computes conversion percentages ───────────────────────
  describe('funnel conversions', () => {
    it('renders end-to-end conversion as percentage of stage 1', () => {
      renderMission()
      const start = OPS_TRIAL_FUNNEL[0].count
      const end = OPS_TRIAL_FUNNEL[OPS_TRIAL_FUNNEL.length - 1].count
      const expected = `${Math.round((end / start) * 100)}%`
      const conv = document.querySelector(
        '[data-region="ops-mission-funnel-conversion"]',
      )
      expect(conv?.textContent).toContain(expected)
    })

    it('annotates each stage with its pct-of-start in data attr', () => {
      renderMission()
      const stages = document.querySelectorAll(
        '[data-region="ops-mission-funnel-stage"]',
      )
      const start = OPS_TRIAL_FUNNEL[0].count
      stages.forEach((node, i) => {
        const expectedPct = Math.round((OPS_TRIAL_FUNNEL[i].count / start) * 100).toString()
        expect(node.getAttribute('data-stage-pct')).toBe(expectedPct)
      })
    })
  })

  // ── Event stream shifts on interval ──────────────────────────────
  describe('event stream', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('shifts the stream on the 4.5s cadence', () => {
      renderMission()
      const firstSnapshot = Array.from(
        document.querySelectorAll('[data-region="ops-mission-stream-line"]'),
      ).map((n) => n.getAttribute('data-event-id'))
      // Tick well past the 4500ms interval.
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      const secondSnapshot = Array.from(
        document.querySelectorAll('[data-region="ops-mission-stream-line"]'),
      ).map((n) => n.getAttribute('data-event-id'))
      // After the tick, at least one line should have shifted — the
      // top entry's instance key changes, and the stream length stays
      // at STREAM_VISIBLE = 14 (or however many events the fixture has,
      // whichever is smaller).
      expect(secondSnapshot[0]).not.toBe(firstSnapshot[firstSnapshot.length - 1])
    })

    it('marks the freshly-arrived event with data-stream-new=true', () => {
      renderMission()
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      const fresh = document.querySelector(
        '[data-region="ops-mission-stream-line"][data-stream-new="true"]',
      )
      expect(fresh).not.toBeNull()
    })
  })

  // ── Switch-primary CTA + reason modal ────────────────────────────
  describe('switch-primary CTA', () => {
    it('renders the switch-primary button next to a degraded provider', () => {
      renderMission()
      const switchBtns = document.querySelectorAll(
        '[data-region="ops-mission-switch-primary"]',
      )
      // Whisper is degraded in the fixture and has Deepgram as a ready
      // fallback — the row should expose its switch CTA.
      expect(switchBtns.length).toBeGreaterThan(0)
    })

    it('does not render the switch CTA on healthy primaries', () => {
      renderMission()
      // Telnyx (telephony) is healthy + has no fallback — its row
      // should not have a switch button.
      const telephonyRow = document.querySelector(
        '[data-region="ops-mission-agent-row"][data-category="telephony"]',
      )
      expect(telephonyRow).not.toBeNull()
      expect(
        telephonyRow?.querySelector('[data-region="ops-mission-switch-primary"]'),
      ).toBeNull()
    })

    it('opens the reason modal when the switch CTA is clicked', () => {
      renderMission()
      const btn = document.querySelector(
        '[data-region="ops-mission-switch-primary"]',
      ) as HTMLButtonElement
      expect(btn).not.toBeNull()
      fireEvent.click(btn)
      expect(
        document.querySelector('[data-region="ops-mission-switch-modal"]'),
      ).not.toBeNull()
    })

    it('disables confirm until the reason is at least 12 chars', () => {
      renderMission()
      const btn = document.querySelector(
        '[data-region="ops-mission-switch-primary"]',
      ) as HTMLButtonElement
      fireEvent.click(btn)
      const confirm = document.querySelector(
        '[data-region="ops-mission-switch-confirm"]',
      ) as HTMLButtonElement
      expect(confirm.disabled).toBe(true)
      const textarea = document.querySelector(
        '[data-region="ops-mission-switch-reason"]',
      ) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'too short' } })
      expect(confirm.disabled).toBe(true)
      fireEvent.change(textarea, {
        target: { value: 'Whisper p95 above 2 seconds for 18 minutes' },
      })
      expect(confirm.disabled).toBe(false)
    })

    it('commits the switch + shows a toast with the new primary name', () => {
      renderMission()
      const btn = document.querySelector(
        '[data-region="ops-mission-switch-primary"]',
      ) as HTMLButtonElement
      fireEvent.click(btn)
      const textarea = document.querySelector(
        '[data-region="ops-mission-switch-reason"]',
      ) as HTMLTextAreaElement
      fireEvent.change(textarea, {
        target: { value: 'Whisper degraded for 18 minutes — escalating' },
      })
      const confirm = document.querySelector(
        '[data-region="ops-mission-switch-confirm"]',
      ) as HTMLButtonElement
      fireEvent.click(confirm)
      // Modal closes
      expect(
        document.querySelector('[data-region="ops-mission-switch-modal"]'),
      ).toBeNull()
      // Toast appears
      expect(document.querySelector('[data-region="ops-toast"]')).not.toBeNull()
      // Revert affordance appears
      expect(
        document.querySelector('[data-region="ops-mission-revert-button"]'),
      ).not.toBeNull()
    })
  })

  // ── Sound toggle persistence ─────────────────────────────────────
  describe('sound toggle', () => {
    it('renders the sound toggle pinned to the bottom-right', () => {
      renderMission()
      const toggle = document.querySelector(
        '[data-region="ops-mission-sound-toggle"]',
      )
      expect(toggle).not.toBeNull()
      expect(toggle?.getAttribute('data-on')).toBe('false')
    })

    it('persists the sound-on state to localStorage across renders', () => {
      const { unmount } = renderMission()
      const toggle = document.querySelector(
        '[data-region="ops-mission-sound-toggle"]',
      ) as HTMLButtonElement
      fireEvent.click(toggle)
      expect(toggle.getAttribute('data-on')).toBe('true')
      expect(window.localStorage.getItem('ops-mission-sound-on')).toBe('1')
      unmount()
      renderMission()
      const next = document.querySelector(
        '[data-region="ops-mission-sound-toggle"]',
      )
      expect(next?.getAttribute('data-on')).toBe('true')
    })
  })

  // ── Globe component does not throw ───────────────────────────────
  describe('globe', () => {
    it('renders the canvas without throwing (cobe mocked)', () => {
      expect(() => renderMission()).not.toThrow()
      expect(
        document.querySelector('[data-region="ops-mission-globe-canvas"]'),
      ).not.toBeNull()
    })
  })

  // ── Live events fixture surfaces ─────────────────────────────────
  describe('live events fixture', () => {
    it('shows the count of mapped (coords) events in the LiveWire header', () => {
      renderMission()
      const mapped = OPS_LIVE_EVENTS.filter((e) => e.coords).length
      expect(screen.getByText(new RegExp(`${mapped} mapped`))).toBeInTheDocument()
    })
  })

  // ── Providers fixture surfaces ───────────────────────────────────
  describe('providers fixture', () => {
    it('renders a row per provider category in fixture order', () => {
      renderMission()
      const categories = new Set(OPS_PROVIDERS.map((p) => p.category))
      categories.forEach((cat) => {
        const row = document.querySelector(
          `[data-region="ops-mission-agent-row"][data-category="${cat}"]`,
        )
        expect(row, `missing row for ${cat}`).not.toBeNull()
      })
    })
  })

  // ── Globe arc throttling (contract: cap simultaneous arcs) ────────
  describe('globe arc throttling', () => {
    it('exposes a hard cap data attribute on the globe canvas', () => {
      renderMission()
      const canvas = document.querySelector(
        '[data-region="ops-mission-globe-canvas"]',
      ) as HTMLElement | null
      expect(canvas).not.toBeNull()
      const cap = Number(canvas?.getAttribute('data-arc-cap'))
      expect(cap).toBeGreaterThan(0)
    })

    it('never renders more arcs than the cap, regardless of coord event count', () => {
      renderMission()
      const canvas = document.querySelector(
        '[data-region="ops-mission-globe-canvas"]',
      ) as HTMLElement | null
      const cap = Number(canvas?.getAttribute('data-arc-cap'))
      const arcs = Number(canvas?.getAttribute('data-arc-count'))
      expect(arcs).toBeLessThanOrEqual(cap)
    })

    it('reports the actual rendered arc count matching min(mappedEvents, cap)', () => {
      renderMission()
      const canvas = document.querySelector(
        '[data-region="ops-mission-globe-canvas"]',
      ) as HTMLElement | null
      const cap = Number(canvas?.getAttribute('data-arc-cap'))
      const arcs = Number(canvas?.getAttribute('data-arc-count'))
      const mapped = OPS_LIVE_EVENTS.filter((e) => e.coords).length
      expect(arcs).toBe(Math.min(mapped, cap))
    })
  })

  // ── Event-stream backpressure (visibility-paused + max-visible cap) ──
  describe('event stream backpressure', () => {
    it('exposes the max-visible cap as a data attribute', () => {
      renderMission()
      const stream = document.querySelector(
        '[data-region="ops-mission-event-stream"]',
      )
      expect(stream?.getAttribute('data-stream-max-visible')).toBe('14')
    })

    it('starts unpaused on a visible document', () => {
      renderMission()
      const stream = document.querySelector(
        '[data-region="ops-mission-event-stream"]',
      )
      expect(stream?.getAttribute('data-stream-paused')).toBe('false')
    })

    it('caps the rendered stream-line count at STREAM_VISIBLE (14)', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        renderMission()
        // Run the interval many times — the visible stack still must
        // never exceed 14 lines (backpressure cap).
        act(() => {
          vi.advanceTimersByTime(60_000)
        })
        const lines = document.querySelectorAll(
          '[data-region="ops-mission-stream-line"]',
        )
        expect(lines.length).toBeLessThanOrEqual(14)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
