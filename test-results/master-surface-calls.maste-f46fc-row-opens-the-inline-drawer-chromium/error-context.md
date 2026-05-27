# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/calls.master.spec.ts >> Calls (/calls) >> clicking a row opens the inline drawer
- Location: tests/e2e/master/surface/calls.master.spec.ts:38:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-region="ops-calls-filters"]')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[data-region="ops-calls-filters"]')

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
  5  | export class CallsPage extends BasePage {
  6  |   readonly url = '/calls'
  7  | 
  8  |   async goto(): Promise<void> {
  9  |     await this.gotoProtected(this.url)
  10 |     await this.expectFullyLoaded()
  11 |   }
  12 | 
  13 |   async expectFullyLoaded(): Promise<void> {
> 14 |     await expect(this.page.locator('[data-region="ops-calls-filters"]')).toBeVisible({ timeout: 15_000 })
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  15 |     await expect(this.page.locator('[data-region="ops-calls-list"]')).toBeVisible()
  16 |   }
  17 | 
  18 |   get filtersRail(): Locator { return this.page.locator('[data-region="ops-calls-filters"]') }
  19 |   get filterChips(): Locator { return this.page.locator('[data-region="ops-calls-filter-chip"]') }
  20 |   get clearFilters(): Locator { return this.page.locator('[data-region="ops-calls-clear-filters"]') }
  21 |   get search(): Locator { return this.page.locator('[data-region="ops-calls-search"]') }
  22 |   get count(): Locator { return this.page.locator('[data-region="ops-calls-count"]') }
  23 |   get list(): Locator { return this.page.locator('[data-region="ops-calls-list"]') }
  24 |   get rows(): Locator { return this.page.locator('[data-region="ops-calls-row"]') }
  25 |   get empty(): Locator { return this.page.locator('[data-region="ops-calls-empty"]') }
  26 |   get rowDetail(): Locator { return this.page.locator('[data-region="ops-calls-row-detail"]') }
  27 | 
  28 |   async toggleFirstChip(): Promise<void> {
  29 |     await this.filterChips.first().click()
  30 |   }
  31 | 
  32 |   async typeSearch(q: string): Promise<void> {
  33 |     await this.search.fill(q)
  34 |   }
  35 | 
  36 |   async openFirstRow(): Promise<void> {
  37 |     await this.rows.first().click()
  38 |   }
  39 | }
  40 | 
```