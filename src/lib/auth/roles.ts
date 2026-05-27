// Role taxonomy + type helpers. Ported from the Next.js ops repo
// (~/Code/call-my-agent-ops/src/auth/roles.ts) verbatim — the role
// vocabulary is product-locked. Roles live in Clerk's
// `publicMetadata.role`; the values here are the source of truth.
// Extended 2026-05-27: added useOpsRole() hook that exposes role +
// canRevealPii guard for use in OpsSecurity / OpsChrome components.

export type OpsRole = 'owner' | 'ops' | 'on-call' | 'read-only'

export const OPS_ROLES: OpsRole[] = ['owner', 'ops', 'on-call', 'read-only']

// Highest-privilege first. Used by `roleAtLeast` so that requiring
// 'ops' admits both 'owner' and 'ops'.
const ROLE_RANK: Record<OpsRole, number> = {
  owner: 3,
  ops: 2,
  'on-call': 1,
  'read-only': 0,
}

export function isOpsRole(value: unknown): value is OpsRole {
  return typeof value === 'string' && (OPS_ROLES as string[]).includes(value)
}

export function roleAtLeast(role: OpsRole, min: OpsRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

// Roles allowed to access ops surfaces at all. read-only is intentionally
// in the list — they can view (most things). Anyone without a role gets a
// 403, NOT a sign-in screen, because reaching this point means they're
// already signed in to Clerk.
export const ROLES_ALLOWED_INTO_OPS: OpsRole[] = [
  'owner',
  'ops',
  'on-call',
  'read-only',
]

export function readRoleFromMetadata(
  metadata: { role?: unknown } | null | undefined,
): OpsRole | null {
  if (metadata && isOpsRole(metadata.role)) return metadata.role
  return null
}

// Roles permitted to reveal PII (transcript content, phone numbers, etc.)
// Must match ROLES_ALLOWED_TO_REVEAL in OpsSecurity.tsx.
const ROLES_ALLOWED_TO_REVEAL: OpsRole[] = ['owner', 'ops', 'on-call']

export function canRevealPii(role: OpsRole): boolean {
  return ROLES_ALLOWED_TO_REVEAL.includes(role)
}

// useOpsRole — convenience hook for components that need role + PII guard.
// Requires Clerk to be loaded; returns null role when not yet available.
// Note: this hook calls useUser() from Clerk internally. Do not call
// conditionally — React hook rules apply.
import { useUser } from '@clerk/clerk-react'

export function useOpsRole(): { role: OpsRole | null; canRevealPii: boolean } {
  const { user } = useUser()
  const role = readRoleFromMetadata(user?.publicMetadata)
  return { role, canRevealPii: role ? canRevealPii(role) : false }
}
