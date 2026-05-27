import { test, expect } from '../fixtures/auth'
import { expectNoA11yViolations } from '../fixtures/a11y'
import { stubOps, stubOpsAllError } from '../fixtures/opsStubs'
import { CallsPage } from '../pages/CallsPage'

test.describe('Calls (/calls)', () => {
  test('renders filter rail + search + list with no console errors', async ({ opsPage }) => {
    const c = new CallsPage(opsPage)
    await c.expectNoConsoleErrors(async () => {
      await c.goto()
      await expect(c.filtersRail).toBeVisible()
      await expect(c.search).toBeVisible()
      await expect(c.list).toBeVisible()
      expect(await c.filterChips.count()).toBeGreaterThan(0)
      expect(await c.rows.count()).toBeGreaterThan(0)
    })
  })

  test('toggling a filter chip filters the list + reveals clear button', async ({ opsPage }) => {
    const c = new CallsPage(opsPage)
    await c.goto()
    await c.toggleFirstChip()
    await expect(c.clearFilters).toBeVisible()
    await c.clearFilters.click()
    await expect(c.clearFilters).toHaveCount(0)
  })

  test('typing in search updates the count line', async ({ opsPage }) => {
    const c = new CallsPage(opsPage)
    await c.goto()
    const before = (await c.count.textContent()) ?? ''
    await c.typeSearch('zzzzz-no-match-xyz')
    await expect(c.empty).toBeVisible()
    const after = (await c.count.textContent()) ?? ''
    expect(after).not.toBe(before)
  })

  test('clicking a row opens the inline drawer', async ({ opsPage }) => {
    const c = new CallsPage(opsPage)
    await c.goto()
    await c.openFirstRow()
    // Drawer has data-region "ops-calls-row-detail" inside the panel
    await expect(opsPage.locator('[data-region="ops-calls-row-detail"]').first()).toBeVisible({ timeout: 5_000 })
  })

  test('empty-state: when calls endpoint returns [], empty cell renders', async ({ opsPage }) => {
    await stubOps(opsPage, 'calls\\?limit=200', [])
    const c = new CallsPage(opsPage)
    await c.goto()
    await expect(c.empty).toBeVisible()
  })

  test('error-state: 500 falls back to fixture (initialData)', async ({ opsPage }) => {
    await stubOpsAllError(opsPage)
    const c = new CallsPage(opsPage)
    await c.goto()
    await expect(c.list).toBeVisible()
  })

  test('a11y: no serious violations', async ({ opsPage }) => {
    const c = new CallsPage(opsPage)
    await c.goto()
    await expectNoA11yViolations(opsPage, { ignoreRules: ['color-contrast'] })
  })
})
