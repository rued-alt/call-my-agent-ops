# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/role-gating.master.spec.ts >> Role gating >> opsPage can reach every protected surface
- Location: tests/e2e/master/surface/role-gating.master.spec.ts:17:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('[data-region="ops-chrome"]') to be visible

```

# Page snapshot

```yaml
- paragraph [ref=e3]: Not Found
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures/auth'
  2  | 
  3  | const PROTECTED_PATHS = ['/mission', '/pulse', '/calls', '/eval', '/customers', '/costs']
  4  | 
  5  | /**
  6  |  * Helper: route guards in each surface synchronously redirect to `/`
  7  |  * when Clerk's user metadata isn't loaded yet on the first render. We
  8  |  * prime each role's page on /mission (which is also the index gate's
  9  |  * landing target) before walking the protected paths.
  10 |  */
  11 | async function primeChrome(page: import('@playwright/test').Page): Promise<void> {
  12 |   await page.goto('/mission')
> 13 |   await page.locator('[data-region="ops-chrome"]').waitFor({ state: 'visible', timeout: 20_000 })
     |                                                    ^ TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
  14 | }
  15 | 
  16 | test.describe('Role gating', () => {
  17 |   test('opsPage can reach every protected surface', async ({ opsPage }) => {
  18 |     await primeChrome(opsPage)
  19 |     for (const path of PROTECTED_PATHS) {
  20 |       await opsPage.goto(path)
  21 |       await expect(opsPage).toHaveURL(new RegExp(`${path}$`))
  22 |       // Chrome must render (every protected route mounts OpsChrome)
  23 |       await expect(opsPage.locator('[data-region="ops-chrome"]')).toBeVisible({ timeout: 10_000 })
  24 |       await expect(opsPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Ops/i)
  25 |     }
  26 |   })
  27 | 
  28 |   test('ownerPage can reach every protected surface (role-badge: Owner)', async ({ ownerPage }) => {
  29 |     await primeChrome(ownerPage)
  30 |     for (const path of PROTECTED_PATHS) {
  31 |       await ownerPage.goto(path)
  32 |       await expect(ownerPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Owner/i)
  33 |     }
  34 |   })
  35 | 
  36 |   test('oncallPage can reach every surface and shows On-call badge', async ({ oncallPage }) => {
  37 |     await primeChrome(oncallPage)
  38 |     for (const path of PROTECTED_PATHS) {
  39 |       await oncallPage.goto(path)
  40 |       await expect(oncallPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/On-call/i)
  41 |     }
  42 |   })
  43 | 
  44 |   test('readonlyPage can VIEW every surface (role-badge: Read-only)', async ({ readonlyPage }) => {
  45 |     await primeChrome(readonlyPage)
  46 |     for (const path of PROTECTED_PATHS) {
  47 |       await readonlyPage.goto(path)
  48 |       await expect(readonlyPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Read-only/i)
  49 |     }
  50 |   })
  51 | 
  52 |   test('readonlyPage on /calls does not see reveal-PII button', async ({ readonlyPage }) => {
  53 |     await primeChrome(readonlyPage)
  54 |     await readonlyPage.goto('/calls')
  55 |     await expect(readonlyPage.locator('[data-region="ops-calls-list"]')).toBeVisible({ timeout: 10_000 })
  56 |     // Open a row
  57 |     await readonlyPage.locator('[data-region="ops-calls-row"]').first().click()
  58 |     // The reveal-PII button is gated by canRevealPii(); read-only is excluded.
  59 |     const revealButtons = readonlyPage.getByRole('button', { name: /reveal/i })
  60 |     expect(await revealButtons.count()).toBe(0)
  61 |   })
  62 | 
  63 |   test('signedOutPage on /mission redirects to sign-in', async ({ signedOutPage }) => {
  64 |     await signedOutPage.goto('/mission')
  65 |     // Clerk RedirectToSignIn either bounces to Clerk-hosted page (URL
  66 |     // changes off the app origin) or shows a sign-in component. Either
  67 |     // way the Mission surface should NOT have rendered.
  68 |     await signedOutPage.waitForLoadState('networkidle').catch(() => {})
  69 |     const onMission = await signedOutPage.locator('[data-region="ops-mission-hero"]').count()
  70 |     expect(onMission).toBe(0)
  71 |   })
  72 | })
  73 | 
```