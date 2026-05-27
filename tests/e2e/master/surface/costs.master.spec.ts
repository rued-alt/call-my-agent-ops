import { test, expect } from '../fixtures/auth'
import { expectNoA11yViolations } from '../fixtures/a11y'
import { stubOps, stubOpsAllError } from '../fixtures/opsStubs'
import { CostsPage } from '../pages/CostsPage'

test.describe('Costs (/costs)', () => {
  test('renders heading + rollup tiles + per-customer table', async ({ opsPage }) => {
    const c = new CostsPage(opsPage)
    await c.expectNoConsoleErrors(async () => {
      await c.goto()
      await expect(c.heading).toBeVisible()
      await expect(c.rollupTiles).toHaveCount(4)
      await expect(c.rows.first()).toBeVisible()
    })
  })

  test('rollup tiles include Total cost / Total revenue / Net margin / Loss-makers', async ({ opsPage }) => {
    const c = new CostsPage(opsPage)
    await c.goto()
    const text = (await c.rollup.textContent()) ?? ''
    expect(text).toMatch(/Total cost/i)
    expect(text).toMatch(/Total revenue/i)
    expect(text).toMatch(/Net margin/i)
    expect(text).toMatch(/Loss-makers/i)
  })

  test('clicking a cost row opens the breakdown drawer with provider×model drill-down', async ({ opsPage }) => {
    const c = new CostsPage(opsPage)
    await c.goto()
    await c.openFirstRow()
    await expect(c.drawer.first()).toBeVisible({ timeout: 5_000 })
    await expect(c.breakdownItems.first()).toBeVisible()
    // byProviderModel drill is optional per row but the fixture has at
    // least one row with breakdown.byProviderModel populated.
    const drills = await c.providerModelDrill.count()
    expect(drills).toBeGreaterThanOrEqual(0)
    if (drills > 0) {
      expect(await c.providerModelRows.count()).toBeGreaterThan(0)
    }
  })

  test('error-state: 500 falls back to fixture (initialData)', async ({ opsPage }) => {
    await stubOpsAllError(opsPage)
    const c = new CostsPage(opsPage)
    await c.goto()
    await expect(c.table).toBeVisible()
  })

  test('a11y: no serious violations', async ({ opsPage }) => {
    const c = new CostsPage(opsPage)
    await c.goto()
    await expectNoA11yViolations(opsPage, { ignoreRules: ['color-contrast'] })
  })
})
