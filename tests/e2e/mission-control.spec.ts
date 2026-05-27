import { test, expect } from '@playwright/test'
import { signInAs } from './utils/signInAs'

test('ops role lands on Mission Control', async ({ page }) => {
  await signInAs(page, 'ops', { path: '/mission' })
  await expect(page).toHaveURL(/\/mission$/)
  await expect(page.getByText('Mission Control').first()).toBeVisible()
})

test('readonly role can view Pulse but not mutate', async ({ page }) => {
  await signInAs(page, 'readonly', { path: '/pulse' })
  await expect(page).toHaveURL(/\/pulse$/)
})
