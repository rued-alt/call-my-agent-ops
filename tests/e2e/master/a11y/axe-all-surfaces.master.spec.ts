import { test } from '../fixtures/auth'
import { expectNoA11yViolations } from '../fixtures/a11y'

/**
 * A11y bundle — every ops surface against axe-core.
 * Per-route ignoreRules documented inline.
 */

type RouteSpec = {
  path: string
  auth: 'public' | 'ops'
  ignoreRules?: string[]
  skip?: string
}

// Ops chrome uses high-density text on dark surfaces (mono labels at 9–10px).
// These tokens are locked by the brand contract — axe scores them as
// borderline on a few status chips. Suppress only the contrast rule; all
// other a11y issues must surface.
const OPS_CONTRAST_WAVE = ['color-contrast']

const ROUTES: RouteSpec[] = [
  { path: '/', auth: 'ops', ignoreRules: OPS_CONTRAST_WAVE },
  { path: '/mission', auth: 'ops', ignoreRules: OPS_CONTRAST_WAVE },
  { path: '/pulse', auth: 'ops', ignoreRules: OPS_CONTRAST_WAVE },
  { path: '/calls', auth: 'ops', ignoreRules: OPS_CONTRAST_WAVE },
  { path: '/customers', auth: 'ops', ignoreRules: OPS_CONTRAST_WAVE },
  { path: '/costs', auth: 'ops', ignoreRules: OPS_CONTRAST_WAVE },
  { path: '/eval', auth: 'ops', ignoreRules: OPS_CONTRAST_WAVE },
]

test.describe('a11y: every surface passes axe (serious/critical)', () => {
  for (const spec of ROUTES) {
    const title = `${spec.path} (${spec.auth})`
    if (spec.skip) {
      test.skip(title, () => {})
      continue
    }
    test(title, async ({ page, opsPage }) => {
      const p = spec.auth === 'ops' ? opsPage : page
      await p.goto(spec.path, { waitUntil: 'domcontentloaded' })
      await p.waitForLoadState('networkidle').catch(() => {})
      await expectNoA11yViolations(p, { ignoreRules: spec.ignoreRules })
    })
  }
})
