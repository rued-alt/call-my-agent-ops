import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './_base'

export class CustomersPage extends BasePage {
  readonly url = '/customers'

  async goto(): Promise<void> {
    await this.gotoProtected(this.url)
    await this.expectFullyLoaded()
  }

  async expectFullyLoaded(): Promise<void> {
    await expect(this.page.locator('[data-region="ops-customers-buckets"]')).toBeVisible({ timeout: 15_000 })
    await expect(this.page.locator('[data-region="ops-customers-table"]')).toBeVisible()
  }

  get buckets(): Locator { return this.page.locator('[data-region="ops-customers-buckets"]') }
  get bucketChips(): Locator { return this.page.locator('[data-region="ops-customers-bucket-chip"]') }
  get table(): Locator { return this.page.locator('[data-region="ops-customers-table"]') }
  get rows(): Locator { return this.page.locator('[data-region="ops-customers-row"]') }
  get drawer(): Locator { return this.page.locator('[data-region="ops-customers-row-detail"]') }

  async selectBucket(label: string | RegExp): Promise<void> {
    await this.bucketChips.filter({ hasText: label }).first().click()
  }

  async openFirstRow(): Promise<void> {
    await this.rows.first().click()
  }
}
