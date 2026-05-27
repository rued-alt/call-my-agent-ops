# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/avatar-menu.master.spec.ts >> Avatar / staff identity cluster >> renders the staff identity cluster with role chip + 2FA indicator
- Location: tests/e2e/master/surface/avatar-menu.master.spec.ts:15:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-region="ops-chrome-staff"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-region="ops-chrome-staff"]')

```

```yaml
- paragraph: Not Found
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures/auth'
  2  | 
  3  | /**
  4  |  * The current OpsChrome surfaces staff identity as a static initials
  5  |  * circle + role chip + 2FA indicator (no dropdown menu). This spec
  6  |  * locks the surfaced bits so any future click-to-open dropdown work
  7  |  * shows up as a green-to-red signal.
  8  |  *
  9  |  * FINDING (master-pass): the staff identity cluster is a static block,
  10 |  * not an interactive menu. The task spec calls for a dropdown with
  11 |  * sign-out — that UI does not yet exist. Specs assert the present
  12 |  * state and skip the dropdown click flow until the menu lands.
  13 |  */
  14 | test.describe('Avatar / staff identity cluster', () => {
  15 |   test('renders the staff identity cluster with role chip + 2FA indicator', async ({ opsPage }) => {
  16 |     await opsPage.goto('/mission')
  17 |     const staff = opsPage.locator('[data-region="ops-chrome-staff"]')
> 18 |     await expect(staff).toBeVisible()
     |                         ^ Error: expect(locator).toBeVisible() failed
  19 |     await expect(staff).toHaveAttribute('data-role', /ops|owner|on-call|read-only/)
  20 |     await expect(opsPage.locator('[data-region="ops-chrome-role-badge"]')).toBeVisible()
  21 |     await expect(opsPage.locator('[data-region="ops-chrome-2fa-indicator"]')).toBeVisible()
  22 |   })
  23 | 
  24 |   test('role badge text matches the signed-in role for each fixture', async ({ opsPage, ownerPage, oncallPage, readonlyPage }) => {
  25 |     await opsPage.goto('/mission')
  26 |     await expect(opsPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Ops/i)
  27 |     await ownerPage.goto('/mission')
  28 |     await expect(ownerPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Owner/i)
  29 |     await oncallPage.goto('/mission')
  30 |     await expect(oncallPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/On-call/i)
  31 |     await readonlyPage.goto('/mission')
  32 |     await expect(readonlyPage.locator('[data-region="ops-chrome-role-badge"]')).toHaveText(/Read-only/i)
  33 |   })
  34 | 
  35 |   test.skip('clicking avatar opens a dropdown with sign-out (NOT YET IMPLEMENTED — see spec header)', async () => {
  36 |     // Intentionally skipped — track via the master pass FINDING above.
  37 |     // Flip to .test(...) when the dropdown lands.
  38 |   })
  39 | })
  40 | 
```