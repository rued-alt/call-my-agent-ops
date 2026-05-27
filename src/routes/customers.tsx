import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { TOKENS } from '../lib/brand'
import { readRoleFromMetadata } from '../lib/auth/roles'
import { OpsChrome, DEFAULT_OPS_STAFF } from '../components/chrome/OpsChrome'
import type { OpsStaff, OpsRole } from '../components/chrome/OpsChrome'
import { OpsCustomersPreview } from '../surfaces/customers/OpsCustomersPreview'
import { OPS_ALERTS } from '../data/opsFixture'

export const Route = createFileRoute('/customers')({
  component: CustomersRoute,
})

function CustomersRoute() {
  return (
    <>
      <SignedOut><RedirectToSignIn /></SignedOut>
      <SignedIn><CustomersPage /></SignedIn>
    </>
  )
}

function CustomersPage() {
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
    initials: (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '') || DEFAULT_OPS_STAFF.initials,
    role,
    twoFactorOn: user?.twoFactorEnabled ?? DEFAULT_OPS_STAFF.twoFactorOn,
  }

  const openAlertCount = OPS_ALERTS.filter((a) => !a.resolved).length

  return (
    <div style={{ minHeight: '100vh', background: t.color.background }}>
      <OpsChrome
        t={t}
        staff={staff}
        agentHealth="healthy"
        openAlertCount={openAlertCount}
      />
      <main>
        <OpsCustomersPreview t={t} />
      </main>
    </div>
  )
}
