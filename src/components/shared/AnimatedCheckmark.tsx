import type { BrandTokens } from '../../lib/brand'

// SVG checkmark with a stroke-draw animation. The circle traces in first,
// then the tick. Use anywhere an action just succeeded — Mark handled,
// Send sent, Connect connected, Save saved. Keyframes (cma-svg-stroke-draw)
// are defined in src/index.css so this component has no side effects.

type Props = {
  t: BrandTokens
  size?: number
  /** Override the stroke color. Defaults to t.color.primary. */
  color?: string
  /** Whether to draw the surrounding circle. Defaults to true. */
  withCircle?: boolean
}

export function AnimatedCheckmark({ t, size = 18, color, withCircle = true }: Props) {
  const c = color ?? t.color.primary
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
      data-region="animated-checkmark"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {withCircle && (
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke={c}
          strokeWidth="2.5"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: 100,
            animation: 'cma-svg-stroke-draw 320ms var(--motion-easing-enter, ease-out) 40ms forwards',
          }}
        />
      )}
      <polyline
        points="11,18 16,23 25,13"
        fill="none"
        stroke={c}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 28,
          strokeDashoffset: 28,
          animation: `cma-svg-stroke-draw 240ms var(--motion-easing-enter, ease-out) ${withCircle ? 240 : 60}ms forwards`,
        }}
      />
    </svg>
  )
}
