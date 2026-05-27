import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import { useGlassPress } from '../../lib/glass/useGlassPress'

// Branded button — the single canonical button across the app.
//
// Variants:
//   primary   — strong CTA, filled with t.color.primary
//   secondary — outline; muted text; secondary actions
//   danger    — error-coloured outline; destructive actions
//   link      — text-only; uses primary color
//   ghost     — invisible button shape; for icon-only or chip-style
//
// Sizes:
//   sm — chip-sized (~28px tall), 12px text
//   md — default (40px tall), 14px text
//   lg — hero CTA (48px tall), 16px text

export type BrandedButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'ghost'
export type BrandedButtonSize = 'sm' | 'md' | 'lg'

type Props = {
  t: BrandTokens
  children: React.ReactNode
  variant?: BrandedButtonVariant
  size?: BrandedButtonSize
  disabled?: boolean
  onClick?: () => void
  dataRegion?: string
  dataAction?: string
  /** Override computed minWidth (keeps CTA stable across copy swaps). */
  minWidth?: number | string
}

const SIZES: Record<BrandedButtonSize, { paddingY: number; paddingX: number; fontSize: number; height: number }> = {
  sm: { paddingY: 6, paddingX: 12, fontSize: 12, height: 28 },
  md: { paddingY: 8, paddingX: 16, fontSize: 14, height: 40 },
  lg: { paddingY: 12, paddingX: 24, fontSize: 16, height: 48 },
}

export function BrandedButton({
  t,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  dataRegion,
  dataAction,
  minWidth,
}: Props) {
  const s = SIZES[size]
  const glassOn = variant === 'primary'

  const palette: Record<BrandedButtonVariant, React.CSSProperties> = {
    primary: {
      background: t.color.primary,
      color: t.color.foreground,
      border: 'none',
      fontWeight: 600,
    },
    secondary: {
      background: 'transparent',
      color: t.color.foreground,
      border: `1px solid ${t.color.border}`,
      fontWeight: 500,
    },
    danger: {
      background: 'transparent',
      color: t.color.error,
      border: `1px solid ${t.color.error}`,
      fontWeight: 600,
    },
    link: {
      background: 'transparent',
      color: t.color.primary,
      border: 'none',
      fontWeight: 600,
    },
    ghost: {
      background: 'transparent',
      color: t.color.muted,
      border: 'none',
      fontWeight: 500,
    },
  }

  const isInert = disabled
  const pressColor = variant === 'danger' ? t.color.error : t.color.primary
  const skipDepress = variant === 'link' || variant === 'ghost'
  const { pressStyle, pressHandlers } = useGlassPress(t, {
    enabled: !isInert,
    pressColor,
    skipDepress,
  })

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: `${s.paddingY}px ${s.paddingX}px`,
    height: s.height,
    minWidth,
    fontFamily: t.type.bodyFamily,
    fontSize: s.fontSize,
    borderRadius: variant === 'link' || variant === 'ghost' ? 0 : t.radius.md,
    cursor: isInert ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    transition:
      'background 160ms ease, opacity 160ms ease, border-color 160ms ease, transform 120ms var(--glass-ease), box-shadow 220ms var(--glass-ease)',
    ...palette[variant],
    ...(glassOn ? {
      background: hexToRgba(t.color.primary, 0.85),
      border: 'none',
      backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
      WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
      boxShadow: 'var(--glass-rim), var(--glass-lift)',
    } : null),
    ...pressStyle,
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={isInert ? undefined : onClick}
      data-region={dataRegion ?? 'branded-button'}
      data-variant={variant}
      data-size={size}
      data-action={dataAction}
      data-press={isInert ? undefined : 'true'}
      style={style}
      {...pressHandlers}
    >
      {children}
    </button>
  )
}
