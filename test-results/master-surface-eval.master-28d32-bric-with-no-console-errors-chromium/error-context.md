# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/eval.master.spec.ts >> Eval (/eval) >> renders progress + card + rubric with no console errors
- Location: tests/e2e/master/surface/eval.master.spec.ts:7:3

# Error details

```
Test timeout of 30000ms exceeded while setting up "opsPage".
```

```
Error: Failed to sign in with email ops@test.callmyagent.ai: page.waitForFunction: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- paragraph [ref=e3]: Not Found
```

# Test source

```ts
  1  | import { clerk } from '@clerk/testing/playwright'
  2  | import type { Page } from '@playwright/test'
  3  | 
  4  | export type TestRole = 'owner' | 'ops' | 'oncall' | 'readonly'
  5  | 
  6  | const EMAIL_BY_ROLE: Record<TestRole, string> = {
  7  |   owner: 'owner@test.callmyagent.ai',
  8  |   ops: 'ops@test.callmyagent.ai',
  9  |   oncall: 'oncall@test.callmyagent.ai',
  10 |   readonly: 'readonly@test.callmyagent.ai',
  11 | }
  12 | 
  13 | /**
  14 |  * Sign in to the running ops app as one of the seeded role users.
  15 |  * Uses Clerk sign-in tokens (no password typing). Requires:
  16 |  *   - CLERK_SECRET_KEY in env (for token mint via Backend API)
  17 |  *   - The four role users already seeded via `npm run seed:test-users`
  18 |  *     in ~/Code/call-my-agent.
  19 |  *
  20 |  * Sign-in flow:
  21 |  *   1. Land on / so Clerk fully mounts before sign-in
  22 |  *   2. clerk.signIn() installs the ticket → window.Clerk.user is set
  23 |  *   3. Navigate to opts.path (if any) — by this point Clerk is loaded so
  24 |  *      route guards see the role on first render
  25 |  */
  26 | export async function signInAs(page: Page, role: TestRole, opts: { path?: string } = {}) {
  27 |   // Use the target path (or /mission as ops default) — this app has no /
  28 |   // route, so landing on / first would 404 and Clerk would fail to mount.
  29 |   const targetPath = opts.path ?? '/mission'
  30 |   await page.goto(targetPath)
> 31 |   await clerk.signIn({
     |   ^ Error: Failed to sign in with email ops@test.callmyagent.ai: page.waitForFunction: Test timeout of 30000ms exceeded.
  32 |     page,
  33 |     emailAddress: EMAIL_BY_ROLE[role],
  34 |   })
  35 |   // Re-navigate to ensure post-auth route guards re-render with the loaded user.
  36 |   await page.goto(targetPath)
  37 | }
  38 | 
```