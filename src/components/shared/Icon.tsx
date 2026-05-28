import type { BrandTokens } from '../../lib/brand'

// Minimal icon set needed by OpsChrome + OpsSecurity.
// Ported from brand-studio src/data/iconLibrary.ts + Icon.tsx — refined
// Phosphor-regular family (synced 2026-05-27). Optical stroke bump under
// 16px. Full icon library can be added later; only include what ops surfaces
// need.

export type IconName = 'phone' | 'close' | 'warning' | 'info'

type IconEntry = {
  paths: string[]
  viewBox?: string
  extras?: Array<
    | { kind: 'circle'; cx: number; cy: number; r: number; fill?: 'stroke' | 'none' }
    | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  >
}

const ICON_LIBRARY: Record<IconName, IconEntry> = {
  // Single-curve handset — the canonical Phosphor "phone" arc.
  phone: {
    paths: [
      'M6.5 3.5 h2.5 a1 1 0 0 1 1 0.7 l1.5 4.3 a1 1 0 0 1 -0.3 1.1 L9 11 a12 12 0 0 0 4 4 l1.4 -2.2 a1 1 0 0 1 1.1 -0.3 l4.3 1.5 a1 1 0 0 1 0.7 1 V17.5 a3 3 0 0 1 -3 3 A17 17 0 0 1 3.5 6.5 a3 3 0 0 1 3 -3 z',
    ],
  },
  close: {
    paths: ['M6 6 L18 18', 'M18 6 L6 18'],
  },
  warning: {
    // Rounded-corner triangle: explicit arc on each vertex.
    paths: [
      'M10.7 4 a1.5 1.5 0 0 1 2.6 0 l8.2 14.3 a1.5 1.5 0 0 1 -1.3 2.2 H3.8 a1.5 1.5 0 0 1 -1.3 -2.2 z',
      'M12 10 v4.5',
      'M12 17.5 v0.01',
    ],
  },
  info: {
    paths: ['M12 11 v5.5', 'M12 8 v0.01'],
    extras: [{ kind: 'circle', cx: 12, cy: 12, r: 8.5, fill: 'stroke' }],
  },
}

type Props = {
  name: IconName
  /** Square px. Defaults to 20. */
  size?: number
  /** Override stroke color. Defaults to currentColor. */
  color?: string
  /** Optional brand tokens — accepted so call-sites can pass `t` consistently. */
  t?: BrandTokens
  /** Accessible label. When set, the icon is no longer aria-hidden. */
  title?: string
  /** Extra inline style. */
  style?: React.CSSProperties
  /** Stroke width override. Default 1.5 (1.75 when size < 16). */
  strokeWidth?: number
}

export function Icon({
  name,
  size = 20,
  color,
  t: _t,
  title,
  style,
  strokeWidth,
}: Props) {
  const entry = ICON_LIBRARY[name]
  if (!entry) {
    if (typeof console !== 'undefined') {
      console.warn(`[Icon] unknown icon name: ${name}`)
    }
    return null
  }
  const viewBox = entry.viewBox ?? '0 0 24 24'
  const stroke = color ?? 'currentColor'
  // Optical sizing: small renders get a slightly thicker stroke so they
  // don't disappear. Caller-passed `strokeWidth` always wins.
  const resolvedStroke =
    strokeWidth !== undefined ? strokeWidth : size < 16 ? 1.75 : 1.5
  const labelled = title !== undefined
  return (
    <svg
      data-icon={name}
      width={size}
      height={size}
      viewBox={viewBox}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? title : undefined}
      focusable="false"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {labelled && <title>{title}</title>}
      <g
        fill="none"
        stroke={stroke}
        strokeWidth={resolvedStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {entry.paths.map((d, i) => (
          <path key={`p-${i}`} d={d} />
        ))}
        {entry.extras?.map((shape, i) => {
          if (shape.kind === 'circle') {
            return (
              <circle
                key={`e-${i}`}
                cx={shape.cx}
                cy={shape.cy}
                r={shape.r}
                fill="none"
              />
            )
          }
          return (
            <line
              key={`e-${i}`}
              x1={shape.x1}
              y1={shape.y1}
              x2={shape.x2}
              y2={shape.y2}
            />
          )
        })}
      </g>
    </svg>
  )
}
