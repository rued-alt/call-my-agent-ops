import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

// ExpanderPanel — headless smooth-height container.
//
// Ported from brand-studio: src/components/previews/_shared/Expander.tsx
//
// Use when the caller owns its own trigger (e.g. a row tap, an external
// toggle) and just needs the smooth-height reveal. Both open→close and
// close→open are animated; siblings reflow WITH the panel, not after it.
//
// Both `--motion-duration-accordion` (200ms) + `--motion-easing-enter`
// tokens drive the height transition.

type Phase = 'closed' | 'opening' | 'open' | 'closing'

type ExpanderPanelProps = {
  open: boolean
  children: ReactNode
  dataRegion?: string
  dataAttrs?: Record<string, string>
  id?: string
  onAccordionEnd?: (open: boolean) => void
  style?: CSSProperties
}

export function ExpanderPanel({
  open,
  children,
  dataRegion,
  dataAttrs,
  id,
  onAccordionEnd,
  style,
}: ExpanderPanelProps) {
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)

  // Drive phase transitions off the external `open` prop.
  useLayoutEffect(() => {
    if (open && (phase === 'closed' || phase === 'closing')) {
      setPhase('opening')
    } else if (!open && (phase === 'open' || phase === 'opening')) {
      const wrap = wrapRef.current
      if (wrap) {
        wrap.style.height = `${wrap.scrollHeight}px`
        void wrap.offsetHeight
      }
      setPhase('closing')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Once opening: measure + set the target height to kick the transition.
  useLayoutEffect(() => {
    if (phase !== 'opening') return
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return
    if (wrap.style.height === '' || wrap.style.height === 'auto') {
      wrap.style.height = '0px'
      void wrap.offsetHeight
    }
    const target = inner.scrollHeight
    wrap.style.height = `${target}px`
  }, [phase])

  // Once closing: pin to 0 to fire the reverse transition.
  useLayoutEffect(() => {
    if (phase !== 'closing') return
    const wrap = wrapRef.current
    if (!wrap) return
    wrap.style.height = '0px'
  }, [phase])

  // Fallback timers for jsdom (no layout/transitions in tests) and
  // prefers-reduced-motion environments.
  useEffect(() => {
    if (phase !== 'opening' && phase !== 'closing') return
    const FALLBACK_MS = 260
    const tid = window.setTimeout(() => {
      const wrap = wrapRef.current
      if (!wrap) return
      if (phase === 'opening') {
        wrap.style.height = 'auto'
        setPhase('open')
        onAccordionEnd?.(true)
      } else if (phase === 'closing') {
        wrap.style.height = '0px'
        setPhase('closed')
        onAccordionEnd?.(false)
      }
    }, FALLBACK_MS)
    return () => window.clearTimeout(tid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ResizeObserver: keep container tight to content when open.
  useEffect(() => {
    if (phase !== 'open') return
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const target = inner.scrollHeight
      wrap.style.height = `${target}px`
      const tid = window.setTimeout(() => {
        if (wrap.style.height !== '0px') wrap.style.height = 'auto'
      }, 220)
      return () => window.clearTimeout(tid)
    })
    ro.observe(inner)
    return () => ro.disconnect()
  }, [phase])

  // Handle transition completion.
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.propertyName && e.propertyName !== 'height') return
    const wrap = wrapRef.current
    if (!wrap) return
    if (phase === 'opening') {
      wrap.style.height = 'auto'
      setPhase('open')
      onAccordionEnd?.(true)
    } else if (phase === 'closing') {
      wrap.style.height = '0px'
      setPhase('closed')
      onAccordionEnd?.(false)
    }
  }

  // Don't render when fully collapsed.
  if (phase === 'closed') return null

  const initialHeight = phase === 'opening' ? '0px' : undefined

  const extraDataProps: Record<string, string> = {}
  if (dataAttrs) {
    for (const [k, v] of Object.entries(dataAttrs)) extraDataProps[k] = v
  }

  return (
    <div
      ref={wrapRef}
      id={id}
      data-region={dataRegion}
      data-expander-panel="true"
      data-expander-phase={phase}
      onTransitionEnd={handleTransitionEnd}
      style={{
        overflow: 'hidden',
        height: initialHeight,
        transition: `height var(--motion-duration-accordion, 200ms) var(--motion-easing-enter, ease-out)`,
        ...style,
      }}
      {...extraDataProps}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  )
}
