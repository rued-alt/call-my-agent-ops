import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpsEvalQueuePreview } from './OpsEvalQueuePreview'
import { TOKENS } from '../../lib/brand'
import { OPS_EVAL_QUEUE, OPS_CALLS } from '../../data/opsFixture'

// Wrap the component in a fresh QueryClient for each test.
function renderEval() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <OpsEvalQueuePreview t={TOKENS} />
    </QueryClientProvider>,
  )
}

// The first queue item (by fixture order)
const firstItem = OPS_EVAL_QUEUE[0]
const firstCall = OPS_CALLS.find((c) => c.id === firstItem.callId)!

describe('OpsEvalQueuePreview', () => {
  // ── Progress header ─────────────────────────────────────────────────────
  describe('Progress header', () => {
    it('renders the "Eval queue" heading', () => {
      renderEval()
      expect(screen.getByText('Eval queue')).toBeInTheDocument()
    })

    it('shows 0 / N rated initially', () => {
      renderEval()
      const counter = document.querySelector('[data-region="ops-eval-progress-counter"]')
      expect(counter).toBeInTheDocument()
      expect(counter!.textContent).toContain(`0 / ${OPS_EVAL_QUEUE.length} rated today`)
    })

    it('renders the progress bar element', () => {
      renderEval()
      const bar = document.querySelector('[data-region="ops-eval-progress-bar"]')
      expect(bar).toBeInTheDocument()
    })

    it('progress bar starts at 0% width', () => {
      renderEval()
      const bar = document.querySelector('[data-region="ops-eval-progress-bar"]') as HTMLElement
      expect(bar.style.width).toBe('0%')
    })
  })

  // ── First queue item card ───────────────────────────────────────────────
  describe('First queue item card', () => {
    it('renders the call card for the first queue item', () => {
      renderEval()
      const card = document.querySelector(`[data-region="ops-eval-card"][data-call-id="${firstItem.callId}"]`)
      expect(card).toBeInTheDocument()
    })

    it('renders the priority badge', () => {
      renderEval()
      const badge = document.querySelector('[data-region="ops-eval-priority-badge"]')
      expect(badge).toBeInTheDocument()
      // Should say "Urgent" for the first item
      expect(badge!.textContent).toContain('Urgent')
    })

    it('renders the queue reason', () => {
      renderEval()
      const reason = document.querySelector('[data-region="ops-eval-queue-reason"]')
      expect(reason).toBeInTheDocument()
      expect(reason!.textContent).toContain(firstItem.reason)
    })

    it('renders the customer business name', () => {
      renderEval()
      const biz = document.querySelector('[data-region="ops-eval-business"]')
      expect(biz).toBeInTheDocument()
      expect(biz!.textContent).toBe(firstCall.customerBusiness)
    })

    it('renders the auto quality score', () => {
      renderEval()
      const quality = document.querySelector('[data-region="ops-eval-auto-quality"]')
      expect(quality).toBeInTheDocument()
      expect(quality!.textContent).toBe(firstCall.autoQuality?.toString() ?? '—')
    })

    it('renders the call meta row (duration and outcome)', () => {
      renderEval()
      const meta = document.querySelector('[data-region="ops-eval-call-meta"]')
      expect(meta).toBeInTheDocument()
      // Duration should be present
      const m = Math.floor(firstCall.durationSec / 60)
      const s = firstCall.durationSec % 60
      expect(meta!.textContent).toContain(`${m}:${s.toString().padStart(2, '0')}`)
    })

    it('renders the rubric rail', () => {
      renderEval()
      const rubric = document.querySelector('[data-region="ops-eval-rubric"]')
      expect(rubric).toBeInTheDocument()
    })

    it('renders 4 rubric questions', () => {
      renderEval()
      const questions = document.querySelectorAll('[data-region="ops-eval-question"]')
      expect(questions).toHaveLength(4)
    })

    it('renders the audit strip with staff name', () => {
      renderEval()
      const audit = document.querySelector('[data-region="ops-eval-audit"]')
      expect(audit).toBeInTheDocument()
      expect(audit!.textContent).toContain('Viewed by')
    })
  })

  // ── Rubric interaction ──────────────────────────────────────────────────
  describe('Rubric — answer all 4 questions then submit', () => {
    it('commit button is disabled when no answers', () => {
      renderEval()
      const commit = document.querySelector('[data-region="ops-eval-commit"]') as HTMLButtonElement
      expect(commit).toBeInTheDocument()
      expect(commit.disabled).toBe(true)
    })

    it('commit button becomes enabled after all 4 questions answered', () => {
      renderEval()

      // Answer each question by clicking its first option button
      const questions = document.querySelectorAll('[data-region="ops-eval-question"]')
      questions.forEach((q) => {
        const firstOption = q.querySelector('[data-region="ops-eval-option"]') as HTMLElement
        if (firstOption) fireEvent.click(firstOption)
      })

      const commit = document.querySelector('[data-region="ops-eval-commit"]') as HTMLButtonElement
      expect(commit.disabled).toBe(false)
    })

    it('clicking commit advances to the next card', () => {
      renderEval()

      // Get first card's call id
      const firstCard = document.querySelector('[data-region="ops-eval-card"]')
      const firstCallId = firstCard!.getAttribute('data-call-id')

      // Answer all 4 questions
      const questions = document.querySelectorAll('[data-region="ops-eval-question"]')
      questions.forEach((q) => {
        const firstOption = q.querySelector('[data-region="ops-eval-option"]') as HTMLElement
        if (firstOption) fireEvent.click(firstOption)
      })

      const commit = document.querySelector('[data-region="ops-eval-commit"]') as HTMLElement
      fireEvent.click(commit)

      // Should now show a different card (next queue item)
      const secondItem = OPS_EVAL_QUEUE[1]
      const nextCard = document.querySelector(`[data-region="ops-eval-card"][data-call-id="${secondItem.callId}"]`)
      expect(nextCard).toBeInTheDocument()

      // First card should be gone
      const oldCard = document.querySelector(`[data-region="ops-eval-card"][data-call-id="${firstCallId}"]`)
      expect(oldCard).not.toBeInTheDocument()
    })

    it('counter increments after a successful commit', () => {
      renderEval()

      const questions = document.querySelectorAll('[data-region="ops-eval-question"]')
      questions.forEach((q) => {
        const firstOption = q.querySelector('[data-region="ops-eval-option"]') as HTMLElement
        if (firstOption) fireEvent.click(firstOption)
      })
      const commit = document.querySelector('[data-region="ops-eval-commit"]') as HTMLElement
      fireEvent.click(commit)

      const counter = document.querySelector('[data-region="ops-eval-progress-counter"]')
      expect(counter!.textContent).toContain('1 /')
    })

    it('rubric question shows data-answered=true after answering', () => {
      renderEval()
      const firstQuestion = document.querySelector('[data-region="ops-eval-question"]')!
      expect(firstQuestion.getAttribute('data-answered')).toBe('false')

      const firstOption = firstQuestion.querySelector('[data-region="ops-eval-option"]') as HTMLElement
      fireEvent.click(firstOption)

      expect(firstQuestion.getAttribute('data-answered')).toBe('true')
    })
  })

  // ── Empty / done state ─────────────────────────────────────────────────
  describe('Done state', () => {
    it('shows "Inbox zero" message after skipping all items', () => {
      renderEval()

      // Skip all items
      for (let i = 0; i < OPS_EVAL_QUEUE.length; i++) {
        const skip = document.querySelector('[data-region="ops-eval-skip"]') as HTMLElement
        if (skip) fireEvent.click(skip)
      }

      const done = document.querySelector('[data-region="ops-eval-done"]')
      expect(done).toBeInTheDocument()
      expect(screen.getByText(/Inbox zero/i)).toBeInTheDocument()
    })

    it('shows "Come back tomorrow" in the done state', () => {
      renderEval()

      for (let i = 0; i < OPS_EVAL_QUEUE.length; i++) {
        const skip = document.querySelector('[data-region="ops-eval-skip"]') as HTMLElement
        if (skip) fireEvent.click(skip)
      }

      expect(screen.getByText(/Come back tomorrow/i)).toBeInTheDocument()
    })
  })

  // ── Audit strip ────────────────────────────────────────────────────────
  describe('Audit strip', () => {
    it('renders audit strip with "Viewed by" text', () => {
      renderEval()
      const audit = document.querySelector('[data-region="ops-eval-audit"]')
      expect(audit).toBeInTheDocument()
      expect(audit!.textContent).toContain('Viewed by')
    })

    it('renders staff role in the audit strip', () => {
      renderEval()
      const audit = document.querySelector('[data-region="ops-eval-audit"]')
      // DEFAULT_OPS_STAFF has role 'owner'
      expect(audit!.textContent).toContain('owner')
    })

    it('renders staff name in the audit strip', () => {
      renderEval()
      const audit = document.querySelector('[data-region="ops-eval-audit"]')
      // DEFAULT_OPS_STAFF.fullName
      expect(audit!.textContent).toContain('Amrou Manaseer')
    })

    it('renders a time string in the audit strip', () => {
      renderEval()
      const audit = document.querySelector('[data-region="ops-eval-audit"]')
      // Should contain "at" + some time like "2:25 AM"
      expect(audit!.textContent).toContain('at')
      // Regex: matches time like "2:25 AM" or "11:59 PM"
      expect(audit!.textContent).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  // ── Priority badges ─────────────────────────────────────────────────────
  describe('Priority badge', () => {
    it('first item shows Urgent priority', () => {
      renderEval()
      const card = document.querySelector(
        `[data-region="ops-eval-card"][data-priority="${firstItem.priority}"]`,
      )
      expect(card).toBeInTheDocument()
    })
  })

  // ── j/k/e/r keyboard shortcuts (operator power-user layer) ──────────
  describe('keyboard shortcuts (j/k/e/r)', () => {
    function getActiveCallId(): string | null {
      const card = document.querySelector('[data-region="ops-eval-card"]')
      return card?.getAttribute('data-call-id') ?? null
    }

    it('j advances to the next queue item without committing', () => {
      renderEval()
      const before = getActiveCallId()
      expect(before).not.toBeNull()
      fireEvent.keyDown(window, { key: 'j' })
      const after = getActiveCallId()
      expect(after).not.toBe(before)
    })

    it('J (uppercase) also advances', () => {
      renderEval()
      const before = getActiveCallId()
      fireEvent.keyDown(window, { key: 'J' })
      expect(getActiveCallId()).not.toBe(before)
    })

    it('k walks back to the previous queue item', () => {
      renderEval()
      const first = getActiveCallId()
      fireEvent.keyDown(window, { key: 'j' })
      const second = getActiveCallId()
      expect(second).not.toBe(first)
      fireEvent.keyDown(window, { key: 'k' })
      expect(getActiveCallId()).toBe(first)
    })

    it('k at the top of the queue is a no-op (no crash, cursor stays)', () => {
      renderEval()
      const before = getActiveCallId()
      fireEvent.keyDown(window, { key: 'k' })
      expect(getActiveCallId()).toBe(before)
    })

    it('e advances to next call when rubric is fully answered', () => {
      renderEval()
      const startId = getActiveCallId()
      // Answer all 4 questions via the 1/2/3 layer
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: '1' })
      // Commit via 'e'
      fireEvent.keyDown(window, { key: 'e' })
      expect(getActiveCallId()).not.toBe(startId)
    })

    it('e is a no-op when rubric is incomplete', () => {
      renderEval()
      const startId = getActiveCallId()
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: 'e' })
      expect(getActiveCallId()).toBe(startId)
    })

    it('r resets the in-progress rubric so e is no longer accepted', () => {
      renderEval()
      const startId = getActiveCallId()
      // Build a full rubric
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: '1' })
      // Reset
      fireEvent.keyDown(window, { key: 'r' })
      // e should now be ignored — same card stays active
      fireEvent.keyDown(window, { key: 'e' })
      expect(getActiveCallId()).toBe(startId)
    })
  })
})
