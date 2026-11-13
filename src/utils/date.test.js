import { describe, expect, it } from 'vitest'
import {
  countdownLabel,
  dateInputToIso,
  daysUntil,
  diffDays,
  formatDateRange,
  parseDateOnly,
  parseTimestamp,
  timeAgo,
  toDateInput,
  tripDays,
} from './date'

describe('kalenderdatums', () => {
  it('neemt enkel het datumdeel en verschuift nooit door tijdzones', () => {
    const d = parseDateOnly('2026-11-04T00:00:00Z')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 4])
    expect(toDateInput('2026-11-04T23:30:00Z')).toBe('2026-11-04')
  })

  it('zet een date-input om naar UTC-middernacht', () => {
    expect(dateInputToIso('2026-11-04')).toBe('2026-11-04T00:00:00.000Z')
    expect(dateInputToIso('')).toBeNull()
  })

  it('telt reisdagen inclusief start en einde', () => {
    expect(tripDays('2026-06-14', '2026-06-26')).toBe(13)
    expect(tripDays('2026-06-14', '2026-06-14')).toBe(1)
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2) // over zomertijd heen
  })

  it('formatteert datumbereiken compact', () => {
    expect(formatDateRange('2026-06-14', '2026-06-26')).toBe('14 – 26 jun 2026')
    expect(formatDateRange('2026-06-28', '2026-07-03')).toMatch(/^28 jun – 3 jul 2026$/)
    expect(formatDateRange('2025-12-28', '2026-01-03')).toMatch(/2025 – 3 jan 2026$/)
  })
})

describe('tijdstempels', () => {
  const now = new Date('2026-10-12T12:00:00Z')

  it('behandelt een tijdstempel zonder zone als UTC', () => {
    expect(parseTimestamp('2026-10-12T10:00:00').toISOString()).toBe('2026-10-12T10:00:00.000Z')
  })

  it('geeft compacte relatieve tijd', () => {
    expect(timeAgo('2026-10-12T11:59:30Z', now)).toBe('zojuist')
    expect(timeAgo('2026-10-12T11:15:00Z', now)).toBe('45 min')
    expect(timeAgo('2026-10-12T09:00:00Z', now)).toBe('3 u')
    expect(timeAgo('2026-10-10T12:00:00Z', now)).toBe('2 d')
    expect(timeAgo('2026-09-28T12:00:00Z', now)).toBe('2 w')
  })
})

describe('aftellen', () => {
  const now = new Date(2026, 9, 12, 9, 0)

  it('telt dagen tot vertrek', () => {
    expect(daysUntil('2026-10-20', now)).toBe(8)
    expect(countdownLabel('2026-10-20', '2026-10-25', now)).toBe('Nog 8 dagen')
    expect(countdownLabel('2026-10-13', '2026-10-15', now)).toBe('Morgen')
    expect(countdownLabel('2026-10-12', '2026-10-15', now)).toBe('Vandaag')
    expect(countdownLabel('2026-10-10', '2026-10-15', now)).toBe('Onderweg')
    expect(countdownLabel('2026-10-01', '2026-10-05', now)).toBe('Afgelopen')
  })
})
