import { useEffect, useState } from 'react'
import type { BrandTokens } from '../../lib/brand'

// AgentOrb — the persistent agent-stack presence orb.
// Ported from brand-studio _shared/RueOrb.tsx. Renamed "AgentOrb" in the
// ops app per project contract f9ee1622: we never say "Rue" — it's "the agent".
// RueState type alias preserved for wire-compatibility with OpsChrome props.

export type AgentOrbState = 'idle' | 'listening' | 'thinking' | 'just-acted' | 'urgent'
// Alias kept for OpsChrome which maps agentHealth → RueState vocabulary
export type RueState = AgentOrbState

const GLANCE_HOLD_MS = 220
const GLANCE_DECAY_MS = 380

export function AgentOrb({
  t,
  state,
  size = 40,
  replayKey,
  glanceTo,
}: {
  t: BrandTokens
  state: AgentOrbState
  size?: number
  replayKey?: number
  glanceTo?: number
}) {
  const [glanceAngle, setGlanceAngle] = useState(0)
  useEffect(() => {
    if (glanceTo === undefined || glanceTo === 0) {
      setGlanceAngle(0)
      return
    }
    setGlanceAngle(glanceTo)
    const id = window.setTimeout(() => setGlanceAngle(0), GLANCE_HOLD_MS)
    return () => window.clearTimeout(id)
  }, [glanceTo])

  const animationMap: Record<AgentOrbState, string> = {
    idle: 'cma-rue-breathe 4s ease-in-out infinite',
    listening: 'cma-rue-spin 2.8s linear infinite',
    thinking: 'cma-rue-think 1.9s ease-in-out infinite',
    'just-acted': 'cma-rue-glow 1.8s ease-out infinite',
    urgent: 'cma-rue-urgent-pulse 1.1s ease-in-out infinite',
  }

  const background =
    state === 'urgent'
      ? `radial-gradient(circle at 30% 30%, ${t.color.error}, ${t.color.error}88 60%, ${t.color.error}22 100%)`
      : state === 'listening'
        ? `conic-gradient(from 0deg, ${t.color.primary} 0%, ${t.color.accent} 35%, ${t.color.foreground} 50%, ${t.color.accent} 65%, ${t.color.primary} 100%)`
        : state === 'thinking'
          ? `radial-gradient(circle at 35% 35%, ${t.color.accent}, ${t.color.primary} 60%, ${t.color.primary}33 100%)`
          : `radial-gradient(circle at 30% 30%, ${t.color.primary}, ${t.color.primary}aa 60%, ${t.color.primary}33 100%)`

  return (
    <span
      aria-hidden="true"
      data-region="agent-orb-glance-wrap"
      data-glance-angle={glanceAngle}
      style={{
        display: 'inline-block',
        lineHeight: 0,
        transformOrigin: 'center',
        transform: `rotate(${glanceAngle}deg)`,
        transition: `transform ${glanceAngle === 0 ? GLANCE_DECAY_MS : GLANCE_HOLD_MS}ms var(--motion-easing-standard, ease)`,
      }}
    >
      <span
        key={replayKey}
        aria-hidden="true"
        data-region="agent-orb"
        data-state={state}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'inline-block',
          background,
          boxShadow: state === 'urgent' ? `0 0 18px ${t.color.error}88` : `0 0 12px ${t.color.primary}44`,
          animation: animationMap[state],
          transformOrigin: 'center',
          color: state === 'urgent' ? t.color.error : t.color.primary,
        }}
      />
    </span>
  )
}
