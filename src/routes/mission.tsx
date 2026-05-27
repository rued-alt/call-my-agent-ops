import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { TOKENS } from '../lib/brand'
import { readRoleFromMetadata } from '../lib/auth/roles'

// Placeholder Mission Control. The full chrome port — OpsChrome,
// OpsSecurity, role-aware nav, presence orb, mission cells — lands
// in a follow-up contract under feature 579bf0da (see JAXN).
export const Route = createFileRoute('/mission')({
  component: MissionRoute,
})

function MissionRoute() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <MissionPlaceholder />
      </SignedIn>
    </>
  )
}

function MissionPlaceholder() {
  const t = TOKENS
  const { user } = useUser()
  const role = readRoleFromMetadata(user?.publicMetadata)

  if (!role) {
    // Sneak path — Clerk loaded a session but the role is missing.
    // Send them back to / which renders the 403 panel.
    if (typeof window !== 'undefined') {
      window.location.replace('/')
    }
    return null
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: t.color.background,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
        padding: t.space.unit * 8,
      }}
    >
      <header style={{ marginBottom: t.space.unit * 8 }}>
        <div
          style={{
            color: t.color.accent,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Call My Agent · Ops · {role}
        </div>
        <h1
          style={{
            margin: `${t.space.unit * 2}px 0 0 0`,
            fontFamily: t.type.headingFamily,
            fontSize: 28,
            fontWeight: t.type.headingWeight,
            letterSpacing: '-0.015em',
          }}
        >
          Mission Control
        </h1>
        <p
          style={{
            margin: `${t.space.unit * 2}px 0 0 0`,
            color: t.color.muted,
            fontSize: 14,
            maxWidth: 560,
            lineHeight: 1.55,
          }}
        >
          Standing up — the live ops chrome (calls, voice gates, agent
          incidents) ports in next wave. Until then, this surface is
          intentionally minimal so the deploy + DNS path can be exercised
          end-to-end.
        </p>
      </header>
      <section
        style={{
          maxWidth: 720,
          padding: t.space.unit * 6,
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.lg,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: t.type.headingFamily,
            fontSize: 16,
            fontWeight: t.type.headingWeight,
          }}
        >
          Coming next
        </h2>
        <ul
          style={{
            margin: `${t.space.unit * 3}px 0 0 0`,
            paddingLeft: t.space.unit * 5,
            color: t.color.muted,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          <li>Port OpsChrome + OpsSecurity from the Next.js prototype.</li>
          <li>Live call monitor with PII-reveal flow.</li>
          <li>Voice-gate dashboard wired to the Go-Live API.</li>
          <li>Incident handoff to on-call.</li>
        </ul>
      </section>
    </main>
  )
}
