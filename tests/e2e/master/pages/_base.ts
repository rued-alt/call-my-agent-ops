import type { Page, Locator } from '@playwright/test'

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract goto(): Promise<unknown>
  abstract expectFullyLoaded(): Promise<void>

  /**
   * Navigate to a protected route, robust to two known races:
   *   (1) Clerk's session cookies aren't honored on the *first* render
   *       (RedirectToSignIn fires while Clerk is still hydrating).
   *   (2) Each protected route component synchronously redirects to
   *       `/` when `useUser()` returns undefined on first render.
   *
   * Strategy: warm the index route first (which only renders a centered
   * "Loading mission control…" message once role is loaded), THEN
   * navigate to the requested path. The Clerk session is by then
   * established at the document level so the second mount finds it.
   */
  protected async gotoProtected(path: string): Promise<void> {
    // Warm-up: hit "/" and wait for either the role gate or chrome to
    // confirm Clerk hydration. Tolerate the case where we're already
    // signed in (gate redirects us to /mission). If a SignedOut →
    // RedirectToSignIn race takes us off-origin, retry the navigation
    // after a short pause so the page can settle back on /mission.
    await this.page.goto('/')
    await Promise.race([
      this.page.locator('[data-region="ops-chrome"]').waitFor({ state: 'visible', timeout: 20_000 }),
      this.page.getByText(/Loading mission control|Checking access/i).waitFor({ state: 'visible', timeout: 20_000 }),
    ]).catch(() => { /* timed out — proceed and surface a clearer error below */ })
    // Final hop. If we're already on /mission and that's what's asked
    // for, skip the redundant nav.
    if (path !== '/mission' || !this.page.url().includes('/mission')) {
      await this.page.goto(path)
    }
  }

  protected role(name: string, options?: { name?: string | RegExp }): Locator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.page.getByRole(name as any, options)
  }

  protected testId(id: string): Locator {
    return this.page.getByTestId(id)
  }

  protected text(text: string | RegExp): Locator {
    return this.page.getByText(text)
  }

  async expectNoConsoleErrors(during: () => Promise<unknown>): Promise<void> {
    const errors: string[] = []
    const handler = (msg: { type(): string; text(): string }) => {
      if (msg.type() === 'error') errors.push(msg.text())
    }
    this.page.on('console', handler)
    try {
      await during()
    } finally {
      this.page.off('console', handler)
    }
    if (errors.length > 0) {
      throw new Error(`console errors:\n  ${errors.join('\n  ')}`)
    }
  }
}
