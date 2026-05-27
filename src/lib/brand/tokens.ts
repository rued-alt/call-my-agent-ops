// Ported from ~/Code/call-my-agent-app/src/lib/brand/tokens.ts — keep the
// two in sync until a shared @cma/brand package exists. The ops surface
// renders the SAME design tokens as the customer app so staff feel at home
// jumping between contexts.
import tokensJson from './tokens.json'

export interface BrandTokens {
  color: {
    primary: string
    accent: string
    error: string
    background: string
    surface: string
    foreground: string
    muted: string
    border: string
    channel: {
      sms: string
      whatsapp: string
      slack: string
      email: string
    }
    scrim: {
      light: string
      medium: string
    }
  }
  type: {
    headingFamily: string
    bodyFamily: string
    monoFamily: string
    headingWeight: number
    bodyWeight: number
    baseSize: number
  }
  space: { unit: number }
  radius: { sm: number; md: number; lg: number }
  shadow: { dropdown: string }
  brand: {
    name: string
    valueProp: string
    agentName: string
    agentVoiceDescription: string
    agentOpeningLine: string
    agentVoiceProvider: string
    agentVoiceModel: string
    agentVoiceId: string
    agentVoiceLabel: string
  }
  motion: {
    duration: {
      instant: number
      fast: number
      base: number
      slow: number
    }
    easing: {
      standard: string
      enter: string
      exit: string
      emphasized: string
    }
  }
}

export const TOKENS: BrandTokens = tokensJson as BrandTokens
export const DEFAULT_TOKENS = TOKENS

export function applyTokensToRoot(t: BrandTokens = TOKENS): void {
  if (typeof document === 'undefined') return
  const r = document.documentElement.style
  r.setProperty('--color-primary', t.color.primary)
  r.setProperty('--color-accent', t.color.accent)
  r.setProperty('--color-error', t.color.error)
  r.setProperty('--color-background', t.color.background)
  r.setProperty('--color-surface', t.color.surface)
  r.setProperty('--color-foreground', t.color.foreground)
  r.setProperty('--color-muted', t.color.muted)
  r.setProperty('--color-border', t.color.border)
  r.setProperty('--type-heading-family', t.type.headingFamily)
  r.setProperty('--type-body-family', t.type.bodyFamily)
  r.setProperty('--type-mono-family', t.type.monoFamily)
  r.setProperty('--type-heading-weight', String(t.type.headingWeight))
  r.setProperty('--type-body-weight', String(t.type.bodyWeight))
  r.setProperty('--type-base-size', `${t.type.baseSize}px`)
  r.setProperty('--space-unit', `${t.space.unit}px`)
  r.setProperty('--radius-sm', `${t.radius.sm}px`)
  r.setProperty('--radius-md', `${t.radius.md}px`)
  r.setProperty('--radius-lg', `${t.radius.lg}px`)
  r.setProperty('--motion-duration-instant', `${t.motion.duration.instant}ms`)
  r.setProperty('--motion-duration-fast', `${t.motion.duration.fast}ms`)
  r.setProperty('--motion-duration-base', `${t.motion.duration.base}ms`)
  r.setProperty('--motion-duration-slow', `${t.motion.duration.slow}ms`)
  r.setProperty('--motion-easing-standard', t.motion.easing.standard)
  r.setProperty('--motion-easing-enter', t.motion.easing.enter)
  r.setProperty('--motion-easing-exit', t.motion.easing.exit)
  r.setProperty('--motion-easing-emphasized', t.motion.easing.emphasized)
}
