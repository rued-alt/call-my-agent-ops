import { useCallback, useRef, useState } from 'react'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import { AnimatedCheckmark } from './AnimatedCheckmark'

// OpsToast — bottom-right ephemeral confirmation toast. Used to simulate
// the result of an action button click in the ops surfaces. Visual:
// glass card + AnimatedCheckmark + label. Auto-dismisses after ~2.4s.

export type OpsToastTone = 'success' | 'warn' | 'info'

type ToastMessage = {
  id: number
  label: string
  detail?: string
  tone: OpsToastTone
}

export function useOpsToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const idRef = useRef(0)

  const show = useCallback(
    (label: string, detail?: string, tone: OpsToastTone = 'success') => {
      const id = ++idRef.current
      setToasts((cur) => [...cur, { id, label, detail, tone }])
      window.setTimeout(() => {
        setToasts((cur) => cur.filter((m) => m.id !== id))
      }, 2400)
    },
    [],
  )

  return { toasts, show }
}

export function OpsToastStack({
  t,
  toasts,
}: {
  t: BrandTokens
  toasts: ToastMessage[]
}) {
  if (toasts.length === 0) return null
  return (
    <div
      data-region="ops-toast-stack"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((m) => (
        <OpsToastCard key={m.id} t={t} message={m} />
      ))}
    </div>
  )
}

function OpsToastCard({
  t,
  message,
}: {
  t: BrandTokens
  message: ToastMessage
}) {
  const accent =
    message.tone === 'success'
      ? t.color.primary
      : message.tone === 'warn'
        ? t.color.accent
        : t.color.foreground
  return (
    <div
      data-region="ops-toast"
      data-tone={message.tone}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: hexToRgba(t.color.background, 0.96),
        border: `1px solid ${t.color.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: t.radius.md,
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        WebkitBackdropFilter:
          'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        boxShadow: 'var(--glass-rim), var(--glass-lift)',
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
        fontSize: 12,
        minWidth: 260,
        animation:
          'cma-modal-slide-up var(--motion-duration-modal, 220ms) cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      {message.tone === 'success' ? (
        <AnimatedCheckmark t={t} size={16} withCircle={false} color={accent} />
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: 999,
            background: accent,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{message.label}</div>
        {message.detail && (
          <div style={{ color: t.color.muted, marginTop: 2 }}>
            {message.detail}
          </div>
        )}
      </div>
    </div>
  )
}
