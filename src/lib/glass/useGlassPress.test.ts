import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useGlassPress } from './useGlassPress'
import { TOKENS } from '../brand'

const t = TOKENS

describe('useGlassPress', () => {
  it('starts not pressed', () => {
    const { result } = renderHook(() => useGlassPress(t))
    expect(result.current.pressedDown).toBe(false)
    expect(result.current.pressStyle).toEqual({})
  })

  it('becomes pressed on mousedown', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => {
      result.current.pressHandlers.onMouseDown()
    })
    expect(result.current.pressedDown).toBe(true)
    expect(result.current.pressStyle).not.toEqual({})
  })

  it('releases on mouseup', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => {
      result.current.pressHandlers.onMouseDown()
    })
    expect(result.current.pressedDown).toBe(true)
    act(() => {
      result.current.pressHandlers.onMouseUp()
    })
    expect(result.current.pressedDown).toBe(false)
    expect(result.current.pressStyle).toEqual({})
  })

  it('releases on mouseLeave', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => result.current.pressHandlers.onMouseDown())
    act(() => result.current.pressHandlers.onMouseLeave())
    expect(result.current.pressedDown).toBe(false)
  })

  it('releases on touchEnd', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => result.current.pressHandlers.onTouchStart())
    expect(result.current.pressedDown).toBe(true)
    act(() => result.current.pressHandlers.onTouchEnd())
    expect(result.current.pressedDown).toBe(false)
  })

  it('releases on touchCancel', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => result.current.pressHandlers.onTouchStart())
    act(() => result.current.pressHandlers.onTouchCancel())
    expect(result.current.pressedDown).toBe(false)
  })

  it('presses on Space key', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => result.current.pressHandlers.onKeyDown({ key: ' ' } as React.KeyboardEvent))
    expect(result.current.pressedDown).toBe(true)
    act(() => result.current.pressHandlers.onKeyUp({ key: ' ' } as React.KeyboardEvent))
    expect(result.current.pressedDown).toBe(false)
  })

  it('presses on Enter key', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => result.current.pressHandlers.onKeyDown({ key: 'Enter' } as React.KeyboardEvent))
    expect(result.current.pressedDown).toBe(true)
    act(() => result.current.pressHandlers.onKeyUp({ key: 'Enter' } as React.KeyboardEvent))
    expect(result.current.pressedDown).toBe(false)
  })

  it('does not press when enabled=false', () => {
    const { result } = renderHook(() => useGlassPress(t, { enabled: false }))
    act(() => result.current.pressHandlers.onMouseDown())
    expect(result.current.pressedDown).toBe(false)
    expect(result.current.pressStyle).toEqual({})
  })

  it('includes translateY in pressStyle by default', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => result.current.pressHandlers.onMouseDown())
    expect(result.current.pressStyle.transform).toContain('translateY(1px)')
  })

  it('skips depress transform when skipDepress=true', () => {
    const { result } = renderHook(() => useGlassPress(t, { skipDepress: true }))
    act(() => result.current.pressHandlers.onMouseDown())
    expect(result.current.pressedDown).toBe(true)
    expect(result.current.pressStyle.transform).toBeUndefined()
  })

  it('includes boxShadow glow when pressed', () => {
    const { result } = renderHook(() => useGlassPress(t))
    act(() => result.current.pressHandlers.onMouseDown())
    expect(result.current.pressStyle.boxShadow).toBeDefined()
    expect(result.current.pressStyle.boxShadow).toContain('var(--glass-rim)')
  })

  it('uses pressColor in boxShadow', () => {
    const pressColor = '#ff0000'
    const { result } = renderHook(() => useGlassPress(t, { pressColor }))
    act(() => result.current.pressHandlers.onMouseDown())
    // rgba(255, 0, 0, ...) should appear in the shadow
    expect(result.current.pressStyle.boxShadow).toContain('rgba(255, 0, 0,')
  })
})
