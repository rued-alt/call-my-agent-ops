/**
 * opsClient.ts
 *
 * Thin fetch wrapper for the ops platform's /admin/ops/* endpoints.
 * Injects a Clerk JWT (via getToken()) + x-admin-token (from env) on
 * every request so the backend adminGuard + opsRoleGuard both pass.
 *
 * Auth strategy (option a — recommended): Clerk JWT is the primary
 * credential; VITE_ADMIN_TOKEN is a fallback header for the existing
 * x-admin-token guard. Both are sent so the backend works whether it
 * checks the JWT, the token, or both.
 *
 * Usage:
 *   import { opsClient } from '../../lib/api/opsClient'
 *   const data = await opsClient.get('/admin/ops/pulse')
 */

import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

const OPS_API_BASE =
  import.meta.env.VITE_OPS_API_BASE ?? 'https://api.callmyagent.ai'

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? ''

export type OpsClientOptions = {
  /** Clerk JWT obtained from useAuth().getToken() */
  token?: string | null
  signal?: AbortSignal
}

async function opsRequest<T>(
  path: string,
  opts: OpsClientOptions & { method?: string; body?: unknown } = {},
): Promise<T> {
  const { token, signal, method = 'GET', body } = opts
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (ADMIN_TOKEN) {
    headers['x-admin-token'] = ADMIN_TOKEN
  }

  const res = await fetch(`${OPS_API_BASE}${path}`, {
    method,
    headers,
    signal,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ops-api ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json() as Promise<T>
}

/**
 * Static client (for use outside React components, e.g. in queryFn).
 * Caller is responsible for passing the token.
 */
export const opsClient = {
  get: <T>(path: string, opts: OpsClientOptions = {}) =>
    opsRequest<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body: unknown, opts: OpsClientOptions = {}) =>
    opsRequest<T>(path, { ...opts, method: 'POST', body }),
}

/**
 * useOpsClient — React hook that returns an opsClient pre-bound with the
 * current Clerk JWT. Use inside components / queryFn factories.
 *
 * Example:
 *   const client = useOpsClient()
 *   useQuery({ queryKey: ['ops','pulse'], queryFn: () => client.get('/admin/ops/pulse') })
 */
export function useOpsClient() {
  const { getToken } = useAuth()

  const get = useCallback(
    async <T>(path: string, opts: Omit<OpsClientOptions, 'token'> = {}) => {
      const token = await getToken().catch(() => null)
      return opsClient.get<T>(path, { ...opts, token })
    },
    [getToken],
  )

  const post = useCallback(
    async <T>(path: string, body: unknown, opts: Omit<OpsClientOptions, 'token'> = {}) => {
      const token = await getToken().catch(() => null)
      return opsClient.post<T>(path, body, { ...opts, token })
    },
    [getToken],
  )

  return { get, post }
}
