import { test, expect } from '../fixtures/auth'

/**
 * The current OpsChrome surfaces staff identity as a static initials
 * circle + role chip + 2FA indicator (no dropdown menu). This spec
 * locks the surfaced bits so any future click-to-open dropdown work
 * shows up as a green-to-red signal.
 *
 * FINDING (master-pass): the staff identity cluster is a static block,
 * not an interactive menu. The task spec calls for a dropdown with
 * sign-out — that UI does not yet exist. Specs assert the present
 * state and skip the dropdown click flow until the menu lands.
 */
test.describe('Avatar / staff identity cluster', () => {
  test('renders the staff identity cluster with role chip + 2FA indicator', async ({ opsPage }) => {
    await opsPage.goto('/mission')
    const staff = opsPage.locator('[data-region="ops-chrome-staff"]')
    await expect(staff).toBeVisible()
    await expect(staff).toHaveAttribute('data-role', /ops|owner|on-call|read-only/)
    await expect(opsPage.locator('[data-region="ops-chrome-role-badge"]')).toBeVisible()
    await expect(opsPage.locator('[data-region="ops-chrome-2fa-indicator"]')).toBeVisible()
  })

  test('role badge text matches the signed-in role for each fixture', async ({ opsPage, ownerPage, oncallPage, readonlyPage }) => {
    await opsPage.goto('/mission')
    await expect(opsPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Ops/i)
    await ownerPage.goto('/mission')
    await expect(ownerPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Owner/i)
    await oncallPage.goto('/mission')
    await expect(oncallPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/On-call/i)
    await readonlyPage.goto('/mission')
    await expect(readonlyPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Read-only/i)
  })

  test.skip('clicking avatar opens a dropdown with sign-out (NOT YET IMPLEMENTED — see spec header)', async () => {
    // Intentionally skipped — track via the master pass FINDING above.
    // Flip to .test(...) when the dropdown lands.
  })
})
