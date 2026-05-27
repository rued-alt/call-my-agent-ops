# Call My Agent — Ops

Staff-only console for `ops.callmyagent.ai`. Built on the same Vite + React +
TanStack + Clerk stack as the customer app (`app.callmyagent.ai`), so the
two surfaces share design tokens, auth, and mental model.

## Stack

- **Vite 5** + **React 18** + **TypeScript** (strict)
- **TanStack Router** (file-based routing) + **TanStack Query**
- **Clerk** for auth — staff role lives in `publicMetadata.role`
- **Tailwind** + ported brand tokens (see `src/lib/brand/tokens.json`)
- **Vitest** + Testing Library

## Local dev

```bash
cp .env.example .env       # then paste a real VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev                # opens on http://localhost:5175
```

## Role taxonomy

| Role        | Access                                              |
|-------------|-----------------------------------------------------|
| `owner`     | Everything, including PII reveal + destructive ops. |
| `ops`       | Day-to-day ops; PII reveal with audit reason.       |
| `on-call`   | Incident response; same reveal rules as `ops`.      |
| `read-only` | View-only — cannot reveal PII or take action.       |

Users without a role get a 403 panel, never the actual surface.

## Deploy

Production deploys to Render as a Static Site. `render.yaml` at repo root
is the source of truth — `npm ci && npm run build`, publish `dist/`.

`robots.txt` is `Disallow: /` and there's a defense-in-depth
`X-Robots-Tag: noindex, nofollow` header in `render.yaml`. Do **not**
remove either without an explicit decision.

## What's stubbed

The current build is a deploy-validation stub: a role-gated landing page
and a `/mission` placeholder. The real chrome (OpsChrome, OpsSecurity,
live call monitor) ports from the Next.js prototype in a follow-up
contract under feature `579bf0da`.
