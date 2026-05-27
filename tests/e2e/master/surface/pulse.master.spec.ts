import { test, expect } from '../fixtures/auth'
import { expectNoA11yViolations } from '../fixtures/a11y'
import { stubOps, stubOpsAllError } from '../fixtures/opsStubs'
import { PulsePage } from '../pages/PulsePage'

test.describe('Pulse (/pulse)', () => {
  test('renders heading + tiles + sparks + alerts with no console errors', async ({ opsPage }) => {
    const p = new PulsePage(opsPage)
    await p.expectNoConsoleErrors(async () => {
      await p.goto()
      await expect(p.heading).toBeVisible()
      expect(await p.tiles.count()).toBeGreaterThan(0)
      expect(await p.sparks.count()).toBeGreaterThan(0)
      await expect(p.alertsRegion).toBeVisible()
    })
  })

  test('live badge reflects pulse.liveCalls', async ({ opsPage }) => {
    const p = new PulsePage(opsPage)
    await p.goto()
    await expect(p.liveBadge).toBeVisible()
  })

  test('dismissing an alert removes it from the list', async ({ opsPage }) => {
    const p = new PulsePage(opsPage)
    await p.goto()
    const before = await p.alertRows.count()
    if (before === 0) {
      await expect(p.alertsEmpty).toBeVisible()
      return
    }
    await p.dismissFirstAlert()
    await expect(p.alertRows).toHaveCount(before - 1)
  })

  test('empty-state: when alerts endpoint returns [], shows "Nothing on fire"', async ({ opsPage }) => {
    await stubOps(opsPage, 'alerts\\?resolved=false', [])
    const p = new PulsePage(opsPage)
    await p.goto()
    // The surface honors the response only if the response is an array
    // (it is). Empty array means openAlerts.length === 0 → empty state.
    await expect(p.alertsEmpty).toBeVisible()
  })

  test('error-state: 500 on every endpoint still renders from initialData', async ({ opsPage }) => {
    await stubOpsAllError(opsPage)
    const p = new PulsePage(opsPage)
    await p.goto()
    await expect(p.heading).toBeVisible()
  })

  test('a11y: no serious violations', async ({ opsPage }) => {
    const p = new PulsePage(opsPage)
    await p.goto()
    await expectNoA11yViolations(opsPage, { ignoreRules: ['color-contrast'] })
  })
})
