import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './_base'

export class CostsPage extends BasePage {
  readonly url = '/costs'

  async goto(): Promise<void> {
    await this.gotoProtected(this.url)
    await this.expectFullyLoaded()
  }

  async expectFullyLoaded(): Promise<void> {
    await expect(this.page.locator('[data-region="ops-costs-heading"]')).toBeVisible({ timeout: 15_000 })
    await expect(this.page.locator('[data-region="ops-costs-table"]')).toBeVisible()
  }

  get heading(): Locator { return this.page.locator('[data-region="ops-costs-heading"]') }
  get rollup(): Locator { return this.page.locator('[data-region="ops-costs-rollup"]') }
  get rollupTiles(): Locator { return this.page.locator('[data-region="ops-costs-rollup-tile"]') }
  get table(): Locator { return this.page.locator('[data-region="ops-costs-table"]') }
  get rows(): Locator { return this.page.locator('[data-region="ops-costs-row"]') }
  get drawer(): Locator { return this.page.locator('[data-region="ops-costs-drawer"]') }
  get breakdownItems(): Locator { return this.page.locator('[data-region="ops-costs-breakdown-item"]') }
  get providerModelDrill(): Locator { return this.page.locator('[data-region="ops-costs-provider-model-drill"]') }
  get providerModelRows(): Locator { return this.page.locator('[data-region="ops-costs-provider-model-row"]') }

  async openFirstRow(): Promise<void> {
    await this.rows.first().click()
  }
}
