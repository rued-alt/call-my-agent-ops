# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/costs.master.spec.ts >> Costs (/costs) >> error-state: 500 falls back to fixture (initialData)
- Location: tests/e2e/master/surface/costs.master.spec.ts:42:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-region="ops-costs-heading"]')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[data-region="ops-costs-heading"]')

```

```yaml
- paragraph: Not Found
```

# Test source

```ts
  1  | import type { Locator } from '@playwright/test'
  2  | import { expect } from '@playwright/test'
  3  | import { BasePage } from './_base'
  4  | 
  5  | export class CostsPage extends BasePage {
  6  |   readonly url = '/costs'
  7  | 
  8  |   async goto(): Promise<void> {
  9  |     await this.gotoProtected(this.url)
  10 |     await this.expectFullyLoaded()
  11 |   }
  12 | 
  13 |   async expectFullyLoaded(): Promise<void> {
> 14 |     await expect(this.page.locator('[data-region="ops-costs-heading"]')).toBeVisible({ timeout: 15_000 })
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  15 |     await expect(this.page.locator('[data-region="ops-costs-table"]')).toBeVisible()
  16 |   }
  17 | 
  18 |   get heading(): Locator { return this.page.locator('[data-region="ops-costs-heading"]') }
  19 |   get rollup(): Locator { return this.page.locator('[data-region="ops-costs-rollup"]') }
  20 |   get rollupTiles(): Locator { return this.page.locator('[data-region="ops-costs-rollup-tile"]') }
  21 |   get table(): Locator { return this.page.locator('[data-region="ops-costs-table"]') }
  22 |   get rows(): Locator { return this.page.locator('[data-region="ops-costs-row"]') }
  23 |   get drawer(): Locator { return this.page.locator('[data-region="ops-costs-drawer"]') }
  24 |   get breakdownItems(): Locator { return this.page.locator('[data-region="ops-costs-breakdown-item"]') }
  25 |   get providerModelDrill(): Locator { return this.page.locator('[data-region="ops-costs-provider-model-drill"]') }
  26 |   get providerModelRows(): Locator { return this.page.locator('[data-region="ops-costs-provider-model-row"]') }
  27 | 
  28 |   async openFirstRow(): Promise<void> {
  29 |     await this.rows.first().click()
  30 |   }
  31 | }
  32 | 
```