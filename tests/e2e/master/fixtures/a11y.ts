import type { Page } from '@playwright/test'

export async function expectNoA11yViolations(
  page: Page,
  opts: { ignoreRules?: string[] } = {},
): Promise<void> {
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js',
  })
  const ignoreRules = opts.ignoreRules ?? []
  const result = await page.evaluate(async (rules) => {
    // @ts-expect-error injected by addScriptTag
    return await window.axe.run(document, {
      resultTypes: ['violations'],
      rules: Object.fromEntries(rules.map((r) => [r, { enabled: false }])),
    })
  }, ignoreRules)
  const serious = (result.violations as Array<{ impact: string; id: string; nodes: unknown[]; help: string }>)
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
  if (serious.length > 0) {
    const lines = serious.map((v) => `  - [${v.impact}] ${v.id} (${v.nodes.length}): ${v.help}`)
    throw new Error(`a11y violations:\n${lines.join('\n')}`)
  }
}
