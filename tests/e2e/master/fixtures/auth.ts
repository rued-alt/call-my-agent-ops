import { test as base, type Page } from '@playwright/test'
import { signInAs, type TestRole } from '../../utils/signInAs'

/**
 * Role-keyed page fixtures. Each fixture starts at the app root signed in
 * as the named role. Use in specs:
 *
 *   import { test, expect } from '../fixtures/auth'
 *   test('...', async ({ opsPage }) => { ... })
 *
 * `signedOutPage` is the default page with no Clerk session — for testing
 * sign-in flows and public surfaces.
 */
type Fixtures = {
  opsPage: Page
  ownerPage: Page
  oncallPage: Page
  readonlyPage: Page
  signedOutPage: Page
}

async function signedIn(page: Page, role: TestRole): Promise<Page> {
  await signInAs(page, role)
  return page
}

export const test = base.extend<Fixtures>({
  opsPage: async ({ page }, use) => use(await signedIn(page, 'ops')),
  ownerPage: async ({ page }, use) => use(await signedIn(page, 'owner')),
  oncallPage: async ({ page }, use) => use(await signedIn(page, 'oncall')),
  readonlyPage: async ({ page }, use) => use(await signedIn(page, 'readonly')),
  signedOutPage: async ({ page }, use) => use(page),
})

export { expect } from '@playwright/test'
