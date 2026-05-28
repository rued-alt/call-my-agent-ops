import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpsCostsPreview } from './OpsCostsPreview'
import { TOKENS } from '../../lib/brand'
import { OPS_COSTS, OPS_CUSTOMERS } from '../../data/opsFixture'

// jsdom normalises hex inline styles to rgb(). Helper to match either form.
function borderContainsColor(borderLeft: string, hexColor: string): boolean {
  if (borderLeft.includes(hexColor)) return true
  const m = hexColor
    .replace('#', '')
    .match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return false
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return borderLeft.includes(`rgb(${r}, ${g}, ${b})`)
}

// Wrap the component in a fresh QueryClient for each test.
function renderCosts() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <OpsCostsPreview t={TOKENS} />
    </QueryClientProvider>,
  )
}

// Pre-compute rollup values from fixture (same logic as the component)
const totalCost = OPS_COSTS.reduce((sum, r) => sum + r.costLast30d, 0)
const totalRev = OPS_COSTS.reduce((sum, r) => sum + r.revenueLast30d, 0)
const totalMargin = totalRev - totalCost
const totalCalls = OPS_COSTS.reduce((sum, r) => sum + r.callsLast30d, 0)
const blendedCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0
const lossMakers = OPS_COSTS.filter((r) => r.marginLast30d < 0).length

describe('OpsCostsPreview', () => {
  // ── Portfolio rollup tiles ────────────────────────────────────────────
  describe('Portfolio rollup tiles', () => {
    it('renders the rollup region', () => {
      renderCosts()
      expect(
        document.querySelector('[data-region="ops-costs-rollup"]'),
      ).toBeInTheDocument()
    })

    it('renders all 4 rollup tiles', () => {
      renderCosts()
      const tiles = document.querySelectorAll(
        '[data-region="ops-costs-rollup-tile"]',
      )
      expect(tiles).toHaveLength(4)
    })

    it('Total cost tile shows summed value from fixture', () => {
      renderCosts()
      expect(
        screen.getByText(`$${totalCost.toFixed(2)}`),
      ).toBeInTheDocument()
    })

    it('Total revenue tile shows summed value from fixture', () => {
      renderCosts()
      expect(
        screen.getByText(`$${totalRev.toFixed(2)}`),
      ).toBeInTheDocument()
    })

    it('Net margin tile shows correct signed value', () => {
      renderCosts()
      expect(
        screen.getByText(`$${totalMargin.toFixed(2)}`),
      ).toBeInTheDocument()
    })

    it('Loss-makers tile shows correct count', () => {
      renderCosts()
      expect(
        screen.getByText(`${lossMakers} / ${OPS_COSTS.length}`),
      ).toBeInTheDocument()
    })

    it('Loss-makers tile sub-line shows blended cost-per-call', () => {
      renderCosts()
      expect(
        screen.getByText(
          `blended $${blendedCostPerCall.toFixed(3)} per call`,
        ),
      ).toBeInTheDocument()
    })

    it('renders "Total cost" label', () => {
      renderCosts()
      expect(screen.getByText('Total cost')).toBeInTheDocument()
    })

    it('renders "Total revenue" label', () => {
      renderCosts()
      expect(screen.getByText('Total revenue')).toBeInTheDocument()
    })

    it('renders "Net margin" label', () => {
      renderCosts()
      expect(screen.getByText('Net margin')).toBeInTheDocument()
    })

    it('renders "Loss-makers" label', () => {
      renderCosts()
      expect(screen.getByText('Loss-makers')).toBeInTheDocument()
    })
  })

  // ── Per-customer table ────────────────────────────────────────────────
  describe('Per-customer table', () => {
    it('renders the table region', () => {
      renderCosts()
      expect(
        document.querySelector('[data-region="ops-costs-table"]'),
      ).toBeInTheDocument()
    })

    it('renders one row per cost record', () => {
      renderCosts()
      const rows = document.querySelectorAll('[data-region="ops-costs-row"]')
      expect(rows).toHaveLength(OPS_COSTS.length)
    })

    it('renders all customer business names', () => {
      renderCosts()
      for (const row of OPS_COSTS) {
        // Each business name appears at least once
        expect(screen.getAllByText(row.customerBusiness).length).toBeGreaterThan(0)
      }
    })

    it('renders account count and call count in heading', () => {
      renderCosts()
      expect(
        screen.getByText(
          `${OPS_COSTS.length} accounts · ${totalCalls.toLocaleString()} calls`,
        ),
      ).toBeInTheDocument()
    })
  })

  // ── Sort order: loss-makers first ────────────────────────────────────
  describe('Sort order — loss-makers first', () => {
    it('rows are sorted by margin ASC (most-negative first)', () => {
      renderCosts()
      const rows = document.querySelectorAll('[data-region="ops-costs-row"]')
      const sorted = [...OPS_COSTS].sort(
        (a, b) => a.marginLast30d - b.marginLast30d,
      )
      // The first DOM row should correspond to the most-negative-margin customer
      expect(rows[0].getAttribute('data-customer-id')).toBe(
        sorted[0].customerId,
      )
    })

    it('most-negative-margin customer appears first', () => {
      renderCosts()
      const sorted = [...OPS_COSTS].sort(
        (a, b) => a.marginLast30d - b.marginLast30d,
      )
      const firstCustomerId = sorted[0].customerId
      const firstRowEl = document.querySelector(
        `[data-customer-id="${firstCustomerId}"]`,
      )
      expect(firstRowEl).toBeInTheDocument()
    })
  })

  // ── Loss-maker visual distinction ────────────────────────────────────
  describe('Loss-makers visually distinguished', () => {
    it('loss-maker rows have data-loss-maker="true"', () => {
      renderCosts()
      const lossMakerRows = document.querySelectorAll(
        '[data-region="ops-costs-row"][data-loss-maker="true"]',
      )
      const expectedCount = OPS_COSTS.filter(
        (r) => r.marginLast30d < 0,
      ).length
      expect(lossMakerRows.length).toBe(expectedCount)
    })

    it('profitable rows have data-loss-maker="false"', () => {
      renderCosts()
      const profitableRows = document.querySelectorAll(
        '[data-region="ops-costs-row"][data-loss-maker="false"]',
      )
      const expectedCount = OPS_COSTS.filter(
        (r) => r.marginLast30d >= 0,
      ).length
      expect(profitableRows.length).toBe(expectedCount)
    })

    it('loss-maker row has error-colored left border', () => {
      renderCosts()
      const lossMakerRecord = OPS_COSTS.find((r) => r.marginLast30d < 0)!
      const el = document.querySelector(
        `[data-customer-id="${lossMakerRecord.customerId}"]`,
      ) as HTMLElement
      expect(el).toBeInTheDocument()
      expect(el.getAttribute('data-loss-maker')).toBe('true')
      expect(borderContainsColor(el.style.borderLeft, TOKENS.color.error)).toBe(
        true,
      )
    })

    it('profitable row has primary-colored left border', () => {
      renderCosts()
      const profitableRecord = OPS_COSTS.find((r) => r.marginLast30d > 0)!
      const el = document.querySelector(
        `[data-customer-id="${profitableRecord.customerId}"]`,
      ) as HTMLElement
      expect(el).toBeInTheDocument()
      expect(el.getAttribute('data-loss-maker')).toBe('false')
      expect(
        borderContainsColor(el.style.borderLeft, TOKENS.color.primary),
      ).toBe(true)
    })
  })

  // ── Cents-to-dollars formatting ───────────────────────────────────────
  // Note: fixture stores values already in dollars, not cents. The spec
  // says "cents → $" because the backend will eventually return cents;
  // the component displays in dollars (toFixed(2)). These tests verify
  // the dollar formatting is correct.
  describe('Dollar formatting', () => {
    it('cost column renders with $ prefix and 2 decimal places', () => {
      renderCosts()
      // Pick a row with non-zero cost
      const record = OPS_COSTS.find((r) => r.costLast30d > 0)!
      // The formatted value must appear in the DOM
      expect(
        screen.getAllByText(`$${record.costLast30d.toFixed(2)}`).length,
      ).toBeGreaterThan(0)
    })

    it('revenue column renders with $ prefix and 2 decimal places', () => {
      renderCosts()
      const record = OPS_COSTS.find((r) => r.revenueLast30d > 0)!
      expect(
        screen.getAllByText(`$${record.revenueLast30d.toFixed(2)}`).length,
      ).toBeGreaterThan(0)
    })

    it('margin column renders signed format with $ and 2 decimal places', () => {
      renderCosts()
      // Find a negative-margin row and verify it shows "−$X.XX"
      const negRecord = OPS_COSTS.find((r) => r.marginLast30d < 0)!
      const negEl = document.querySelector(
        `[data-customer-id="${negRecord.customerId}"]`,
      )!
      expect(negEl.textContent).toContain('−$')
    })

    it('cost-per-call renders with 3 decimal places', () => {
      renderCosts()
      const record = OPS_COSTS.find((r) => r.costPerCall > 0)!
      expect(
        screen.getAllByText(`$${record.costPerCall.toFixed(3)}`).length,
      ).toBeGreaterThan(0)
    })

    it('plan label renders for customers with a known plan', () => {
      renderCosts()
      // Find a customer whose plan we know
      const costRecord = OPS_COSTS[0]
      const customer = OPS_CUSTOMERS.find(
        (c) => c.id === costRecord.customerId,
      )!
      expect(
        screen.getAllByText(customer.plan).length,
      ).toBeGreaterThan(0)
    })
  })

  // ── Drawer opens on row click ─────────────────────────────────────────
  describe('Cost breakdown drawer', () => {
    it('no drawer is shown initially', () => {
      renderCosts()
      const drawers = document.querySelectorAll(
        '[data-region="ops-costs-drawer"]',
      )
      expect(drawers).toHaveLength(0)
    })

    it('clicking a row opens the breakdown drawer', () => {
      renderCosts()
      const rowRecord = OPS_COSTS.find((r) => r.breakdown)!
      const row = document.querySelector(
        `[data-customer-id="${rowRecord.customerId}"]`,
      ) as HTMLElement
      fireEvent.click(row)
      const drawer = document.querySelector(
        `[data-region="ops-costs-drawer"][data-customer-id="${rowRecord.customerId}"]`,
      )
      expect(drawer).toBeInTheDocument()
    })

    it('drawer shows all 4 cost breakdown items', () => {
      renderCosts()
      const rowRecord = OPS_COSTS.find((r) => r.breakdown)!
      const row = document.querySelector(
        `[data-customer-id="${rowRecord.customerId}"]`,
      ) as HTMLElement
      fireEvent.click(row)
      const items = document.querySelectorAll(
        '[data-region="ops-costs-breakdown-item"]',
      )
      expect(items).toHaveLength(4)
    })

    it('drawer shows LLM cost breakdown item', () => {
      renderCosts()
      const rowRecord = OPS_COSTS.find((r) => r.breakdown)!
      const row = document.querySelector(
        `[data-customer-id="${rowRecord.customerId}"]`,
      ) as HTMLElement
      fireEvent.click(row)
      const llmItem = document.querySelector(
        '[data-breakdown-key="llm"]',
      )
      expect(llmItem).toBeInTheDocument()
    })

    it('drawer shows STT cost breakdown item', () => {
      renderCosts()
      const rowRecord = OPS_COSTS.find((r) => r.breakdown)!
      const row = document.querySelector(
        `[data-customer-id="${rowRecord.customerId}"]`,
      ) as HTMLElement
      fireEvent.click(row)
      expect(document.querySelector('[data-breakdown-key="stt"]')).toBeInTheDocument()
    })

    it('drawer shows TTS cost breakdown item', () => {
      renderCosts()
      const rowRecord = OPS_COSTS.find((r) => r.breakdown)!
      const row = document.querySelector(
        `[data-customer-id="${rowRecord.customerId}"]`,
      ) as HTMLElement
      fireEvent.click(row)
      expect(document.querySelector('[data-breakdown-key="tts"]')).toBeInTheDocument()
    })

    it('drawer shows telephony cost breakdown item', () => {
      renderCosts()
      const rowRecord = OPS_COSTS.find((r) => r.breakdown)!
      const row = document.querySelector(
        `[data-customer-id="${rowRecord.customerId}"]`,
      ) as HTMLElement
      fireEvent.click(row)
      expect(
        document.querySelector('[data-breakdown-key="telephony"]'),
      ).toBeInTheDocument()
    })

    it('clicking the same row again closes the drawer', () => {
      renderCosts()
      const rowRecord = OPS_COSTS.find((r) => r.breakdown)!
      const row = document.querySelector(
        `[data-customer-id="${rowRecord.customerId}"]`,
      ) as HTMLElement
      fireEvent.click(row)
      // Drawer open
      expect(
        document.querySelector(
          `[data-region="ops-costs-drawer"][data-customer-id="${rowRecord.customerId}"]`,
        ),
      ).toBeInTheDocument()
      // Click again to close
      fireEvent.click(row)
      expect(
        document.querySelector(
          `[data-region="ops-costs-drawer"][data-customer-id="${rowRecord.customerId}"]`,
        ),
      ).not.toBeInTheDocument()
    })

    it('drawer shows correct LLM cost value', () => {
      renderCosts()
      const rowRecord = OPS_COSTS.find((r) => r.breakdown)!
      const row = document.querySelector(
        `[data-customer-id="${rowRecord.customerId}"]`,
      ) as HTMLElement
      fireEvent.click(row)
      const llmItem = document.querySelector('[data-breakdown-key="llm"]')!
      expect(llmItem.textContent).toContain(
        `$${rowRecord.breakdown!.llmCost.toFixed(2)}`,
      )
    })

    it('only one drawer open at a time — clicking a new row closes the old', () => {
      renderCosts()
      const sorted = [...OPS_COSTS]
        .sort((a, b) => a.marginLast30d - b.marginLast30d)
        .filter((r) => r.breakdown)
      const first = sorted[0]
      const second = sorted[1]

      const firstRow = document.querySelector(
        `[data-customer-id="${first.customerId}"]`,
      ) as HTMLElement
      const secondRow = document.querySelector(
        `[data-customer-id="${second.customerId}"]`,
      ) as HTMLElement

      fireEvent.click(firstRow)
      expect(
        document.querySelector(
          `[data-region="ops-costs-drawer"][data-customer-id="${first.customerId}"]`,
        ),
      ).toBeInTheDocument()

      fireEvent.click(secondRow)
      // First drawer should be gone
      expect(
        document.querySelector(
          `[data-region="ops-costs-drawer"][data-customer-id="${first.customerId}"]`,
        ),
      ).not.toBeInTheDocument()
      // Second drawer should be open
      expect(
        document.querySelector(
          `[data-region="ops-costs-drawer"][data-customer-id="${second.customerId}"]`,
        ),
      ).toBeInTheDocument()
    })
  })

  // ── Heading ───────────────────────────────────────────────────────────
  describe('Heading', () => {
    it('renders "Costs · trailing 30 days" heading', () => {
      renderCosts()
      expect(
        screen.getByText('Costs · trailing 30 days'),
      ).toBeInTheDocument()
    })
  })

  // ── Table column headers ──────────────────────────────────────────────
  describe('Table column headers', () => {
    it('renders Customer column header', () => {
      renderCosts()
      expect(screen.getByText('Customer')).toBeInTheDocument()
    })

    it('renders Calls column header', () => {
      renderCosts()
      expect(screen.getByText('Calls')).toBeInTheDocument()
    })

    it('renders Cost column header', () => {
      renderCosts()
      expect(screen.getByText('Cost')).toBeInTheDocument()
    })

    it('renders Revenue column header', () => {
      renderCosts()
      expect(screen.getByText('Revenue')).toBeInTheDocument()
    })

    it('renders Margin column header', () => {
      renderCosts()
      expect(screen.getByText('Margin')).toBeInTheDocument()
    })

    it('renders Cost / call column header', () => {
      renderCosts()
      expect(screen.getByText('Cost / call')).toBeInTheDocument()
    })
  })

  // ── Provider×model drill-down (under each category) ─────────────────
  describe('provider × model drill-down', () => {
    function openDanielsDrawer() {
      // Daniel's Trattoria is the only seeded row with byProviderModel data.
      const row = document.querySelector(
        '[data-region="ops-costs-row"][data-customer-id="cust-daniel"]',
      ) as HTMLButtonElement | null
      expect(row).not.toBeNull()
      fireEvent.click(row!)
    }

    it('renders the drawer for the clicked customer', () => {
      renderCosts()
      openDanielsDrawer()
      const drawer = document.querySelector(
        '[data-region="ops-costs-drawer"][data-customer-id="cust-daniel"]',
      )
      expect(drawer).not.toBeNull()
    })

    it('renders a provider×model drill section for the LLM category', () => {
      renderCosts()
      openDanielsDrawer()
      const drill = document.querySelector(
        '[data-region="ops-costs-provider-model-drill"][data-drill-category="llm"]',
      )
      expect(drill).not.toBeNull()
    })

    it('renders one row per (provider, model) line for the LLM category', () => {
      renderCosts()
      openDanielsDrawer()
      const llmDrill = document.querySelector(
        '[data-region="ops-costs-provider-model-drill"][data-drill-category="llm"]',
      )!
      const rows = llmDrill.querySelectorAll(
        '[data-region="ops-costs-provider-model-row"]',
      )
      // Daniel's seeded with 2 LLM rows: gpt-5-realtime + gpt-5-mini
      expect(rows.length).toBe(2)
    })

    it('orders provider×model rows by cost descending (biggest first)', () => {
      renderCosts()
      openDanielsDrawer()
      const llmDrill = document.querySelector(
        '[data-region="ops-costs-provider-model-drill"][data-drill-category="llm"]',
      )!
      const rows = Array.from(
        llmDrill.querySelectorAll('[data-region="ops-costs-provider-model-row"]'),
      ) as HTMLElement[]
      expect(rows[0].getAttribute('data-model')).toBe('gpt-5-realtime')
      expect(rows[1].getAttribute('data-model')).toBe('gpt-5-mini')
    })

    it('exposes provider + model as data attributes', () => {
      renderCosts()
      openDanielsDrawer()
      const realtimeRow = document.querySelector(
        '[data-region="ops-costs-provider-model-row"][data-model="gpt-5-realtime"]',
      ) as HTMLElement | null
      expect(realtimeRow).not.toBeNull()
      expect(realtimeRow!.getAttribute('data-provider')).toBe('OpenAI')
    })

    it('renders per-row dollar amount in the drill', () => {
      renderCosts()
      openDanielsDrawer()
      const realtimeRow = document.querySelector(
        '[data-region="ops-costs-provider-model-row"][data-model="gpt-5-realtime"]',
      )!
      expect(realtimeRow.textContent).toContain('$31.20')
    })

    it('skips drill section for categories with no provider×model data', () => {
      // Marco's row has category-only breakdown (no byProviderModel) — drawer
      // should show no drill sections at all.
      renderCosts()
      const marcoRow = document.querySelector(
        '[data-region="ops-costs-row"][data-customer-id="cust-marco"]',
      ) as HTMLButtonElement | null
      expect(marcoRow).not.toBeNull()
      fireEvent.click(marcoRow!)
      const drills = document.querySelectorAll(
        '[data-region="ops-costs-drawer"][data-customer-id="cust-marco"] [data-region="ops-costs-provider-model-drill"]',
      )
      expect(drills.length).toBe(0)
    })
  })
})
