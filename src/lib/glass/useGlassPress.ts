import { useState } from 'react'
import type { BrandTokens } from '../brand'
import { hexToRgba } from './index'

// useGlassPress — the universal glass-button press-down convention.
// Verbatim port from brand-studio _shared/useGlassPress.ts.
// Owner-locked 2026-05-26.
//
// Returns three things:
//   - pressedDown: boolean state for the caller to read if it needs to
//   - pressStyle:  React.CSSProperties to spread INSIDE the button's
//                  inline style block AFTER the base glass styling, so
//                  the depress + halo override the resting box-shadow
//   - pressHandlers: onMouseDown/Up/Leave + onTouch* + onKeyDown/Up
//                  handlers to spread onto the button/anchor element
//
// Pair the resulting style with a `transition` that covers `transform`
// and `box-shadow` so the glow fades on release. BrandedButton uses the
// same recipe inline; this hook lets inline `<button>` call sites that
// can't be refactored to BrandedButton (load-bearing test hooks like
// inline `style.animation` or `style.background` literal assertions)
// still pick up the same press feel.
export function useGlassPress(
  t: BrandTokens,
  options?: {
    enabled?: boolean
    /** Hex color the glow tints with on press. Defaults to t.color.primary.
     *  Pass a different token (e.g. t.color.accent for the AI wand, or
     *  t.color.error for a destructive Delete button) when the action's
     *  intent isn't "brand primary". */
    pressColor?: string
    /** When true, skip the depress (1px translate-down). Useful for
     *  text-only / link variants that have no frame to physically push. */
    skipDepress?: boolean
  },
) {
  const enabled = options?.enabled ?? true
  const pressColor = options?.pressColor ?? t.color.primary
  const skipDepress = options?.skipDepress ?? false
  const [pressedDown, setPressedDown] = useState(false)
  const active = enabled && pressedDown

  const beginPress = () => {
    if (enabled) setPressedDown(true)
  }
  const endPress = () => {
    if (pressedDown) setPressedDown(false)
  }

  // Glow recipe — tuned 2026-05-26 to drop the hard ring and lean on
  // the soft halo. No inset stroke (was reading as a thick outline on
  // solid surfaces); a 1px inner highlight at low alpha + a 3px soft
  // wash + a wide outer halo carry the press feedback instead.
  const pressStyle: React.CSSProperties = active
    ? {
        transform: skipDepress
          ? undefined
          : 'translateY(1px) translateZ(0)',
        boxShadow: `var(--glass-rim), var(--glass-lift), inset 0 0 0 1px ${hexToRgba(pressColor, 0.4)}, 0 0 0 3px ${hexToRgba(pressColor, 0.14)}, 0 0 24px 8px ${hexToRgba(pressColor, 0.36)}`,
      }
    : {}

  const pressHandlers = {
    onMouseDown: beginPress,
    onMouseUp: endPress,
    onMouseLeave: endPress,
    onTouchStart: beginPress,
    onTouchEnd: endPress,
    onTouchCancel: endPress,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') beginPress()
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') endPress()
    },
  }

  return { pressedDown: active, pressStyle, pressHandlers }
}
