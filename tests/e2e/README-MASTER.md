# Master Suite — Ops App

The master suite is the cross-cutting Playwright test pack that exercises
every ops surface in one run. It mirrors the customer app's master suite
(see `~/Code/call-my-agent-app/tests/e2e/README-MASTER.md`); this doc
covers the ops-specific bits.

## When to run

- Before cutting a release
- After any change to Mission Control chrome, alert rendering, the auth
  layer, or shared ops primitives
- Nightly in CI
- When investigating a "the ops dashboard is broken" report — smoke first

## Layout

```
tests/e2e/master/
  fixtures/
    auth.ts              role-keyed Page fixtures (opsPage, ownerPage,
                         oncallPage, readonlyPage, signedOutPage)
    a11y.ts              expectNoA11yViolations(page)
  pages/
    _base.ts             BasePage — abstract PO with helpers
  smoke/
    every-route-loads.master.spec.ts
  surface/               per-surface POs + specs (added incrementally)
  journey/
    ops-acknowledge-alert.master.spec.ts
  a11y/
    axe-all-surfaces.master.spec.ts
```

## Commands

| Command | What it does |
|---|---|
| `npm run test:master` | Run the entire master suite |
| `npm run test:master:smoke` | Every-route-loads smoke pack (~30s target) |
| `npm run test:master:surface` | Per-surface deep specs |
| `npm run test:master:journey` | Cross-surface flows |
| `npm run test:master:a11y` | axe-core across every surface |
| `npm run test:master:headed` | Master suite with a visible browser |
| `npm run seed:test-users` | One-time: provision the four role users in Clerk |

The Playwright config auto-starts `vite dev --port 5180`. Override with
`PLAYWRIGHT_BASE_URL` to target a deployed environment.

## Test users + Clerk

| Role | Email | Notes |
|---|---|---|
| `ops` | `ops@test.callmyagent.ai` | Full mission-control access |
| `owner` | `owner@test.callmyagent.ai` | Same Clerk user as customer-app owner |
| `oncall` | `oncall@test.callmyagent.ai` | On-call escalation paths |
| `readonly` | `readonly@test.callmyagent.ai` | Read-only audit role |

- Seed once with `npm run seed:test-users` (requires `CLERK_SECRET_KEY`).
- One Clerk instance backs both ops and the customer app.
- Sign-in is via Clerk testing tokens — see `tests/e2e/utils/signInAs.ts`.

## Mock-backend strategy

- **Reads** (`GET /admin/ops/alerts`, etc.) → fall back to fixtures if the
  backend isn't reachable; Mission Control is designed to render against
  fixtures.
- **Mutations** (`POST /admin/providers/switch-primary`,
  `POST /admin/ops/alerts/:id/ack`) → always stub with `page.route` inside
  the spec. There is no shared `mockMutations()` helper in the ops repo
  yet — extract one when a second spec needs the same stubs.

## Adding a new surface spec

1. Create a PO under `tests/e2e/master/pages/`:
   ```ts
   import { BasePage } from './_base'
   export class MissionPage extends BasePage {
     async goto() { await this.page.goto('/mission') }
     async expectFullyLoaded() {
       await this.page
         .locator('[data-region="ops-mission-body"]')
         .first()
         .waitFor()
     }
     alertChip(idx = 0) {
       return this.page
         .locator('[data-region="ops-mission-needs-row"]')
         .nth(idx)
     }
   }
   ```
2. Spec under `tests/e2e/master/surface/<feature>.master.spec.ts`.
3. Add the route to the smoke + a11y `ROUTES` arrays.

## Troubleshooting

- **`CLERK_SECRET_KEY missing`** → copy from Clerk dashboard → API Keys
  into `.env`. The same secret works for both repos.
- **Port conflict on 5180** → kill the other dev server or set
  `PLAYWRIGHT_BASE_URL` to point at your running instance.
- **Clerk rate limit (429)** → reduce parallelism (config already pins
  `fullyParallel: false`) or wait a minute.
- **A11y `color-contrast` failures on `/mission`** → the dark-on-dark mono
  labels (9–10px) are brand-locked and pre-suppressed in
  `a11y/axe-all-surfaces.master.spec.ts`. New violations are real.
- **Alerts journey times out waiting for `ops-mission-alerts`** → the
  Mission backend (`/admin/ops/alerts`) is unreachable AND the fixture
  fallback isn't loading. Check the cells client init.

## `seed-test-business.ts` — status

There is no seed-test-business script in the ops repo; ops test data is
fixture-driven by default. The customer-app README documents the
seed-business stub in detail. When that script lands, ops journeys that
depend on a business record will pick it up via the shared cell API.

### Journey coverage caveats

The `ops-acknowledge-alert` journey ships in two halves:

1. **Active test** — verifies the acknowledge mutation contract
   (POST /admin/ops/alerts/:id/ack is intercept-able + returns typed
   response). This is the gate that catches contract regressions.
2. **`test.fixme` block** — the full UI click-through (land on /mission →
   click alert chip → ack → assert moves to acknowledged). Blocked on:
   - **Clerk afterSignIn** — the shared test Clerk instance redirects
     ops sign-in to `/app/calls` (the customer-app post-sign-in URL),
     and Mission Control races with the redirect. Affects
     `mission-control.spec.ts` intermittently.
   - **Acknowledge drawer** — the inline ack control / drawer isn't
     shipped yet; alerts in the AlertsStrip are display-only today.

Un-fixme both once the Clerk afterSignIn is per-app and the ack drawer
ships.

## Naming

- "The agent" — never the seed default name in user-facing strings.
- Customers name their own agent; `Rae` is purely the seed fixture default.
