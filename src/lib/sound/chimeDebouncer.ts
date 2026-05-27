// chimeDebouncer — coalesces repeated chime invocations per "kind"
// so a burst of alerts doesn't spam the operator's ears.
//
// The Mission Control surface fires playChime(t, kind) when the
// toast stack receives a new alert. Without a debouncer, a flurry
// of provider-health alerts (say, a regional outage that trips 4
// rules in 6s) would play 4 chimes back-to-back. The operator
// experience that locked-in DECISION asked for is "≤1 chime per
// kind per N seconds, leading edge fires, trailing fires merge in".
//
// Behaviour:
//   - First call for a kind fires the chime immediately (leading edge).
//   - Subsequent calls within `windowMs` for the same kind are
//     swallowed; the timestamp is NOT extended (so the window is
//     fixed-length per kind, not a sliding window — the operator
//     can hear a new chime exactly windowMs after the last one).
//   - Different kinds are tracked independently.
//   - Calling `reset()` clears all timers (used by tests + when
//     the operator mutes + re-enables sound, which conceptually
//     resets the "I've heard this kind recently" memory).
//
// Default window is 30_000 ms — locked by DECISION (Sound debouncer
// — ≤1 chime per kind per 30s) under contract 574d913c.

export type ChimeKind = string

export type ChimeDebouncer = {
  /**
   * Returns true when the call should produce a chime (leading edge
   * or window expired). Returns false when the call should be
   * silenced (still inside the kind's debounce window).
   *
   * Pass `now` (epoch ms) explicitly so tests can advance time
   * without needing fake timers. When omitted, Date.now() is used.
   */
  shouldChime(kind: ChimeKind, now?: number): boolean
  /** Clear all per-kind timestamps. */
  reset(): void
  /** Read-only snapshot for tests. */
  lastFiredAt(kind: ChimeKind): number | null
}

export type CreateChimeDebouncerOptions = {
  /** Quiet window per kind in ms. Defaults to 30_000. */
  windowMs?: number
}

export function createChimeDebouncer(
  options?: CreateChimeDebouncerOptions,
): ChimeDebouncer {
  const windowMs = options?.windowMs ?? 30_000
  const lastFired = new Map<ChimeKind, number>()

  return {
    shouldChime(kind, now) {
      const t = now ?? Date.now()
      const prev = lastFired.get(kind)
      if (prev != null && t - prev < windowMs) return false
      lastFired.set(kind, t)
      return true
    },
    reset() {
      lastFired.clear()
    },
    lastFiredAt(kind) {
      return lastFired.get(kind) ?? null
    },
  }
}
