# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/customers.master.spec.ts >> Customers (/customers) >> selecting a bucket chip filters the table
- Location: tests/e2e/master/surface/customers.master.spec.ts:16:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-region="ops-customers-buckets"]')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[data-region="ops-customers-buckets"]')

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
  5  | export class CustomersPage extends BasePage {
  6  |   readonly url = '/customers'
  7  | 
  8  |   async goto(): Promise<void> {
  9  |     await this.gotoProtected(this.url)
  10 |     await this.expectFullyLoaded()
  11 |   }
  12 | 
  13 |   async expectFullyLoaded(): Promise<void> {
> 14 |     await expect(this.page.locator('[data-region="ops-customers-buckets"]')).toBeVisible({ timeout: 15_000 })
     |                                                                              ^ Error: expect(locator).toBeVisible() failed
  15 |     await expect(this.page.locator('[data-region="ops-customers-table"]')).toBeVisible()
  16 |   }
  17 | 
  18 |   get buckets(): Locator { return this.page.locator('[data-region="ops-customers-buckets"]') }
  19 |   get bucketChips(): Locator { return this.page.locator('[data-region="ops-customers-bucket-chip"]') }
  20 |   get table(): Locator { return this.page.locator('[data-region="ops-customers-table"]') }
  21 |   get rows(): Locator { return this.page.locator('[data-region="ops-customers-row"]') }
  22 |   get drawer(): Locator { return this.page.locator('[data-region="ops-customers-row-detail"]') }
  23 | 
  24 |   async selectBucket(label: string | RegExp): Promise<void> {
  25 |     await this.bucketChips.filter({ hasText: label }).first().click()
  26 |   }
  27 | 
  28 |   async openFirstRow(): Promise<void> {
  29 |     await this.rows.first().click()
  30 |   }
  31 | }
  32 | 
```