import { test, expect } from '../fixtures/auth'

const PROTECTED_PATHS = ['/mission', '/pulse', '/calls', '/eval', '/customers', '/costs']

/**
 * Helper: route guards in each surface synchronously redirect to `/`
 * when Clerk's user metadata isn't loaded yet on the first render. We
 * prime each role's page on /mission (which is also the index gate's
 * landing target) before walking the protected paths.
 */
async function primeChrome(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/mission')
  await page.locator('[data-region="ops-chrome"]').waitFor({ state: 'visible', timeout: 20_000 })
}

test.describe('Role gating', () => {
  test('opsPage can reach every protected surface', async ({ opsPage }) => {
    await primeChrome(opsPage)
    for (const path of PROTECTED_PATHS) {
      await opsPage.goto(path)
      await expect(opsPage).toHaveURL(new RegExp(`${path}$`))
      // Chrome must render (every protected route mounts OpsChrome)
      await expect(opsPage.locator('[data-region="ops-chrome"]')).toBeVisible({ timeout: 10_000 })
      await expect(opsPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Ops/i)
    }
  })

  test('ownerPage can reach every protected surface (role-badge: Owner)', async ({ ownerPage }) => {
    await primeChrome(ownerPage)
    for (const path of PROTECTED_PATHS) {
      await ownerPage.goto(path)
      await expect(ownerPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Owner/i)
    }
  })

  test('oncallPage can reach every surface and shows On-call badge', async ({ oncallPage }) => {
    await primeChrome(oncallPage)
    for (const path of PROTECTED_PATHS) {
      await oncallPage.goto(path)
      await expect(oncallPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/On-call/i)
    }
  })

  test('readonlyPage can VIEW every surface (role-badge: Read-only)', async ({ readonlyPage }) => {
    await primeChrome(readonlyPage)
    for (const path of PROTECTED_PATHS) {
      await readonlyPage.goto(path)
      await expect(readonlyPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Read-only/i)
    }
  })

  test('readonlyPage on /calls does not see reveal-PII button', async ({ readonlyPage }) => {
    await primeChrome(readonlyPage)
    await readonlyPage.goto('/calls')
    await expect(readonlyPage.locator('[data-region="ops-calls-list"]')).toBeVisible({ timeout: 10_000 })
    // Open a row
    await readonlyPage.locator('[data-region="ops-calls-row"]').first().click()
    // The reveal-PII button is gated by canRevealPii(); read-only is excluded.
    const revealButtons = readonlyPage.getByRole('button', { name: /reveal/i })
    expect(await revealButtons.count()).toBe(0)
  })

  test('signedOutPage on /mission redirects to sign-in', async ({ signedOutPage }) => {
    await signedOutPage.goto('/mission')
    // Clerk RedirectToSignIn either bounces to Clerk-hosted page (URL
    // changes off the app origin) or shows a sign-in component. Either
    // way the Mission surface should NOT have rendered.
    await signedOutPage.waitForLoadState('networkidle').catch(() => {})
    const onMission = await signedOutPage.locator('[data-region="ops-mission-hero"]').count()
    expect(onMission).toBe(0)
  })
})
