import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './_base'

export class PulsePage extends BasePage {
  readonly url = '/pulse'

  async goto(): Promise<void> {
    await this.gotoProtected(this.url)
    await this.expectFullyLoaded()
  }

  async expectFullyLoaded(): Promise<void> {
    await expect(this.page.locator('[data-region="ops-pulse-heading"]')).toBeVisible({ timeout: 15_000 })
  }

  get heading(): Locator { return this.page.locator('[data-region="ops-pulse-heading"]') }
  get tiles(): Locator { return this.page.locator('[data-region="ops-pulse-tile"]') }
  get sparks(): Locator { return this.page.locator('[data-region="ops-pulse-spark"]') }
  get alertsRegion(): Locator { return this.page.locator('[data-region="ops-pulse-alerts"]') }
  get alertRows(): Locator { return this.page.locator('[data-region="ops-pulse-alert"]') }
  get alertsEmpty(): Locator { return this.page.locator('[data-region="ops-pulse-alerts-empty"]') }
  get liveBadge(): Locator { return this.page.locator('[data-region="ops-pulse-live-badge"]') }
  get sinceLastVisit(): Locator { return this.page.locator('[data-region="ops-pulse-since-last"]') }

  async dismissFirstAlert(): Promise<void> {
    await this.alertRows.first().click()
  }
}
