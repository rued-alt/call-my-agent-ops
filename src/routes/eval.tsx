import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TOKENS } from '../lib/brand'
import { readRoleFromMetadata } from '../lib/auth/roles'
import { OpsChrome, DEFAULT_OPS_STAFF } from '../components/chrome/OpsChrome'
import type { OpsStaff, OpsRole } from '../components/chrome/OpsChrome'
import { OpsEvalQueuePreview } from '../surfaces/eval/OpsEvalQueuePreview'
import { OPS_EVAL_QUEUE } from '../data/opsFixture'

const evalQueryClient = new QueryClient()

export const Route = createFileRoute('/eval')({
  component: EvalRoute,
})

function EvalRoute() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <EvalPage />
      </SignedIn>
    </>
  )
}

function EvalPage() {
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
  return (
    <div style={{ minHeight: '100vh', background: t.color.background }}>
      <OpsChrome
        t={t}
        staff={staff}
        agentHealth="healthy"
        evalQueueCount={OPS_EVAL_QUEUE.length}
        openAlertCount={3}
        sessionSecondsLeft={1800}
      />
      <main>
        <QueryClientProvider client={evalQueryClient}>
          <OpsEvalQueuePreview t={t} staff={staff} />
        </QueryClientProvider>
      </main>
    </div>
  )
}
