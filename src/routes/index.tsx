import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth, useUser, RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { TOKENS } from '../lib/brand'
import { readRoleFromMetadata } from '../lib/auth/roles'

// Entry point for ops.callmyagent.ai. Three states:
//   1. Not signed in   → RedirectToSignIn (Clerk hosted UI for now)
//   2. Signed in, no   → 403 panel ("Your account isn't an ops account")
//      ops role
//   3. Signed in, role → /mission redirect
//      in taxonomy
//
// The 403 panel deliberately does NOT mention contact info — staff
// onboarding tells you who to ping. Customers who stumble in here get a
// quiet door, not a help line.
export const Route = createFileRoute('/')({
  component: OpsLanding,
})

function OpsLanding() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <OpsRoleGate />
      </SignedIn>
    </>
  )
}

function OpsRoleGate() {
  const { isLoaded } = useAuth()
  const { user } = useUser()
  const navigate = useNavigate()
  const role = readRoleFromMetadata(user?.publicMetadata)

  useEffect(() => {
    if (isLoaded && role) {
      void navigate({ to: '/mission' })
    }
  }, [isLoaded, role, navigate])

  if (!isLoaded) {
    return <CenteredMessage title="Checking access…" subtitle="Verifying your role." />
  }
  if (!role) {
    return (
      <CenteredMessage
        title="403 — Ops only"
        subtitle="This surface is for Call My Agent staff. Your account isn't authorised."
      />
    )
  }
  return <CenteredMessage title="Loading mission control…" subtitle="One moment." />
}

function CenteredMessage({ title, subtitle }: { title: string; subtitle: string }) {
  const t = TOKENS
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: t.space.unit * 6,
        background: t.color.background,
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          textAlign: 'center',
          padding: t.space.unit * 8,
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.lg,
          boxShadow: t.shadow.dropdown,
        }}
      >
        <div
          style={{
            color: t.color.accent,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: t.space.unit * 2,
          }}
        >
          Call My Agent · Ops
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: t.type.headingFamily,
            fontSize: 22,
            fontWeight: t.type.headingWeight,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: `${t.space.unit * 3}px 0 0 0`,
            color: t.color.muted,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      </div>
    </main>
  )
}
