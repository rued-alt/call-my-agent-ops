# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/pulse.master.spec.ts >> Pulse (/pulse) >> a11y: no serious violations
- Location: tests/e2e/master/surface/pulse.master.spec.ts:52:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-region="ops-pulse-heading"]')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[data-region="ops-pulse-heading"]')

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
  5  | export class PulsePage extends BasePage {
  6  |   readonly url = '/pulse'
  7  | 
  8  |   async goto(): Promise<void> {
  9  |     await this.gotoProtected(this.url)
  10 |     await this.expectFullyLoaded()
  11 |   }
  12 | 
  13 |   async expectFullyLoaded(): Promise<void> {
> 14 |     await expect(this.page.locator('[data-region="ops-pulse-heading"]')).toBeVisible({ timeout: 15_000 })
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  15 |   }
  16 | 
  17 |   get heading(): Locator { return this.page.locator('[data-region="ops-pulse-heading"]') }
  18 |   get tiles(): Locator { return this.page.locator('[data-region="ops-pulse-tile"]') }
  19 |   get sparks(): Locator { return this.page.locator('[data-region="ops-pulse-spark"]') }
  20 |   get alertsRegion(): Locator { return this.page.locator('[data-region="ops-pulse-alerts"]') }
  21 |   get alertRows(): Locator { return this.page.locator('[data-region="ops-pulse-alert"]') }
  22 |   get alertsEmpty(): Locator { return this.page.locator('[data-region="ops-pulse-alerts-empty"]') }
  23 |   get liveBadge(): Locator { return this.page.locator('[data-region="ops-pulse-live-badge"]') }
  24 |   get sinceLastVisit(): Locator { return this.page.locator('[data-region="ops-pulse-since-last"]') }
  25 | 
  26 |   async dismissFirstAlert(): Promise<void> {
  27 |     await this.alertRows.first().click()
  28 |   }
  29 | }
  30 | 
```