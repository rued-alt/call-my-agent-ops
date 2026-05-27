# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/audit-drawer.master.spec.ts >> Audit drawer >> every audit entry carries action + actor + timestamp
- Location: tests/e2e/master/surface/audit-drawer.master.spec.ts:24:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-region="ops-chrome-audit-button"]')

```

# Page snapshot

```yaml
- paragraph [ref=e3]: Not Found
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures/auth'
  2  | 
  3  | /**
  4  |  * The OpsChrome exposes a global Audit button. Clicking it slides down
  5  |  * the audit drawer (ops-audit-drawer) with every action + actor +
  6  |  * timestamp.
  7  |  *
  8  |  * The task asks us to verify every audited mutation opens the audit
  9  |  * drawer. The current architecture is INVERSE — the audit drawer is a
  10 |  * passive log of past mutations, not a modal that pops on each click.
  11 |  * This spec verifies the drawer surface itself and that entries carry
  12 |  * action + actor + timestamp.
  13 |  */
  14 | test.describe('Audit drawer', () => {
  15 |   test('Audit button is visible and opens the drawer', async ({ opsPage }) => {
  16 |     await opsPage.goto('/mission')
  17 |     const btn = opsPage.locator('[data-region="ops-chrome-audit-button"]')
  18 |     await expect(btn).toBeVisible()
  19 |     await btn.click()
  20 |     const drawer = opsPage.locator('[data-region="ops-audit-drawer"]')
  21 |     await expect(drawer).toBeVisible({ timeout: 5_000 })
  22 |   })
  23 | 
  24 |   test('every audit entry carries action + actor + timestamp', async ({ opsPage }) => {
  25 |     await opsPage.goto('/mission')
> 26 |     await opsPage.locator('[data-region="ops-chrome-audit-button"]').click()
     |                                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  27 |     const entries = opsPage.locator('[data-region="ops-audit-entry"]')
  28 |     expect(await entries.count()).toBeGreaterThan(0)
  29 |     // Each entry must have action attribute + visible staff line + visible time
  30 |     const first = entries.first()
  31 |     await expect(first).toHaveAttribute('data-action', /.+/)
  32 |     const text = (await first.textContent()) ?? ''
  33 |     // Staff line is "{name} ({role}) · {target}"; the time renders as
  34 |     // "h:mm AM/PM". Assert both shapes are present.
  35 |     expect(text).toMatch(/[a-z]/i)
  36 |     expect(text).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i)
  37 |   })
  38 | 
  39 |   test('High-risk filter narrows the entry list', async ({ opsPage }) => {
  40 |     await opsPage.goto('/mission')
  41 |     await opsPage.locator('[data-region="ops-chrome-audit-button"]').click()
  42 |     const before = await opsPage.locator('[data-region="ops-audit-entry"]').count()
  43 |     await opsPage.getByLabel(/High-risk only/i).check()
  44 |     const after = await opsPage.locator('[data-region="ops-audit-entry"]').count()
  45 |     expect(after).toBeLessThanOrEqual(before)
  46 |     // Every visible entry must now be high-risk
  47 |     const flags = await opsPage.locator('[data-region="ops-audit-entry"]').evaluateAll((els) =>
  48 |       els.map((el) => el.getAttribute('data-high-risk')),
  49 |     )
  50 |     for (const f of flags) expect(f).toBe('true')
  51 |   })
  52 | 
  53 |   test('close button dismisses the drawer', async ({ opsPage }) => {
  54 |     await opsPage.goto('/mission')
  55 |     await opsPage.locator('[data-region="ops-chrome-audit-button"]').click()
  56 |     await expect(opsPage.locator('[data-region="ops-audit-drawer"]')).toBeVisible()
  57 |     await opsPage.locator('[data-region="ops-audit-close"]').click()
  58 |     await expect(opsPage.locator('[data-region="ops-audit-drawer"]')).toHaveCount(0)
  59 |   })
  60 | })
  61 | 
```