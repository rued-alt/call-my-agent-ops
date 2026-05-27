// Glass design system helpers — shared utilities for the "Liquid Glass"
// recipe. Ported verbatim from brand-studio src/lib/glass.ts.
//
// hexToRgba: convert a #rrggbb hex color to rgba(r, g, b, a) string. Use
// this for glass tints (`hexToRgba(t.color.primary, 0.85)`) instead of
// the 8-digit-hex form (`${t.color.primary}d9`). jsdom drops the alpha
// channel from 8-digit hex when reading `element.style.background`,
// which breaks token-consumption tests; rgba() form is round-trip safe.
// Real browsers handle both forms identically.
export function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return hex
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
