import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TOKENS } from '../lib/brand'
import { readRoleFromMetadata } from '../lib/auth/roles'
import { OpsChrome, DEFAULT_OPS_STAFF } from '../components/chrome/OpsChrome'
import type { OpsStaff, OpsRole } from '../components/chrome/OpsChrome'
import { OpsPulsePreview } from '../surfaces/pulse/OpsPulsePreview'
import { OPS_ALERTS } from '../data/opsFixture'

export const Route = createFileRoute('/pulse')({
  component: PulseRoute,
})

// Scoped QueryClient for the pulse surface.
// TODO(backend-wireup): when the ops QueryClient is promoted to a
// shared provider (wrapping the whole app), remove this local instance.
const pulseQueryClient = new QueryClient()

function PulseRoute() {
  return (
    <>
      <SignedOut><RedirectToSignIn /></SignedOut>
      <SignedIn><PulsePage /></SignedIn>
    </>
  )
}

function PulsePage() {
  const t = TOKENS
  const { user, isLoaded } = useUser()
  if (!isLoaded) return null
  const role = readRoleFromMetadata(user?.publicMetadata) as OpsRole | null
  if (!role) {
    if (typeof window !== 'undefined') window.location.replace('/')
    return null
  }
  const staff: OpsStaff = {
    id: user?.id ?? DEFAULT_OPS_STAFF.id,
    fullName: user?.fullName ?? DEFAULT_OPS_STAFF.fullName,
    initials:
      (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '') ||
      DEFAULT_OPS_STAFF.initials,
    role,
    twoFactorOn: user?.twoFactorEnabled ?? DEFAULT_OPS_STAFF.twoFactorOn,
  }

  // Count open alerts for the chrome badge (resolved=false only)
  const openAlertCount = OPS_ALERTS.filter((a) => !a.resolved).length

  return (
    <QueryClientProvider client={pulseQueryClient}>
      <div style={{ minHeight: '100vh', background: t.color.background }}>
        <OpsChrome
          t={t}
          staff={staff}
          agentHealth="degraded"
          openAlertCount={openAlertCount}
        />
        <main>
          <OpsPulsePreview t={t} />
        </main>
      </div>
    </QueryClientProvider>
  )
}
