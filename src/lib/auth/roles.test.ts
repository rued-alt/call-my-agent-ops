import { describe, expect, it } from 'vitest'
import {
  isOpsRole,
  readRoleFromMetadata,
  roleAtLeast,
} from './roles'

describe('roles', () => {
  it('recognises the four ops roles', () => {
    expect(isOpsRole('owner')).toBe(true)
    expect(isOpsRole('ops')).toBe(true)
    expect(isOpsRole('on-call')).toBe(true)
    expect(isOpsRole('read-only')).toBe(true)
    expect(isOpsRole('intruder')).toBe(false)
    expect(isOpsRole(null)).toBe(false)
  })

  it('roleAtLeast respects the hierarchy', () => {
    expect(roleAtLeast('owner', 'ops')).toBe(true)
    expect(roleAtLeast('ops', 'ops')).toBe(true)
    expect(roleAtLeast('on-call', 'ops')).toBe(false)
    expect(roleAtLeast('read-only', 'read-only')).toBe(true)
  })

  it('readRoleFromMetadata returns null when role is missing or invalid', () => {
    expect(readRoleFromMetadata(null)).toBe(null)
    expect(readRoleFromMetadata({})).toBe(null)
    expect(readRoleFromMetadata({ role: 'admin' })).toBe(null)
    expect(readRoleFromMetadata({ role: 'owner' })).toBe('owner')
  })
})
