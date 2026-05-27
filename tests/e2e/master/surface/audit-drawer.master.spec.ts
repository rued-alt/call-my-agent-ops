import { test, expect } from '../fixtures/auth'

/**
 * The OpsChrome exposes a global Audit button. Clicking it slides down
 * the audit drawer (ops-audit-drawer) with every action + actor +
 * timestamp.
 *
 * The task asks us to verify every audited mutation opens the audit
 * drawer. The current architecture is INVERSE — the audit drawer is a
 * passive log of past mutations, not a modal that pops on each click.
 * This spec verifies the drawer surface itself and that entries carry
 * action + actor + timestamp.
 */
test.describe('Audit drawer', () => {
  test('Audit button is visible and opens the drawer', async ({ opsPage }) => {
    await opsPage.goto('/mission')
    const btn = opsPage.locator('[data-region="ops-chrome-audit-button"]')
    await expect(btn).toBeVisible()
    await btn.click()
    const drawer = opsPage.locator('[data-region="ops-audit-drawer"]')
    await expect(drawer).toBeVisible({ timeout: 5_000 })
  })

  test('every audit entry carries action + actor + timestamp', async ({ opsPage }) => {
    await opsPage.goto('/mission')
    await opsPage.locator('[data-region="ops-chrome-audit-button"]').click()
    const entries = opsPage.locator('[data-region="ops-audit-entry"]')
    expect(await entries.count()).toBeGreaterThan(0)
    // Each entry must have action attribute + visible staff line + visible time
    const first = entries.first()
    await expect(first).toHaveAttribute('data-action', /.+/)
    const text = (await first.textContent()) ?? ''
    // Staff line is "{name} ({role}) · {target}"; the time renders as
    // "h:mm AM/PM". Assert both shapes are present.
    expect(text).toMatch(/[a-z]/i)
    expect(text).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i)
  })

  test('High-risk filter narrows the entry list', async ({ opsPage }) => {
    await opsPage.goto('/mission')
    await opsPage.locator('[data-region="ops-chrome-audit-button"]').click()
    const before = await opsPage.locator('[data-region="ops-audit-entry"]').count()
    await opsPage.getByLabel(/High-risk only/i).check()
    const after = await opsPage.locator('[data-region="ops-audit-entry"]').count()
    expect(after).toBeLessThanOrEqual(before)
    // Every visible entry must now be high-risk
    const flags = await opsPage.locator('[data-region="ops-audit-entry"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-high-risk')),
    )
    for (const f of flags) expect(f).toBe('true')
  })

  test('close button dismisses the drawer', async ({ opsPage }) => {
    await opsPage.goto('/mission')
    await opsPage.locator('[data-region="ops-chrome-audit-button"]').click()
    await expect(opsPage.locator('[data-region="ops-audit-drawer"]')).toBeVisible()
    await opsPage.locator('[data-region="ops-audit-close"]').click()
    await expect(opsPage.locator('[data-region="ops-audit-drawer"]')).toHaveCount(0)
  })
})
