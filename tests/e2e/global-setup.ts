import { clerkSetup } from '@clerk/testing/playwright'
import 'dotenv/config'

async function globalSetup() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error(
      'CLERK_SECRET_KEY missing from .env. Get it from Clerk dashboard → API Keys.',
    )
  }
  await clerkSetup()
}

export default globalSetup
