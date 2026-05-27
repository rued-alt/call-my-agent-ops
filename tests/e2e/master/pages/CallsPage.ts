import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './_base'

export class CallsPage extends BasePage {
  readonly url = '/calls'

  async goto(): Promise<void> {
    await this.gotoProtected(this.url)
    await this.expectFullyLoaded()
  }

  async expectFullyLoaded(): Promise<void> {
    await expect(this.page.locator('[data-region="ops-calls-filters"]')).toBeVisible({ timeout: 15_000 })
    await expect(this.page.locator('[data-region="ops-calls-list"]')).toBeVisible()
  }

  get filtersRail(): Locator { return this.page.locator('[data-region="ops-calls-filters"]') }
  get filterChips(): Locator { return this.page.locator('[data-region="ops-calls-filter-chip"]') }
  get clearFilters(): Locator { return this.page.locator('[data-region="ops-calls-clear-filters"]') }
  get search(): Locator { return this.page.locator('[data-region="ops-calls-search"]') }
  get count(): Locator { return this.page.locator('[data-region="ops-calls-count"]') }
  get list(): Locator { return this.page.locator('[data-region="ops-calls-list"]') }
  get rows(): Locator { return this.page.locator('[data-region="ops-calls-row"]') }
  get empty(): Locator { return this.page.locator('[data-region="ops-calls-empty"]') }
  get rowDetail(): Locator { return this.page.locator('[data-region="ops-calls-row-detail"]') }

  async toggleFirstChip(): Promise<void> {
    await this.filterChips.first().click()
  }

  async typeSearch(q: string): Promise<void> {
    await this.search.fill(q)
  }

  async openFirstRow(): Promise<void> {
    await this.rows.first().click()
  }
}
