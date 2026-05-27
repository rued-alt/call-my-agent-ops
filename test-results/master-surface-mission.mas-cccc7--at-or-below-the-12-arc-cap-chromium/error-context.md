# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/mission.master.spec.ts >> Mission Control (/mission) >> globe arc count stays at or below the 12-arc cap
- Location: tests/e2e/master/surface/mission.master.spec.ts:41:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Mission Control').first()
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('Mission Control').first()

```

```yaml
- paragraph: Not Found
```

# Test source

```ts
  1  | import type { Page, Locator } from '@playwright/test'
  2  | import { expect } from '@playwright/test'
  3  | import { BasePage } from './_base'
  4  | 
  5  | /**
  6  |  * Page Object for /mission (Mission Control war-room).
  7  |  *
  8  |  * Tests should drive the page through this PO rather than poking at
  9  |  * data-region selectors directly — keeps surface refactors cheap.
  10 |  */
  11 | export class MissionPage extends BasePage {
  12 |   readonly url = '/mission'
  13 | 
  14 |   async goto(): Promise<void> {
  15 |     await this.gotoProtected(this.url)
  16 |     await this.expectFullyLoaded()
  17 |   }
  18 | 
  19 |   async expectFullyLoaded(): Promise<void> {
> 20 |     await expect(this.page.getByText('Mission Control').first()).toBeVisible({ timeout: 15_000 })
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  21 |     await expect(this.page.locator('[data-region="ops-mission-hero"]')).toBeVisible()
  22 |   }
  23 | 
  24 |   // ── Regions ───────────────────────────────────────────────────────
  25 |   get hero(): Locator { return this.page.locator('[data-region="ops-mission-hero"]') }
  26 |   get heroCards(): Locator { return this.page.locator('[data-region="ops-mission-hero-card"]') }
  27 |   get statusBar(): Locator { return this.page.locator('[data-region="ops-mission-status-bar"]') }
  28 |   get clock(): Locator { return this.page.locator('[data-region="ops-mission-clock"]') }
  29 |   get agentStack(): Locator { return this.page.locator('[data-region="ops-mission-providers"]') }
  30 |   get agentRows(): Locator { return this.page.locator('[data-region="ops-mission-agent-row"]') }
  31 |   get eventStream(): Locator { return this.page.locator('[data-region="ops-mission-event-stream"]') }
  32 |   get streamLines(): Locator { return this.page.locator('[data-region="ops-mission-stream-line"]') }
  33 |   get globe(): Locator { return this.page.locator('[data-region="ops-mission-globe-canvas"]') }
  34 |   get aiBurn(): Locator { return this.page.locator('[data-region="ops-mission-ai-burn"]').or(this.page.getByText(/AI burn/i).first()) }
  35 |   get funnel(): Locator { return this.page.getByText(/Trial → Paying|Trial→Paying|funnel/i).first() }
  36 |   get needsYou(): Locator { return this.page.getByText(/Needs you|needs-you/i).first() }
  37 |   get soundToggle(): Locator { return this.page.locator('[data-region="ops-mission-sound-toggle"]').or(this.page.getByRole('button', { name: /sound/i })) }
  38 |   get switchModal(): Locator { return this.page.locator('[data-region="ops-mission-switch-modal"]') }
  39 |   get revertStrip(): Locator { return this.page.locator('[data-region="ops-mission-revert-strip"]') }
  40 | 
  41 |   // ── Actions ───────────────────────────────────────────────────────
  42 |   async toggleSound(): Promise<void> {
  43 |     const t = this.soundToggle.first()
  44 |     await t.click({ trial: false }).catch(async () => {
  45 |       // Fallback: try clicking any button matching sound
  46 |       await this.page.getByRole('button', { name: /sound/i }).first().click()
  47 |     })
  48 |   }
  49 | 
  50 |   async getGlobeArcCount(): Promise<number> {
  51 |     const v = await this.globe.getAttribute('data-arc-count')
  52 |     return v ? Number(v) : 0
  53 |   }
  54 | 
  55 |   async getGlobeArcCap(): Promise<number> {
  56 |     const v = await this.globe.getAttribute('data-arc-cap')
  57 |     return v ? Number(v) : 0
  58 |   }
  59 | }
  60 | 
```