import type { BrandTokens } from '../../lib/brand'

// Minimal icon set needed by OpsChrome + OpsSecurity.
// Ported from brand-studio src/data/iconLibrary.ts + Icon.tsx.
// Full icon library can be added later; only include what ops surfaces need.

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
  phone: {
    paths: [
      'M5 4 h3 l2 5 -3 2 a12 12 0 0 0 6 6 l2 -3 5 2 v3 a2 2 0 0 1 -2 2 A18 18 0 0 1 3 6 a2 2 0 0 1 2 -2 z',
    ],
  },
  close: {
    paths: ['M6 6 l12 12', 'M18 6 l-12 12'],
  },
  warning: {
    paths: ['M12 3 l10 18 h-20 z', 'M12 10 v5', 'M12 18 v0.01'],
  },
  info: {
    paths: ['M12 8 v0.01', 'M12 11 v5'],
    extras: [{ kind: 'circle', cx: 12, cy: 12, r: 9, fill: 'stroke' }],
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
  /** Stroke width override. Default 2. */
  strokeWidth?: number
}

export function Icon({
  name,
  size = 20,
  color,
  t: _t,
  title,
  style,
  strokeWidth = 2,
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
        strokeWidth={strokeWidth}
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
