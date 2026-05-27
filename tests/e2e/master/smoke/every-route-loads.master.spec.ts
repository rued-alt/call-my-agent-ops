import { test, expect } from '../fixtures/auth'
import type { Page } from '@playwright/test'

/**
 * Smoke — every ops route renders without exploding.
 * Target runtime: <30s total.
 */

type RouteSpec = {
  path: string
  auth: 'public' | 'ops'
  dataDependent?: boolean
  skip?: string
}

const ROUTES: RouteSpec[] = [
  // The ops index redirects signed-in ops users → /mission, and signed-out
  // → marketing. We exercise both via authed fixtures only.
  { path: '/', auth: 'ops' },
  { path: '/mission', auth: 'ops', dataDependent: true },
  { path: '/pulse', auth: 'ops', dataDependent: true },
  { path: '/calls', auth: 'ops', dataDependent: true },
  { path: '/customers', auth: 'ops', dataDependent: true },
  { path: '/costs', auth: 'ops', dataDependent: true },
  { path: '/eval', auth: 'ops', dataDependent: true },
]

const FATAL_MARKERS = [
  /Application Error/i,
  /Something went wrong/i,
  /^Error: /m,
  /Uncaught Exception/i,
]

const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /\[Vite\]/i,
  /Download the React DevTools/i,
  /react-router/i,
  /Failed to load resource.*\b(401|403|404)\b/i,
  /Clerk: Clerk has been loaded with development keys/i,
  /\[HMR\]/i,
]

async function assertRouteLoads(page: Page, spec: RouteSpec) {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text))) return
    consoleErrors.push(text)
  })

  const response = await page.goto(spec.path, { waitUntil: 'load' })
  if (response) {
    expect.soft(response.status(), `${spec.path} HTTP status`).toBeLessThan(500)
  }

  // SPA: poll briefly until something renders. Accept either text or any
  // child element (some surfaces render canvas/iframe-only first).
  await expect
    .poll(
      async () => {
        const text = await page.locator('body').innerText().catch(() => '')
        const childCount = await page.locator('body > *').count().catch(() => 0)
        return text.trim().length > 0 || childCount > 0
      },
      { timeout: 8_000, message: `${spec.path} body should not be empty` },
    )
    .toBe(true)

  const bodyText = (await page.locator('body').innerText().catch(() => '')).trim()
  for (const marker of FATAL_MARKERS) {
    expect(bodyText, `${spec.path} should not show fatal error text`).not.toMatch(marker)
  }

  if (consoleErrors.length > 0) {
    const msg = `${spec.path} console errors:\n  ${consoleErrors.join('\n  ')}`
    if (spec.dataDependent) {
      expect.soft(consoleErrors, msg).toEqual([])
    } else {
      expect(consoleErrors, msg).toEqual([])
    }
  }
}

test.describe('smoke: every route loads', () => {
  for (const spec of ROUTES) {
    const title = `${spec.path} (${spec.auth})`
    if (spec.skip) {
      test.skip(title, () => {})
      continue
    }
    test(title, async ({ page, opsPage }) => {
      const p = spec.auth === 'ops' ? opsPage : page
      await assertRouteLoads(p, spec)
    })
  }
})
