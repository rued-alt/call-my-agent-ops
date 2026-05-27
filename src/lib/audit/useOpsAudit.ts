import { useQuery } from '@tanstack/react-query'
import { OPS_AUDIT_LOG, type OpsAuditEntry } from '../../data/opsFixture'

// useOpsAudit — fetches recent audit_log rows from the backend.
// Backend contract: GET /admin/audit?limit=50
//
// Status: backend endpoint NOT YET implemented. This hook falls back to
// the fixture (OPS_AUDIT_LOG) when the fetch fails or when no backend URL
// is configured. File a contract with the backend team to implement:
//   GET /admin/audit?limit={n}
//   Auth: Clerk JWT (ops role required)
//   Response: { entries: OpsAuditEntry[] }
//
// Contract ref: file one under the "Foundation chrome port" contract in JAXN.

const AUDIT_ENDPOINT = import.meta.env.VITE_OPS_API_BASE
  ? `${import.meta.env.VITE_OPS_API_BASE}/admin/audit`
  : null

async function fetchAuditEntries(limit: number): Promise<OpsAuditEntry[]> {
  if (!AUDIT_ENDPOINT) {
    // No backend configured — use fixture data.
    return OPS_AUDIT_LOG.slice(0, limit)
  }

  const res = await fetch(`${AUDIT_ENDPOINT}?limit=${limit}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })

  if (!res.ok) {
    // Backend not yet implemented — fall through to fixture.
    console.warn('[useOpsAudit] backend returned', res.status, '— using fixture')
    return OPS_AUDIT_LOG.slice(0, limit)
  }

  const data = (await res.json()) as { entries: OpsAuditEntry[] }
  return data.entries
}

export function useOpsAudit(limit = 50) {
  return useQuery({
    queryKey: ['ops-audit', limit],
    queryFn: () => fetchAuditEntries(limit),
    staleTime: 30_000,
    // Always have data — fall back to fixture when query hasn't loaded yet.
    placeholderData: OPS_AUDIT_LOG.slice(0, limit),
  })
}
