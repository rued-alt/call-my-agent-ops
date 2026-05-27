// Role taxonomy + type helpers. Ported from the Next.js ops repo
// (~/Code/call-my-agent-ops/src/auth/roles.ts) verbatim — the role
// vocabulary is product-locked. Roles live in Clerk's
// `publicMetadata.role`; the values here are the source of truth.

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
