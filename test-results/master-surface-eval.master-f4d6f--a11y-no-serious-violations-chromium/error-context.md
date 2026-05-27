# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/eval.master.spec.ts >> Eval (/eval) >> a11y: no serious violations
- Location: tests/e2e/master/surface/eval.master.spec.ts:90:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-region="ops-eval-progress"]')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[data-region="ops-eval-progress"]')

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
  5  | export class EvalPage extends BasePage {
  6  |   readonly url = '/eval'
  7  | 
  8  |   async goto(): Promise<void> {
  9  |     await this.gotoProtected(this.url)
  10 |     await this.expectFullyLoaded()
  11 |   }
  12 | 
  13 |   async expectFullyLoaded(): Promise<void> {
> 14 |     await expect(this.page.locator('[data-region="ops-eval-progress"]')).toBeVisible({ timeout: 15_000 })
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  15 |   }
  16 | 
  17 |   get progress(): Locator { return this.page.locator('[data-region="ops-eval-progress"]') }
  18 |   get progressCounter(): Locator { return this.page.locator('[data-region="ops-eval-progress-counter"]') }
  19 |   get card(): Locator { return this.page.locator('[data-region="ops-eval-card"]') }
  20 |   get rubric(): Locator { return this.page.locator('[data-region="ops-eval-rubric"]') }
  21 |   get commit(): Locator { return this.page.locator('[data-region="ops-eval-commit"]') }
  22 |   get skip(): Locator { return this.page.locator('[data-region="ops-eval-skip"]') }
  23 |   get question(): Locator { return this.page.locator('[data-region="ops-eval-question"]') }
  24 |   get options(): Locator { return this.page.locator('[data-region="ops-eval-option"]') }
  25 |   get done(): Locator { return this.page.locator('[data-region="ops-eval-done"]') }
  26 | 
  27 |   async currentCallId(): Promise<string | null> {
  28 |     return this.card.first().getAttribute('data-call-id')
  29 |   }
  30 | 
  31 |   async progressCount(): Promise<{ done: number; total: number }> {
  32 |     const t = (await this.progressCounter.textContent()) ?? ''
  33 |     const m = t.match(/(\d+)\s*\/\s*(\d+)/)
  34 |     return { done: m ? Number(m[1]) : 0, total: m ? Number(m[2]) : 0 }
  35 |   }
  36 | }
  37 | 
```