import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { TOKENS } from '../lib/brand'
import { readRoleFromMetadata } from '../lib/auth/roles'
import { OpsChrome, DEFAULT_OPS_STAFF } from '../components/chrome/OpsChrome'
import type { OpsStaff, OpsRole } from '../components/chrome/OpsChrome'

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
        <MissionWithChrome />
      </SignedIn>
    </>
  )
}

function MissionWithChrome() {
  const t = TOKENS
  const { user } = useUser()
  const role = readRoleFromMetadata(user?.publicMetadata) as OpsRole | null

  if (!role) {
    // Sneak path — Clerk loaded a session but the role is missing.
    // Send them back to / which renders the 403 panel.
    if (typeof window !== 'undefined') {
      window.location.replace('/')
    }
    return null
  }

  // Build staff from Clerk user.
  const staff: OpsStaff = {
    id: user?.id ?? DEFAULT_OPS_STAFF.id,
    fullName: user?.fullName ?? DEFAULT_OPS_STAFF.fullName,
    initials: (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '') || DEFAULT_OPS_STAFF.initials,
    role,
    // Clerk MFA — if the user has any verified MFA, treat as 2FA on.
    twoFactorOn: (user?.twoFactorEnabled) ?? DEFAULT_OPS_STAFF.twoFactorOn,
  }

  return (
    <div style={{ minHeight: '100vh', background: t.color.background, color: t.color.foreground }}>
      <OpsChrome
        t={t}
        staff={staff}
        agentHealth="healthy"
        evalQueueCount={7}
        openAlertCount={3}
      />
      <main
        style={{
          padding: `${t.space.unit * 8}px ${t.space.unit * 5}px`,
          fontFamily: t.type.bodyFamily,
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
            Foundation chrome is live. Mission Control cells land in the next wave.
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
            Mission Control coming soon
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
            <li>Live call monitor with PII-reveal flow.</li>
            <li>Voice-gate dashboard wired to the Go-Live API.</li>
            <li>Provider health — LLM, STT, TTS, telephony.</li>
            <li>Incident handoff to on-call.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
