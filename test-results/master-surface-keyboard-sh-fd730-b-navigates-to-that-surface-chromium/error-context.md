# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/keyboard-shortcuts.master.spec.ts >> Keyboard shortcuts (global) >> Enter on a focused tab navigates to that surface
- Location: tests/e2e/master/surface/keyboard-shortcuts.master.spec.ts:27:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.focus: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-region="ops-chrome-tab"][data-tab="pulse"]')

```

# Page snapshot

```yaml
- paragraph [ref=e3]: Not Found
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures/auth'
  2  | 
  3  | /**
  4  |  * Global keyboard shortcuts.
  5  |  *
  6  |  * FINDING (master-pass): the only surface-level shortcuts wired today
  7  |  * are the Eval queue's j/k/e/r + 1/2/3 set (covered in
  8  |  * eval.master.spec.ts). There is no global "?" overlay, no global
  9  |  * Escape-to-close handler attached to the chrome, and no arrow-key
  10 |  * navigation between tabs. This spec asserts the present state — and
  11 |  * verifies the chrome's tab Links remain keyboard-focusable so a
  12 |  * future shortcut layer has somewhere to wire into.
  13 |  */
  14 | test.describe('Keyboard shortcuts (global)', () => {
  15 |   test('chrome tab Links are keyboard-focusable (tab navigation works)', async ({ opsPage }) => {
  16 |     await opsPage.goto('/mission')
  17 |     // Tab to first chrome tab — depending on how many focusable elements
  18 |     // sit before it, this may take several presses. We assert that at
  19 |     // least one chrome tab IS focusable.
  20 |     const tabs = opsPage.locator('[data-region="ops-chrome-tab"]')
  21 |     expect(await tabs.count()).toBeGreaterThan(0)
  22 |     await tabs.first().focus()
  23 |     const focused = await opsPage.evaluate(() => document.activeElement?.getAttribute('data-region'))
  24 |     expect(focused).toBe('ops-chrome-tab')
  25 |   })
  26 | 
  27 |   test('Enter on a focused tab navigates to that surface', async ({ opsPage }) => {
  28 |     await opsPage.goto('/mission')
  29 |     const pulseTab = opsPage.locator('[data-region="ops-chrome-tab"][data-tab="pulse"]')
> 30 |     await pulseTab.focus()
     |                    ^ Error: locator.focus: Test timeout of 30000ms exceeded.
  31 |     await opsPage.keyboard.press('Enter')
  32 |     await expect(opsPage).toHaveURL(/\/pulse$/)
  33 |   })
  34 | 
  35 |   test.skip('? key opens a global help overlay (NOT YET IMPLEMENTED)', async () => {
  36 |     // No global help overlay is wired. Flip when it lands.
  37 |   })
  38 | 
  39 |   test.skip('Escape closes the topmost open drawer/modal (NOT YET WIRED globally)', async () => {
  40 |     // Only the provider-switch modal closes on outside-click, not Escape.
  41 |   })
  42 | 
  43 |   test.skip('Arrow keys cycle between chrome tabs (NOT YET WIRED)', async () => {
  44 |     // Tabs are <Link>s with no roving-tabindex. Future work.
  45 |   })
  46 | })
  47 | 
```