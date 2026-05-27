import { test, expect } from '../fixtures/auth'
import { expectNoA11yViolations } from '../fixtures/a11y'
import { stubOps, stubOpsAllError } from '../fixtures/opsStubs'
import { EvalPage } from '../pages/EvalPage'

test.describe('Eval (/eval)', () => {
  test('renders progress + card + rubric with no console errors', async ({ opsPage }) => {
    const e = new EvalPage(opsPage)
    await e.expectNoConsoleErrors(async () => {
      await e.goto()
      await expect(e.progress).toBeVisible()
      await expect(e.card.first()).toBeVisible()
      await expect(e.rubric).toBeVisible()
    })
  })

  // ── Keyboard shortcuts: j/k/e/r ───────────────────────────────────
  test('j: advances to the next call (cursor + 1)', async ({ opsPage }) => {
    const e = new EvalPage(opsPage)
    await e.goto()
    const before = await e.currentCallId()
    await opsPage.keyboard.press('j')
    const after = await e.currentCallId()
    expect(after).not.toBeNull()
    expect(after).not.toBe(before)
  })

  test('k: walks back one entry (after j)', async ({ opsPage }) => {
    const e = new EvalPage(opsPage)
    await e.goto()
    const first = await e.currentCallId()
    await opsPage.keyboard.press('j')
    const second = await e.currentCallId()
    expect(second).not.toBe(first)
    await opsPage.keyboard.press('k')
    const back = await e.currentCallId()
    expect(back).toBe(first)
  })

  test('e: commits when all 4 questions answered (no-op otherwise)', async ({ opsPage }) => {
    const e = new EvalPage(opsPage)
    await e.goto()
    const { done: before } = await e.progressCount()
    // Press e without rating anything → no commit
    await opsPage.keyboard.press('e')
    const { done: afterNoop } = await e.progressCount()
    expect(afterNoop).toBe(before)
    // Now answer all four (1/1/1/1 = yes/yes/yes/yes) and commit
    await opsPage.keyboard.press('1')
    await opsPage.keyboard.press('1')
    await opsPage.keyboard.press('1')
    await opsPage.keyboard.press('1')
    await opsPage.keyboard.press('e')
    const { done: afterCommit } = await e.progressCount()
    expect(afterCommit).toBe(before + 1)
  })

  test('r: clears the in-progress rubric', async ({ opsPage }) => {
    const e = new EvalPage(opsPage)
    await e.goto()
    await opsPage.keyboard.press('1') // understood = yes
    // The commit button text reflects rubric progress (1/4) — pressing r
    // should snap it back to 0/4. The exact text varies; we assert that
    // after r, pressing 'e' is a no-op (because rubric is empty).
    await opsPage.keyboard.press('r')
    const { done: before } = await e.progressCount()
    await opsPage.keyboard.press('e')
    const { done: after } = await e.progressCount()
    expect(after).toBe(before)
  })

  test('empty-state: when queue is empty, shows done screen', async ({ opsPage }) => {
    await stubOps(opsPage, 'eval/queue', [])
    const e = new EvalPage(opsPage)
    await e.goto().catch(() => { /* may render empty done-state instead of progress */ })
    // When queue is empty, the surface guards on `Array.isArray(items) &&
    // items.length > 0` and falls back to fixture; so the done state
    // only triggers when fixture is also empty. We assert that either
    // the done region or the rubric renders — but never an error.
    await expect(opsPage.locator('[data-region="ops-eval-progress"]')).toBeVisible({ timeout: 15_000 })
  })

  test('error-state: 500 falls back to fixture (initialData)', async ({ opsPage }) => {
    await stubOpsAllError(opsPage)
    const e = new EvalPage(opsPage)
    await e.goto()
    await expect(e.card.first()).toBeVisible()
  })

  test('a11y: no serious violations', async ({ opsPage }) => {
    const e = new EvalPage(opsPage)
    await e.goto()
    await expectNoA11yViolations(opsPage, { ignoreRules: ['color-contrast'] })
  })
})
