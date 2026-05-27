import { test, expect } from '../fixtures/auth'
import { expectNoA11yViolations } from '../fixtures/a11y'
import { stubOps, stubOpsAllError } from '../fixtures/opsStubs'
import { CustomersPage } from '../pages/CustomersPage'

test.describe('Customers (/customers)', () => {
  test('renders buckets + table with no console errors', async ({ opsPage }) => {
    const c = new CustomersPage(opsPage)
    await c.expectNoConsoleErrors(async () => {
      await c.goto()
      expect(await c.bucketChips.count()).toBeGreaterThan(0)
      expect(await c.rows.count()).toBeGreaterThan(0)
    })
  })

  test('selecting a bucket chip filters the table', async ({ opsPage }) => {
    const c = new CustomersPage(opsPage)
    await c.goto()
    const all = await c.rows.count()
    // Pick a non-All chip (second chip)
    const chips = await c.bucketChips.count()
    if (chips > 1) {
      await c.bucketChips.nth(1).click()
      const filtered = await c.rows.count()
      expect(filtered).toBeLessThanOrEqual(all)
    }
  })

  test('clicking a row opens the drilldown drawer', async ({ opsPage }) => {
    const c = new CustomersPage(opsPage)
    await c.goto()
    await c.openFirstRow()
    await expect(c.drawer.first()).toBeVisible({ timeout: 5_000 })
  })

  test('empty-state: when customers endpoint returns [], surface still renders (falls back)', async ({ opsPage }) => {
    await stubOps(opsPage, 'customers', [])
    const c = new CustomersPage(opsPage)
    await c.goto()
    // Surface guards on `rows.length > 0` and falls back to fixture, so
    // we still expect the bucket region to render rather than blank.
    await expect(c.buckets).toBeVisible()
  })

  test('error-state: 500 falls back to fixture (initialData)', async ({ opsPage }) => {
    await stubOpsAllError(opsPage)
    const c = new CustomersPage(opsPage)
    await c.goto()
    await expect(c.table).toBeVisible()
  })

  test('a11y: no serious violations', async ({ opsPage }) => {
    const c = new CustomersPage(opsPage)
    await c.goto()
    await expectNoA11yViolations(opsPage, { ignoreRules: ['color-contrast'] })
  })
})
