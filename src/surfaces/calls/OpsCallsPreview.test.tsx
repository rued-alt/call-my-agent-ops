import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpsCallsPreview } from './OpsCallsPreview'
import { TOKENS } from '../../lib/brand'
import { OPS_CALLS } from '../../data/opsFixture'
import type { OpsStaff } from '../../components/chrome/OpsChrome'

const DEFAULT_STAFF: OpsStaff = {
  id: 'staff-amrou',
  fullName: 'Amrou Manaseer',
  initials: 'AM',
  role: 'owner',
  twoFactorOn: true,
}

const READ_ONLY_STAFF: OpsStaff = {
  ...DEFAULT_STAFF,
  role: 'read-only',
}

function renderCalls(staff: OpsStaff = DEFAULT_STAFF) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <OpsCallsPreview t={TOKENS} staff={staff} />
    </QueryClientProvider>,
  )
}

describe('OpsCallsPreview', () => {
  // ── Fixture rows ────────────────────────────────────────────────────
  describe('Fixture rows', () => {
    it('renders all fixture call rows', () => {
      renderCalls()
      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      expect(rows).toHaveLength(OPS_CALLS.length)
    })

    it('renders each fixture call id as a data-call-id attribute', () => {
      renderCalls()
      for (const call of OPS_CALLS) {
        const row = document.querySelector(`[data-call-id="${call.id}"]`)
        expect(row).toBeInTheDocument()
      }
    })

    it('renders the call count chip matching fixture length', () => {
      renderCalls()
      const count = document.querySelector('[data-region="ops-calls-count"]')
      expect(count).toBeInTheDocument()
      expect(count!.textContent).toContain(OPS_CALLS.length.toString())
    })
  })

  // ── Search filter ─────────────────────────────────────────────────
  describe('Search input', () => {
    it('renders the search input', () => {
      renderCalls()
      expect(screen.getByRole('searchbox', { name: /search calls/i })).toBeInTheDocument()
    })

    it('filters by customer business name', () => {
      renderCalls()
      const search = screen.getByRole('searchbox')
      fireEvent.change(search, { target: { value: "Daniel's Trattoria" } })
      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      const danielCalls = OPS_CALLS.filter((c) =>
        c.customerBusiness.toLowerCase().includes("daniel's trattoria"),
      )
      expect(rows).toHaveLength(danielCalls.length)
    })

    it('filters by caller name', () => {
      renderCalls()
      const search = screen.getByRole('searchbox')
      fireEvent.change(search, { target: { value: 'Karen Liu' } })
      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      const matching = OPS_CALLS.filter((c) =>
        (c.callerName ?? '').toLowerCase().includes('karen liu'),
      )
      expect(rows).toHaveLength(matching.length)
    })

    it('filters by transcript snippet content', () => {
      renderCalls()
      const search = screen.getByRole('searchbox')
      fireEvent.change(search, { target: { value: 'auto warranty' } })
      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      const matching = OPS_CALLS.filter((c) =>
        c.transcriptSnippet.toLowerCase().includes('auto warranty'),
      )
      expect(rows).toHaveLength(matching.length)
      expect(rows.length).toBeGreaterThan(0)
    })

    it('shows empty state when search has no matches', () => {
      renderCalls()
      const search = screen.getByRole('searchbox')
      fireEvent.change(search, { target: { value: 'xyzzy-no-match-9999' } })
      expect(document.querySelector('[data-region="ops-calls-empty"]')).toBeInTheDocument()
      expect(screen.getByText(/No calls match/i)).toBeInTheDocument()
    })
  })

  // ── Outcome filter chips ───────────────────────────────────────────
  describe('Outcome filter chips', () => {
    it('renders outcome filter chips', () => {
      renderCalls()
      const chips = document.querySelectorAll('[data-region="ops-calls-filter-chip"]')
      // 6 outcome + 4 autonomy = 10
      expect(chips.length).toBeGreaterThanOrEqual(6)
    })

    it('clicking Booking chip filters to booking calls only', () => {
      renderCalls()
      const bookingChip = Array.from(
        document.querySelectorAll('[data-region="ops-calls-filter-chip"]'),
      ).find((el) => el.textContent?.trim() === 'Booking') as HTMLElement
      expect(bookingChip).toBeTruthy()
      fireEvent.click(bookingChip)

      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      const bookingCalls = OPS_CALLS.filter((c) => c.outcomeClass === 'booking')
      expect(rows).toHaveLength(bookingCalls.length)
    })

    it('clicking Booking chip marks it active', () => {
      renderCalls()
      const bookingChip = Array.from(
        document.querySelectorAll('[data-region="ops-calls-filter-chip"]'),
      ).find((el) => el.textContent?.trim() === 'Booking') as HTMLElement
      fireEvent.click(bookingChip)
      expect(bookingChip.getAttribute('data-active')).toBe('true')
    })

    it('clicking an active chip toggles it off (deselects)', () => {
      renderCalls()
      const bookingChip = Array.from(
        document.querySelectorAll('[data-region="ops-calls-filter-chip"]'),
      ).find((el) => el.textContent?.trim() === 'Booking') as HTMLElement
      fireEvent.click(bookingChip) // on
      fireEvent.click(bookingChip) // off
      expect(bookingChip.getAttribute('data-active')).toBe('false')
      // All calls back
      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      expect(rows).toHaveLength(OPS_CALLS.length)
    })

    it('clicking Spam chip filters to spam calls', () => {
      renderCalls()
      const spamChip = Array.from(
        document.querySelectorAll('[data-region="ops-calls-filter-chip"]'),
      ).find((el) => el.textContent?.trim() === 'Spam') as HTMLElement
      fireEvent.click(spamChip)

      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      const spamCalls = OPS_CALLS.filter((c) => c.outcomeClass === 'spam')
      expect(rows).toHaveLength(spamCalls.length)
    })
  })

  // ── Autonomy filter chips ──────────────────────────────────────────
  describe('Autonomy filter chips', () => {
    it('clicking Escalated chip filters to escalated calls', () => {
      renderCalls()
      const escalatedChip = Array.from(
        document.querySelectorAll('[data-region="ops-calls-filter-chip"]'),
      ).find((el) => el.textContent?.trim() === 'Escalated') as HTMLElement
      expect(escalatedChip).toBeTruthy()
      fireEvent.click(escalatedChip)

      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      const escalatedCalls = OPS_CALLS.filter((c) => c.autonomy === 'escalated')
      expect(rows).toHaveLength(escalatedCalls.length)
    })

    it('clicking Takeover chip filters to takeover calls', () => {
      renderCalls()
      const takeoverChip = Array.from(
        document.querySelectorAll('[data-region="ops-calls-filter-chip"]'),
      ).find((el) => el.textContent?.trim() === 'Takeover') as HTMLElement
      fireEvent.click(takeoverChip)

      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      const takeoverCalls = OPS_CALLS.filter((c) => c.autonomy === 'takeover')
      expect(rows).toHaveLength(takeoverCalls.length)
    })
  })

  // ── Clear filters button ───────────────────────────────────────────
  describe('Clear filters', () => {
    it('clear filters button appears when a filter is active', () => {
      renderCalls()
      const bookingChip = Array.from(
        document.querySelectorAll('[data-region="ops-calls-filter-chip"]'),
      ).find((el) => el.textContent?.trim() === 'Booking') as HTMLElement
      fireEvent.click(bookingChip)
      expect(document.querySelector('[data-region="ops-calls-clear-filters"]')).toBeInTheDocument()
    })

    it('clear filters button resets to show all calls', () => {
      renderCalls()
      const bookingChip = Array.from(
        document.querySelectorAll('[data-region="ops-calls-filter-chip"]'),
      ).find((el) => el.textContent?.trim() === 'Booking') as HTMLElement
      fireEvent.click(bookingChip)
      const clearBtn = document.querySelector('[data-region="ops-calls-clear-filters"]') as HTMLElement
      fireEvent.click(clearBtn)
      const rows = document.querySelectorAll('[data-region="ops-calls-row"]')
      expect(rows).toHaveLength(OPS_CALLS.length)
    })
  })

  // ── Row click → drawer ─────────────────────────────────────────────
  describe('Row click opens detail', () => {
    it('clicking a row opens the detail panel', () => {
      renderCalls()
      const firstRow = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(firstRow)
      expect(
        document.querySelector('[data-region="ops-calls-row-detail"]'),
      ).toBeInTheDocument()
    })

    it('clicking the same row again closes the detail panel', () => {
      renderCalls()
      const firstRow = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(firstRow) // open
      fireEvent.click(firstRow) // close
      // After close the detail is removed from DOM (ExpanderPanel phase=closed)
      // It may still be in a closing animation — check data-active
      expect(firstRow.getAttribute('data-active')).toBe('false')
    })

    it('opens detail with correct call id', () => {
      renderCalls()
      const call = OPS_CALLS[2] // call-003
      const row = document.querySelector(`[data-call-id="${call.id}"]`) as HTMLElement
      fireEvent.click(row)
      const detail = document.querySelector(
        `[data-region="ops-calls-row-detail"][data-call-id="${call.id}"]`,
      )
      expect(detail).toBeInTheDocument()
    })

    it('detail panel renders the meta strip (call id + duration)', () => {
      renderCalls()
      const call = OPS_CALLS[0]
      const row = document.querySelector(`[data-call-id="${call.id}"]`) as HTMLElement
      fireEvent.click(row)
      const metaStrip = document.querySelector('[data-region="ops-calls-drawer-meta-strip"]')
      expect(metaStrip).toBeInTheDocument()
      expect(metaStrip!.textContent).toContain(call.id)
    })

    it('detail panel renders quality section', () => {
      renderCalls()
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      expect(document.querySelector('[data-region="ops-calls-drawer-quality"]')).toBeInTheDocument()
    })

    it('detail panel renders transcript section', () => {
      renderCalls()
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      expect(document.querySelector('[data-region="ops-calls-drawer-transcript"]')).toBeInTheDocument()
    })

    it('detail panel renders action buttons', () => {
      renderCalls()
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      expect(document.querySelector('[data-region="ops-calls-drawer-actions"]')).toBeInTheDocument()
      expect(document.querySelector('[data-region="ops-calls-drawer-rate"]')).toBeInTheDocument()
      expect(document.querySelector('[data-region="ops-calls-drawer-flag"]')).toBeInTheDocument()
    })
  })

  // ── Reveal PII ────────────────────────────────────────────────────
  describe('Reveal PII flow', () => {
    it('owner role sees the Reveal PII button in the drawer', () => {
      renderCalls(DEFAULT_STAFF) // role = owner
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      // OpsRevealButton renders with data-region="ops-reveal-trigger"
      expect(document.querySelector('[data-region="ops-reveal-trigger"]')).toBeInTheDocument()
    })

    it('read-only role does NOT see the Reveal PII button', () => {
      renderCalls(READ_ONLY_STAFF)
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      expect(document.querySelector('[data-region="ops-reveal-trigger"]')).not.toBeInTheDocument()
    })

    it('clicking Reveal PII opens the reason modal', () => {
      renderCalls(DEFAULT_STAFF)
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      const revealBtn = document.querySelector('[data-region="ops-reveal-trigger"]') as HTMLElement
      fireEvent.click(revealBtn)
      expect(document.querySelector('[data-region="ops-reveal-reason-backdrop"]')).toBeInTheDocument()
    })

    it('modal confirm is disabled with fewer than 12 chars', () => {
      renderCalls(DEFAULT_STAFF)
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      const revealBtn = document.querySelector('[data-region="ops-reveal-trigger"]') as HTMLElement
      fireEvent.click(revealBtn)
      const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
      expect(confirmBtn).toBeInTheDocument()
      expect(confirmBtn.disabled).toBe(true)
    })

    it('modal confirm becomes enabled with ≥12 char reason', () => {
      renderCalls(DEFAULT_STAFF)
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      const revealBtn = document.querySelector('[data-region="ops-reveal-trigger"]') as HTMLElement
      fireEvent.click(revealBtn)
      const reasonInput = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLInputElement
      fireEvent.change(reasonInput, { target: { value: 'investigating this call in detail' } })
      const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
      expect(confirmBtn.disabled).toBe(false)
    })

    it('confirming reveal hides the modal', () => {
      renderCalls(DEFAULT_STAFF)
      const row = document.querySelector('[data-region="ops-calls-row"]') as HTMLElement
      fireEvent.click(row)
      const revealBtn = document.querySelector('[data-region="ops-reveal-trigger"]') as HTMLElement
      fireEvent.click(revealBtn)
      const reasonInput = document.querySelector('[data-region="ops-reveal-reason-input"]') as HTMLInputElement
      fireEvent.change(reasonInput, { target: { value: 'ops review for quality check' } })
      const confirmBtn = document.querySelector('[data-region="ops-reveal-reason-confirm"]') as HTMLButtonElement
      fireEvent.click(confirmBtn)
      expect(document.querySelector('[data-region="ops-reveal-reason-backdrop"]')).not.toBeInTheDocument()
    })
  })

  // ── Filter rail group labels ───────────────────────────────────────
  describe('Filter groups', () => {
    it('renders Outcome filter group label', () => {
      renderCalls()
      expect(screen.getByText(/outcome/i)).toBeInTheDocument()
    })

    it('renders Autonomy filter group label', () => {
      renderCalls()
      expect(screen.getByText(/autonomy/i)).toBeInTheDocument()
    })
  })
})
