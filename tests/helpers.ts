import assert from 'node:assert/strict'

/** Narrow fixture lookups at the boundary without hiding missing test data. */
export function required<T>(value: T | null | undefined): T {
  assert.ok(value !== null && value !== undefined, 'expected fixture value')
  return value
}
