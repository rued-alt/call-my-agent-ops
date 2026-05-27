import { clerk } from '@clerk/testing/playwright'
import type { Page } from '@playwright/test'

export type TestRole = 'owner' | 'ops' | 'oncall' | 'readonly'

const EMAIL_BY_ROLE: Record<TestRole, string> = {
  owner: 'owner@test.callmyagent.ai',
  ops: 'ops@test.callmyagent.ai',
  oncall: 'oncall@test.callmyagent.ai',
  readonly: 'readonly@test.callmyagent.ai',
}

/**
 * Sign in to the running ops app as one of the seeded role users.
 * Uses Clerk sign-in tokens (no password typing). Requires:
 *   - CLERK_SECRET_KEY in env (for token mint via Backend API)
 *   - The four role users already seeded via `npm run seed:test-users`
 *     in ~/Code/call-my-agent.
 *
 * Sign-in flow:
 *   1. Land on / so Clerk fully mounts before sign-in
 *   2. clerk.signIn() installs the ticket → window.Clerk.user is set
 *   3. Navigate to opts.path (if any) — by this point Clerk is loaded so
 *      route guards see the role on first render
 */
export async function signInAs(page: Page, role: TestRole, opts: { path?: string } = {}) {
  // Use the target path (or /mission as ops default) — this app has no /
  // route, so landing on / first would 404 and Clerk would fail to mount.
  const targetPath = opts.path ?? '/mission'
  await page.goto(targetPath)
  await clerk.signIn({
    page,
    emailAddress: EMAIL_BY_ROLE[role],
  })
  // Re-navigate to ensure post-auth route guards re-render with the loaded user.
  await page.goto(targetPath)
}
