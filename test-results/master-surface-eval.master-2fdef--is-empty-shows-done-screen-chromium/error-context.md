# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/eval.master.spec.ts >> Eval (/eval) >> empty-state: when queue is empty, shows done screen
- Location: tests/e2e/master/surface/eval.master.spec.ts:72:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect.toBeVisible: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- paragraph [ref=e3]: Not Found
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures/auth'
  2  | import { expectNoA11yViolations } from '../fixtures/a11y'
  3  | import { stubOps, stubOpsAllError } from '../fixtures/opsStubs'
  4  | import { EvalPage } from '../pages/EvalPage'
  5  | 
  6  | test.describe('Eval (/eval)', () => {
  7  |   test('renders progress + card + rubric with no console errors', async ({ opsPage }) => {
  8  |     const e = new EvalPage(opsPage)
  9  |     await e.expectNoConsoleErrors(async () => {
  10 |       await e.goto()
  11 |       await expect(e.progress).toBeVisible()
  12 |       await expect(e.card.first()).toBeVisible()
  13 |       await expect(e.rubric).toBeVisible()
  14 |     })
  15 |   })
  16 | 
  17 |   // ── Keyboard shortcuts: j/k/e/r ───────────────────────────────────
  18 |   test('j: advances to the next call (cursor + 1)', async ({ opsPage }) => {
  19 |     const e = new EvalPage(opsPage)
  20 |     await e.goto()
  21 |     const before = await e.currentCallId()
  22 |     await opsPage.keyboard.press('j')
  23 |     const after = await e.currentCallId()
  24 |     expect(after).not.toBeNull()
  25 |     expect(after).not.toBe(before)
  26 |   })
  27 | 
  28 |   test('k: walks back one entry (after j)', async ({ opsPage }) => {
  29 |     const e = new EvalPage(opsPage)
  30 |     await e.goto()
  31 |     const first = await e.currentCallId()
  32 |     await opsPage.keyboard.press('j')
  33 |     const second = await e.currentCallId()
  34 |     expect(second).not.toBe(first)
  35 |     await opsPage.keyboard.press('k')
  36 |     const back = await e.currentCallId()
  37 |     expect(back).toBe(first)
  38 |   })
  39 | 
  40 |   test('e: commits when all 4 questions answered (no-op otherwise)', async ({ opsPage }) => {
  41 |     const e = new EvalPage(opsPage)
  42 |     await e.goto()
  43 |     const { done: before } = await e.progressCount()
  44 |     // Press e without rating anything → no commit
  45 |     await opsPage.keyboard.press('e')
  46 |     const { done: afterNoop } = await e.progressCount()
  47 |     expect(afterNoop).toBe(before)
  48 |     // Now answer all four (1/1/1/1 = yes/yes/yes/yes) and commit
  49 |     await opsPage.keyboard.press('1')
  50 |     await opsPage.keyboard.press('1')
  51 |     await opsPage.keyboard.press('1')
  52 |     await opsPage.keyboard.press('1')
  53 |     await opsPage.keyboard.press('e')
  54 |     const { done: afterCommit } = await e.progressCount()
  55 |     expect(afterCommit).toBe(before + 1)
  56 |   })
  57 | 
  58 |   test('r: clears the in-progress rubric', async ({ opsPage }) => {
  59 |     const e = new EvalPage(opsPage)
  60 |     await e.goto()
  61 |     await opsPage.keyboard.press('1') // understood = yes
  62 |     // The commit button text reflects rubric progress (1/4) — pressing r
  63 |     // should snap it back to 0/4. The exact text varies; we assert that
  64 |     // after r, pressing 'e' is a no-op (because rubric is empty).
  65 |     await opsPage.keyboard.press('r')
  66 |     const { done: before } = await e.progressCount()
  67 |     await opsPage.keyboard.press('e')
  68 |     const { done: after } = await e.progressCount()
  69 |     expect(after).toBe(before)
  70 |   })
  71 | 
  72 |   test('empty-state: when queue is empty, shows done screen', async ({ opsPage }) => {
  73 |     await stubOps(opsPage, 'eval/queue', [])
  74 |     const e = new EvalPage(opsPage)
  75 |     await e.goto().catch(() => { /* may render empty done-state instead of progress */ })
  76 |     // When queue is empty, the surface guards on `Array.isArray(items) &&
  77 |     // items.length > 0` and falls back to fixture; so the done state
  78 |     // only triggers when fixture is also empty. We assert that either
  79 |     // the done region or the rubric renders — but never an error.
> 80 |     await expect(opsPage.locator('[data-region="ops-eval-progress"]')).toBeVisible({ timeout: 15_000 })
     |                                                                        ^ Error: expect.toBeVisible: Target page, context or browser has been closed
  81 |   })
  82 | 
  83 |   test('error-state: 500 falls back to fixture (initialData)', async ({ opsPage }) => {
  84 |     await stubOpsAllError(opsPage)
  85 |     const e = new EvalPage(opsPage)
  86 |     await e.goto()
  87 |     await expect(e.card.first()).toBeVisible()
  88 |   })
  89 | 
  90 |   test('a11y: no serious violations', async ({ opsPage }) => {
  91 |     const e = new EvalPage(opsPage)
  92 |     await e.goto()
  93 |     await expectNoA11yViolations(opsPage, { ignoreRules: ['color-contrast'] })
  94 |   })
  95 | })
  96 | 
```