#!/usr/bin/env tsx
/**
 * Seed Clerk test users for E2E + Playwright MCP workflows.
 * Idempotent — re-running is safe; existing users get role re-applied.
 *
 * Requires:
 *   CLERK_SECRET_KEY=sk_test_...   in .env
 *   CLERK_TEST_PASSWORD=...         in .env (used for password-form sign-in
 *                                            via MCP browser; the token-based
 *                                            test helper does NOT need it)
 *
 * Creates 4 users in the test Clerk instance (alert-turkey-47):
 *   owner@test.callmyagent.ai     publicMetadata.role = 'owner'
 *   ops@test.callmyagent.ai       publicMetadata.role = 'ops'
 *   oncall@test.callmyagent.ai    publicMetadata.role = 'on-call'
 *   readonly@test.callmyagent.ai  publicMetadata.role = 'read-only'
 */
import 'dotenv/config'
import { createClerkClient } from '@clerk/backend'

type Seed = {
  email: string
  firstName: string
  role: 'owner' | 'ops' | 'on-call' | 'read-only'
}

const SEEDS: Seed[] = [
  { email: 'owner@test.callmyagent.ai', firstName: 'Test Owner', role: 'owner' },
  { email: 'ops@test.callmyagent.ai', firstName: 'Test Ops', role: 'ops' },
  { email: 'oncall@test.callmyagent.ai', firstName: 'Test On-Call', role: 'on-call' },
  { email: 'readonly@test.callmyagent.ai', firstName: 'Test Read-Only', role: 'read-only' },
]

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    console.error('CLERK_SECRET_KEY missing from .env')
    process.exit(1)
  }
  if (!secretKey.startsWith('sk_test_')) {
    console.error('Refusing to run against a non-test Clerk key. Expected sk_test_*.')
    process.exit(1)
  }
  const password = process.env.CLERK_TEST_PASSWORD
  if (!password) {
    console.error('CLERK_TEST_PASSWORD missing from .env')
    process.exit(1)
  }

  const clerk = createClerkClient({ secretKey })

  for (const seed of SEEDS) {
    const existing = await clerk.users.getUserList({ emailAddress: [seed.email] })
    if (existing.data.length > 0) {
      const user = existing.data[0]
      await clerk.users.updateUserMetadata(user.id, {
        publicMetadata: { role: seed.role },
      })
      console.log(`updated  ${seed.email.padEnd(34)} role=${seed.role}`)
      continue
    }
    const created = await clerk.users.createUser({
      emailAddress: [seed.email],
      password,
      firstName: seed.firstName,
      publicMetadata: { role: seed.role },
      skipPasswordChecks: true,
    })
    console.log(`created  ${seed.email.padEnd(34)} role=${seed.role}  id=${created.id}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
