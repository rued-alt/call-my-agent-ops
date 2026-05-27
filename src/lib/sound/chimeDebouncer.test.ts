import { describe, it, expect } from 'vitest'
import { createChimeDebouncer } from './chimeDebouncer'

describe('createChimeDebouncer', () => {
  it('fires on the leading edge (first call for a kind)', () => {
    const d = createChimeDebouncer()
    expect(d.shouldChime('alert', 1_000)).toBe(true)
  })

  it('silences repeat calls for the same kind inside the window', () => {
    const d = createChimeDebouncer({ windowMs: 30_000 })
    expect(d.shouldChime('alert', 1_000)).toBe(true)
    expect(d.shouldChime('alert', 5_000)).toBe(false)
    expect(d.shouldChime('alert', 30_000)).toBe(false)
  })

  it('fires again once the per-kind window has fully elapsed', () => {
    const d = createChimeDebouncer({ windowMs: 30_000 })
    expect(d.shouldChime('alert', 1_000)).toBe(true)
    // Exactly windowMs later → falls outside the < windowMs guard
    expect(d.shouldChime('alert', 31_000)).toBe(true)
  })

  it('tracks each kind independently', () => {
    const d = createChimeDebouncer({ windowMs: 30_000 })
    expect(d.shouldChime('alert', 1_000)).toBe(true)
    expect(d.shouldChime('critical', 1_500)).toBe(true)
    // Both still inside their own windows
    expect(d.shouldChime('alert', 2_000)).toBe(false)
    expect(d.shouldChime('critical', 2_000)).toBe(false)
  })

  it('does NOT slide the window on a swallowed call', () => {
    const d = createChimeDebouncer({ windowMs: 30_000 })
    expect(d.shouldChime('alert', 1_000)).toBe(true)
    // Repeated noisy calls all silenced — lastFired stays at 1_000
    d.shouldChime('alert', 10_000)
    d.shouldChime('alert', 20_000)
    expect(d.lastFiredAt('alert')).toBe(1_000)
    // First call after windowMs (31_000) succeeds
    expect(d.shouldChime('alert', 31_000)).toBe(true)
    expect(d.lastFiredAt('alert')).toBe(31_000)
  })

  it('reset() clears all kinds so the next call fires immediately', () => {
    const d = createChimeDebouncer({ windowMs: 30_000 })
    d.shouldChime('alert', 1_000)
    d.shouldChime('critical', 1_000)
    d.reset()
    expect(d.lastFiredAt('alert')).toBeNull()
    expect(d.lastFiredAt('critical')).toBeNull()
    expect(d.shouldChime('alert', 2_000)).toBe(true)
  })

  it('uses Date.now() when no explicit timestamp is passed', () => {
    const d = createChimeDebouncer({ windowMs: 30_000 })
    const before = Date.now()
    expect(d.shouldChime('alert')).toBe(true)
    const fired = d.lastFiredAt('alert')
    expect(fired).not.toBeNull()
    // Should be in the same instant as the call
    expect(fired!).toBeGreaterThanOrEqual(before)
    expect(fired!).toBeLessThanOrEqual(Date.now())
  })

  it('defaults the window to 30 seconds when no options are passed', () => {
    const d = createChimeDebouncer()
    expect(d.shouldChime('alert', 0)).toBe(true)
    expect(d.shouldChime('alert', 29_999)).toBe(false)
    expect(d.shouldChime('alert', 30_000)).toBe(true)
  })
})
