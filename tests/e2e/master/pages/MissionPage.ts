import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './_base'

/**
 * Page Object for /mission (Mission Control war-room).
 *
 * Tests should drive the page through this PO rather than poking at
 * data-region selectors directly — keeps surface refactors cheap.
 */
export class MissionPage extends BasePage {
  readonly url = '/mission'

  async goto(): Promise<void> {
    await this.gotoProtected(this.url)
    await this.expectFullyLoaded()
  }

  async expectFullyLoaded(): Promise<void> {
    await expect(this.page.getByText('Mission Control').first()).toBeVisible({ timeout: 15_000 })
    await expect(this.page.locator('[data-region="ops-mission-hero"]')).toBeVisible()
  }

  // ── Regions ───────────────────────────────────────────────────────
  get hero(): Locator { return this.page.locator('[data-region="ops-mission-hero"]') }
  get heroCards(): Locator { return this.page.locator('[data-region="ops-mission-hero-card"]') }
  get statusBar(): Locator { return this.page.locator('[data-region="ops-mission-status-bar"]') }
  get clock(): Locator { return this.page.locator('[data-region="ops-mission-clock"]') }
  get agentStack(): Locator { return this.page.locator('[data-region="ops-mission-providers"]') }
  get agentRows(): Locator { return this.page.locator('[data-region="ops-mission-agent-row"]') }
  get eventStream(): Locator { return this.page.locator('[data-region="ops-mission-event-stream"]') }
  get streamLines(): Locator { return this.page.locator('[data-region="ops-mission-stream-line"]') }
  get globe(): Locator { return this.page.locator('[data-region="ops-mission-globe-canvas"]') }
  get aiBurn(): Locator { return this.page.locator('[data-region="ops-mission-ai-burn"]').or(this.page.getByText(/AI burn/i).first()) }
  get funnel(): Locator { return this.page.getByText(/Trial → Paying|Trial→Paying|funnel/i).first() }
  get needsYou(): Locator { return this.page.getByText(/Needs you|needs-you/i).first() }
  get soundToggle(): Locator { return this.page.locator('[data-region="ops-mission-sound-toggle"]').or(this.page.getByRole('button', { name: /sound/i })) }
  get switchModal(): Locator { return this.page.locator('[data-region="ops-mission-switch-modal"]') }
  get revertStrip(): Locator { return this.page.locator('[data-region="ops-mission-revert-strip"]') }

  // ── Actions ───────────────────────────────────────────────────────
  async toggleSound(): Promise<void> {
    const t = this.soundToggle.first()
    await t.click({ trial: false }).catch(async () => {
      // Fallback: try clicking any button matching sound
      await this.page.getByRole('button', { name: /sound/i }).first().click()
    })
  }

  async getGlobeArcCount(): Promise<number> {
    const v = await this.globe.getAttribute('data-arc-count')
    return v ? Number(v) : 0
  }

  async getGlobeArcCap(): Promise<number> {
    const v = await this.globe.getAttribute('data-arc-cap')
    return v ? Number(v) : 0
  }
}
