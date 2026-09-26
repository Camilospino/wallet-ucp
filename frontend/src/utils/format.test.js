import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatDateTime } from './format'

describe('formatCurrency', () => {
  it('formats a number', () => {
    expect(formatCurrency(65000)).toMatch(/65\.000,00/)
  })

  it('formats a numeric string, as returned by PostgreSQL NUMERIC', () => {
    expect(formatCurrency('65000.00')).toMatch(/65\.000,00/)
  })

  it('formats decimals with exactly two digits', () => {
    expect(formatCurrency(1234.5)).toMatch(/1\.234,50/)
  })

  it('treats 0 as a valid amount', () => {
    expect(formatCurrency(0)).toMatch(/0,00/)
  })

  it('returns an empty string for values it cannot parse', () => {
    expect(formatCurrency('abc')).toBe('')
    expect(formatCurrency(null)).toBe('')
    expect(formatCurrency(undefined)).toBe('')
    expect(formatCurrency(NaN)).toBe('')
  })
})

describe('formatDate / formatDateTime', () => {
  it('formats a valid ISO date', () => {
    expect(formatDate('2026-09-26T10:30:00Z')).toMatch(/2026/)
  })

  it('includes the time in formatDateTime', () => {
    const result = formatDateTime('2026-09-26T10:30:00Z')
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('no-es-fecha')).toBe('')
    expect(formatDateTime('no-es-fecha')).toBe('')
  })
})
