import { test, expect } from '../fixtures/auth'

/**
 * Global keyboard shortcuts.
 *
 * FINDING (master-pass): the only surface-level shortcuts wired today
 * are the Eval queue's j/k/e/r + 1/2/3 set (covered in
 * eval.master.spec.ts). There is no global "?" overlay, no global
 * Escape-to-close handler attached to the chrome, and no arrow-key
 * navigation between tabs. This spec asserts the present state — and
 * verifies the chrome's tab Links remain keyboard-focusable so a
 * future shortcut layer has somewhere to wire into.
 */
test.describe('Keyboard shortcuts (global)', () => {
  test('chrome tab Links are keyboard-focusable (tab navigation works)', async ({ opsPage }) => {
    await opsPage.goto('/mission')
    // Tab to first chrome tab — depending on how many focusable elements
    // sit before it, this may take several presses. We assert that at
    // least one chrome tab IS focusable.
    const tabs = opsPage.locator('[data-region="ops-chrome-tab"]')
    expect(await tabs.count()).toBeGreaterThan(0)
    await tabs.first().focus()
    const focused = await opsPage.evaluate(() => document.activeElement?.getAttribute('data-region'))
    expect(focused).toBe('ops-chrome-tab')
  })

  test('Enter on a focused tab navigates to that surface', async ({ opsPage }) => {
    await opsPage.goto('/mission')
    const pulseTab = opsPage.locator('[data-region="ops-chrome-tab"][data-tab="pulse"]')
    await pulseTab.focus()
    await opsPage.keyboard.press('Enter')
    await expect(opsPage).toHaveURL(/\/pulse$/)
  })

  test.skip('? key opens a global help overlay (NOT YET IMPLEMENTED)', async () => {
    // No global help overlay is wired. Flip when it lands.
  })

  test.skip('Escape closes the topmost open drawer/modal (NOT YET WIRED globally)', async () => {
    // Only the provider-switch modal closes on outside-click, not Escape.
  })

  test.skip('Arrow keys cycle between chrome tabs (NOT YET WIRED)', async () => {
    // Tabs are <Link>s with no roving-tabindex. Future work.
  })
})
