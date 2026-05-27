#!/usr/bin/env tsx
/**
 * Mint a Clerk testing token and print it.
 * Used for Playwright MCP workflows where the browser is driven manually
 * and needs a token query param to bypass bot detection.
 */
import 'dotenv/config'
import { clerkSetup } from '@clerk/testing/playwright'

async function main() {
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('CLERK_SECRET_KEY missing from .env')
    process.exit(1)
  }
  await clerkSetup()
  const token = process.env.CLERK_TESTING_TOKEN
  if (!token) {
    console.error('clerkSetup() did not set CLERK_TESTING_TOKEN (Clerk API call failed?)')
    process.exit(1)
  }
  console.log(`CLERK_TESTING_TOKEN=${token}`)
  console.log()
  console.log('Local URL with bot-detection bypass:')
  console.log(`  http://localhost:5173/?__clerk_testing_token=${token}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
