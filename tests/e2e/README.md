# Clerk E2E + Playwright MCP

Two ways to drive the ops app past Clerk auth.

## One-time setup
1. In Clerk dashboard → API Keys, copy `sk_test_...` into `~/Code/call-my-agent/.env`:
   ```
   CLERK_SECRET_KEY=sk_test_...
   ```
2. Same value also into this repo's `.env` and the customer app's `.env`.
3. Set a shared test password in all three `.env` files:
   ```
   CLERK_TEST_PASSWORD=ClerkTest!2026
   ```
4. Seed the four role users (one Clerk instance covers both apps):
   ```
   npm run seed:test-users
   ```

## Way A — automated Playwright test suite
```
npm run test:e2e
```
The config auto-starts `npm run dev` if no `PLAYWRIGHT_BASE_URL` is set.

## Way B — driving the live browser via Playwright MCP
1. Start the dev server: `npm run dev` (or run against `ops.callmyagent.ai` for prod-DOM-only smoke).
2. Mint a testing token:
   ```
   npm run mcp:token
   ```
   This prints `CLERK_TESTING_TOKEN=...`. The token is good for ~1 hour.
3. Drive MCP to navigate to:
   ```
   http://localhost:5173/?__clerk_testing_token=<token>
   ```
   The `__clerk_testing_token` query param bypasses Clerk bot detection.
4. Use the Clerk `<SignIn />` form with one of the seeded users:
   - `owner@test.callmyagent.ai` / `$CLERK_TEST_PASSWORD`
   - `ops@test.callmyagent.ai`
   - `oncall@test.callmyagent.ai`
   - `readonly@test.callmyagent.ai`

The token cookie persists for the browser session — subsequent navigations within the same MCP browser don't need the query param.
