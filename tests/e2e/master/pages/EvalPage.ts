import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './_base'

export class EvalPage extends BasePage {
  readonly url = '/eval'

  async goto(): Promise<void> {
    await this.gotoProtected(this.url)
    await this.expectFullyLoaded()
  }

  async expectFullyLoaded(): Promise<void> {
    await expect(this.page.locator('[data-region="ops-eval-progress"]')).toBeVisible({ timeout: 15_000 })
  }

  get progress(): Locator { return this.page.locator('[data-region="ops-eval-progress"]') }
  get progressCounter(): Locator { return this.page.locator('[data-region="ops-eval-progress-counter"]') }
  get card(): Locator { return this.page.locator('[data-region="ops-eval-card"]') }
  get rubric(): Locator { return this.page.locator('[data-region="ops-eval-rubric"]') }
  get commit(): Locator { return this.page.locator('[data-region="ops-eval-commit"]') }
  get skip(): Locator { return this.page.locator('[data-region="ops-eval-skip"]') }
  get question(): Locator { return this.page.locator('[data-region="ops-eval-question"]') }
  get options(): Locator { return this.page.locator('[data-region="ops-eval-option"]') }
  get done(): Locator { return this.page.locator('[data-region="ops-eval-done"]') }

  async currentCallId(): Promise<string | null> {
    return this.card.first().getAttribute('data-call-id')
  }

  async progressCount(): Promise<{ done: number; total: number }> {
    const t = (await this.progressCounter.textContent()) ?? ''
    const m = t.match(/(\d+)\s*\/\s*(\d+)/)
    return { done: m ? Number(m[1]) : 0, total: m ? Number(m[2]) : 0 }
  }
}
