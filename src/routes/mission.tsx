import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TOKENS } from '../lib/brand'
import { readRoleFromMetadata } from '../lib/auth/roles'
import { OpsChrome, DEFAULT_OPS_STAFF } from '../components/chrome/OpsChrome'
import type { OpsStaff, OpsRole, OpsAgentHealth } from '../components/chrome/OpsChrome'
import { OpsMissionPreview } from '../surfaces/mission/OpsMissionPreview'
import { OPS_ALERTS, OPS_PROVIDERS, OPS_EVAL_QUEUE } from '../data/opsFixture'

export const Route = createFileRoute('/mission')({
  component: MissionRoute,
})

// Scoped QueryClient for the mission surface.
// TODO(backend-wireup): when the ops QueryClient is promoted to a
// shared provider (wrapping the whole app), remove this local instance.
const missionQueryClient = new QueryClient()

function MissionRoute() {
  return (
    <>
      <SignedOut><RedirectToSignIn /></SignedOut>
      <SignedIn><MissionPage /></SignedIn>
    </>
  )
}

function MissionPage() {
  const t = TOKENS
  const { user } = useUser()
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

  // Mission Control surfaces the worst provider in the stack as the
  // chrome's agent-health indicator — a degraded LLM/STT/TTS flips the
  // orb amber, a down provider flips it red.
  const worst: OpsAgentHealth = OPS_PROVIDERS.some((p) => p.status === 'down')
    ? 'down'
    : OPS_PROVIDERS.some((p) => p.status === 'degraded')
      ? 'degraded'
      : 'healthy'

  const openAlertCount = OPS_ALERTS.filter((a) => !a.resolved).length
  const evalQueueCount = OPS_EVAL_QUEUE.length

  return (
    <QueryClientProvider client={missionQueryClient}>
      <div style={{ minHeight: '100vh', background: t.color.background }}>
        <OpsChrome
          t={t}
          staff={staff}
          agentHealth={worst}
          openAlertCount={openAlertCount}
          evalQueueCount={evalQueueCount}
          sessionSecondsLeft={1800}
        />
        <main>
          <OpsMissionPreview t={t} />
        </main>
      </div>
    </QueryClientProvider>
  )
}
