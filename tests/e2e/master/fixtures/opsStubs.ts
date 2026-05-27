import type { Page, Route } from '@playwright/test'

/**
 * Stub helpers for the /admin/ops/* backend.
 *
 * Surfaces always have fixture initialData, so an "empty" stub only
 * exercises the empty path if the surface honors the response over its
 * fixture (some don't — they short-circuit to fixture on empty array).
 * Each helper documents what it actually changes.
 */
export type OpsStubMap = Partial<Record<string, unknown>>

/** Stub any matched /admin/ops/* path with the given body. */
export async function stubOps(
  page: Page,
  pattern: string | RegExp,
  body: unknown,
  status = 200,
): Promise<void> {
  const re =
    typeof pattern === 'string'
      ? new RegExp(`/admin/ops/${pattern.replace(/^\/+/, '').replace(/[?]/g, '\\?')}`)
      : pattern
  await page.route(re, (route: Route) => {
    void route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

/** Make every /admin/ops/* call return a 500 error. */
export async function stubOpsAllError(page: Page, status = 500): Promise<void> {
  await page.route(/\/admin\/ops\//, (route: Route) => {
    void route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'master-spec stub error' }),
    })
  })
}

/** Make every /admin/ops/* call return an empty array (where applicable). */
export async function stubOpsAllEmpty(page: Page): Promise<void> {
  await page.route(/\/admin\/ops\//, (route: Route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}
