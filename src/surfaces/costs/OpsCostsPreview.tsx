import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BrandTokens } from '../../lib/brand'
import { hexToRgba } from '../../lib/glass'
import {
  OPS_COSTS,
  OPS_CUSTOMERS,
  type OpsCostRow,
} from '../../data/opsFixture'

// OpsCostsPreview — per-customer unit economics, trailing 30 days.
//
// Three things the founder wants to know:
//   1. Are we burning money on the wrong customers?
//   2. What's the per-call cost of service trending toward?
//   3. Which customers should we upsell vs. churn-stabilize vs. raise prices on?
//
// Layout:
//   1. Portfolio rollup tiles (Total cost / Total revenue / Net margin /
//      Loss-makers + blended cost-per-call)
//   2. Per-customer table sorted by margin ASC (loss-makers first, red highlight)
//   3. Click row → drawer with cost breakdown by provider category
//
// Per contract f9ee1622: NEVER say "Rue" — always "the agent".
//
// Data wiring: useQuery with queryKey ['ops', 'costs'] returns fixture.
// TODO(backend-wireup): replace queryFn with real endpoint:
//   GET /admin/ops/costs -> OpsCostRow[]
// When backend ships, swap the async fixture wrapper below with a fetch call.

type CostsData = {
  costs: OpsCostRow[]
}

// TODO(backend-wireup): replace with fetch('/admin/ops/costs').
async function fetchCostsData(): Promise<CostsData> {
  return { costs: OPS_COSTS }
}

export type OpsCostsPreviewProps = {
  t: BrandTokens
}

export function OpsCostsPreview({ t }: OpsCostsPreviewProps) {
  const u = t.space.unit

  const { data } = useQuery({
    queryKey: ['ops', 'costs'],
    queryFn: fetchCostsData,
    // Fixture is synchronous — initialData means no loading state needed
    initialData: { costs: OPS_COSTS },
  })

  const [openDrawerCustomerId, setOpenDrawerCustomerId] = useState<
    string | null
  >(null)

  const costs = data.costs

  // Sort by margin ASC so loss-makers float to the top.
  const sorted = [...costs].sort(
    (a, b) => a.marginLast30d - b.marginLast30d,
  )

  // Portfolio rollup
  const totalCost = costs.reduce((sum, r) => sum + r.costLast30d, 0)
  const totalRev = costs.reduce((sum, r) => sum + r.revenueLast30d, 0)
  const totalMargin = totalRev - totalCost
  const totalCalls = costs.reduce((sum, r) => sum + r.callsLast30d, 0)
  const blendedCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0
  const lossMakers = costs.filter((r) => r.marginLast30d < 0).length

  const activeDrawerRow = sorted.find(
    (r) => r.customerId === openDrawerCustomerId,
  ) ?? null

  return (
    <div
      data-page="ops-costs"
      style={{
        padding: `${u * 5}px ${u * 8}px ${u * 8}px ${u * 8}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: u * 5,
        maxHeight: '80vh',
        overflowY: 'auto',
        color: t.color.foreground,
        fontFamily: t.type.bodyFamily,
      }}
    >
      {/* Heading row */}
      <div
        data-region="ops-costs-heading"
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <h1
          style={{
            fontFamily: t.type.headingFamily,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '-0.015em',
            margin: 0,
          }}
        >
          Costs · trailing 30 days
        </h1>
        <span
          style={{
            color: t.color.muted,
            fontFamily: t.type.monoFamily,
            fontSize: 11,
            letterSpacing: 0.3,
          }}
        >
          {costs.length} accounts · {totalCalls.toLocaleString()} calls
        </span>
      </div>

      {/* Portfolio rollup */}
      <div
        data-region="ops-costs-rollup"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: u * 3,
        }}
      >
        <RollupTile
          t={t}
          label="Total cost"
          value={`$${totalCost.toFixed(2)}`}
          cascadeDelay={0}
        />
        <RollupTile
          t={t}
          label="Total revenue"
          value={`$${totalRev.toFixed(2)}`}
          cascadeDelay={60}
        />
        <RollupTile
          t={t}
          label="Net margin"
          value={`$${totalMargin.toFixed(2)}`}
          tone={totalMargin >= 0 ? 'good' : 'bad'}
          cascadeDelay={120}
        />
        <RollupTile
          t={t}
          label="Loss-makers"
          value={`${lossMakers} / ${costs.length}`}
          tone={lossMakers > 0 ? 'warn' : 'good'}
          sub={`blended $${blendedCostPerCall.toFixed(3)} per call`}
          cascadeDelay={180}
        />
      </div>

      {/* Per-customer table */}
      <div
        data-region="ops-costs-table"
        style={{
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.md,
          overflow: 'hidden',
        }}
      >
        {/* Table head */}
        <div
          data-region="ops-costs-table-head"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.8fr 0.9fr 0.9fr',
            alignItems: 'center',
            gap: u * 2,
            padding: `${u * 1.5}px ${u * 3}px`,
            background: hexToRgba(t.color.background, 0.6),
            borderBottom: `1px solid ${t.color.border}`,
            color: t.color.muted,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase' as const,
          }}
        >
          <div>Customer</div>
          <div style={{ textAlign: 'right' }}>Calls</div>
          <div style={{ textAlign: 'right' }}>Cost</div>
          <div style={{ textAlign: 'right' }}>Revenue</div>
          <div style={{ textAlign: 'right' }}>Margin</div>
          <div style={{ textAlign: 'right' }}>Cost / call</div>
        </div>

        {/* Table rows */}
        {sorted.map((row, i) => {
          const customer = OPS_CUSTOMERS.find(
            (c) => c.id === row.customerId,
          )
          const planLabel = customer?.plan ?? '—'
          const onTrial = customer?.plan === 'trial'
          const negative = row.marginLast30d < 0
          const isOpen = openDrawerCustomerId === row.customerId

          return (
            <div key={row.customerId}>
              <button
                type="button"
                data-region="ops-costs-row"
                data-customer-id={row.customerId}
                data-loss-maker={negative ? 'true' : 'false'}
                onClick={() =>
                  setOpenDrawerCustomerId(
                    isOpen ? null : row.customerId,
                  )
                }
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1.6fr 0.8fr 0.8fr 0.8fr 0.9fr 0.9fr',
                  alignItems: 'center',
                  gap: u * 2,
                  padding: `${u * 2}px ${u * 3}px`,
                  width: '100%',
                  borderBottom: `1px solid ${t.color.border}`,
                  borderLeft: `3px solid ${negative ? t.color.error : t.color.primary}`,
                  fontFamily: t.type.bodyFamily,
                  fontSize: 13,
                  color: t.color.foreground,
                  background: isOpen
                    ? hexToRgba(t.color.primary, 0.06)
                    : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: 0,
                  animation: `cma-cascade-in 220ms var(--motion-easing-enter, ease-out) ${i * 25}ms forwards`,
                  transition:
                    'background 120ms ease',
                }}
              >
                {/* Customer name + plan */}
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {row.customerBusiness}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      color: onTrial
                        ? t.color.accent
                        : t.color.muted,
                      fontSize: 11,
                      letterSpacing: 0.3,
                      textTransform: 'uppercase',
                    }}
                  >
                    {planLabel}
                  </div>
                </div>

                {/* Calls */}
                <div
                  style={{
                    fontFamily: t.type.monoFamily,
                    fontSize: 13,
                    textAlign: 'right',
                  }}
                >
                  {row.callsLast30d.toLocaleString()}
                </div>

                {/* Cost */}
                <div
                  style={{
                    fontFamily: t.type.monoFamily,
                    fontSize: 13,
                    textAlign: 'right',
                  }}
                >
                  ${row.costLast30d.toFixed(2)}
                </div>

                {/* Revenue */}
                <div
                  style={{
                    fontFamily: t.type.monoFamily,
                    fontSize: 13,
                    textAlign: 'right',
                    color:
                      row.revenueLast30d === 0
                        ? t.color.muted
                        : t.color.foreground,
                  }}
                >
                  ${row.revenueLast30d.toFixed(2)}
                </div>

                {/* Margin */}
                <div
                  style={{
                    fontFamily: t.type.monoFamily,
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'right',
                    color: negative
                      ? t.color.error
                      : t.color.primary,
                  }}
                >
                  {negative ? '−' : '+'}$
                  {Math.abs(row.marginLast30d).toFixed(2)}
                </div>

                {/* Cost per call */}
                <div
                  style={{
                    fontFamily: t.type.monoFamily,
                    fontSize: 13,
                    textAlign: 'right',
                    color: t.color.muted,
                  }}
                >
                  ${row.costPerCall.toFixed(3)}
                </div>
              </button>

              {/* Cost breakdown drawer */}
              {isOpen && row.breakdown && (
                <CostBreakdownDrawer t={t} row={row} />
              )}
            </div>
          )
        })}
      </div>

      {/* Active drawer hint when no breakdown */}
      {activeDrawerRow && !activeDrawerRow.breakdown && (
        <div
          style={{
            padding: u * 3,
            color: t.color.muted,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          No breakdown available for {activeDrawerRow.customerBusiness}.
        </div>
      )}
    </div>
  )
}

// ── Rollup tile ───────────────────────────────────────────────────────────

function RollupTile({
  t,
  label,
  value,
  tone,
  sub,
  cascadeDelay,
}: {
  t: BrandTokens
  label: string
  value: string
  tone?: 'good' | 'warn' | 'bad'
  sub?: string
  cascadeDelay: number
}) {
  const u = t.space.unit
  const valueColor =
    tone === 'good'
      ? t.color.primary
      : tone === 'warn'
        ? t.color.accent
        : tone === 'bad'
          ? t.color.error
          : t.color.foreground

  return (
    <div
      data-region="ops-costs-rollup-tile"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: u * 1.5,
        padding: u * 4,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        borderRadius: t.radius.md,
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        WebkitBackdropFilter:
          'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        boxShadow: 'var(--glass-rim), var(--glass-lift)',
        opacity: 0,
        animation: `cma-cascade-in 320ms var(--motion-easing-enter, ease-out) ${cascadeDelay}ms forwards`,
      }}
    >
      <span
        style={{
          color: t.color.muted,
          fontSize: 11,
          letterSpacing: 0.4,
          textTransform: 'uppercase' as const,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: t.type.headingFamily,
          fontWeight: 700,
          fontSize: 26,
          color: valueColor,
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            color: t.color.muted,
            fontSize: 11,
            fontFamily: t.type.monoFamily,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  )
}

// ── Cost breakdown drawer ─────────────────────────────────────────────────

function CostBreakdownDrawer({
  t,
  row,
}: {
  t: BrandTokens
  row: OpsCostRow
}) {
  const u = t.space.unit
  const bd = row.breakdown!

  const lines: { label: string; value: number; key: string }[] = [
    { key: 'llm', label: 'LLM cost', value: bd.llmCost },
    { key: 'stt', label: 'STT cost', value: bd.sttCost },
    { key: 'tts', label: 'TTS cost', value: bd.ttsCost },
    {
      key: 'telephony',
      label: 'Telephony cost',
      value: bd.telephonyCost,
    },
  ]

  return (
    <div
      data-region="ops-costs-drawer"
      data-customer-id={row.customerId}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: u * 3,
        padding: `${u * 3}px ${u * 4}px`,
        background: hexToRgba(t.color.background, 0.7),
        borderBottom: `1px solid ${t.color.border}`,
        borderLeft: `3px solid ${t.color.border}`,
      }}
    >
      {lines.map((line) => (
        <div
          key={line.key}
          data-region="ops-costs-breakdown-item"
          data-breakdown-key={line.key}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: u,
            padding: u * 2,
            background: t.color.surface,
            border: `1px solid ${t.color.border}`,
            borderRadius: t.radius.sm,
          }}
        >
          <span
            style={{
              color: t.color.muted,
              fontSize: 10,
              letterSpacing: 0.4,
              textTransform: 'uppercase' as const,
              fontWeight: 500,
            }}
          >
            {line.label}
          </span>
          <span
            style={{
              fontFamily: t.type.monoFamily,
              fontWeight: 600,
              fontSize: 15,
              color: t.color.foreground,
            }}
          >
            ${line.value.toFixed(2)}
          </span>
          {row.callsLast30d > 0 && (
            <span
              style={{
                color: t.color.muted,
                fontSize: 10,
                fontFamily: t.type.monoFamily,
              }}
            >
              ${(line.value / row.callsLast30d).toFixed(4)} / call
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
