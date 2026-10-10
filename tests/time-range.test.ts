import { describe, expect, it } from 'vitest'
import { customDayBounds, localDateKey, resolveTimeRange } from '../src/shared/time-range'

describe('resolveTimeRange', () => {
  it.each([5, 10, 11])(
    'resolves thisWeek as the whole Monday–Sunday period on October %s',
    (day) => {
      const now = new Date(2026, 9, day, 15, 30)
      const range = resolveTimeRange({ preset: 'thisWeek' }, now)
      expect(range.start).toEqual(new Date(2026, 9, 5))
      expect(range.end).toEqual(new Date(2026, 9, 12))
      expect(range.label).toContain('2026-10-05 00:00 ～ 2026-10-11 23:59')
    }
  )

  it('resolves lastWeek as previous Monday to this Monday', () => {
    const now = new Date(2026, 6, 22, 12, 0, 0) // Wednesday
    const range = resolveTimeRange({ preset: 'lastWeek' }, now)
    expect(range.start).toEqual(new Date(2026, 6, 13, 0, 0, 0, 0))
    expect(range.end).toEqual(new Date(2026, 6, 20, 0, 0, 0, 0))
    expect(range.label).toContain('2026-07-19 23:59')
  })

  it('resolves thisMonth and lastMonth boundaries', () => {
    const now = new Date(2026, 6, 20, 18, 0, 0)
    const thisMonth = resolveTimeRange({ preset: 'thisMonth' }, now)
    expect(thisMonth.start).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0))
    expect(thisMonth.end).toEqual(new Date(2026, 7, 1))
    expect(thisMonth.label).toContain('2026-07-31 23:59')

    const lastMonth = resolveTimeRange({ preset: 'lastMonth' }, now)
    expect(lastMonth.start).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0))
    expect(lastMonth.end).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0))
    expect(lastMonth.label).toContain('2026-06-30 23:59')
  })

  it.each([
    [2026, 9, 1, 31],
    [2026, 9, 31, 31],
    [2024, 1, 1, 29],
    [2025, 1, 28, 28],
    [2026, 11, 31, 31],
    [2026, 3, 1, 30]
  ])('uses the complete month for %s/%s/%s', (year, month, day, lastDay) => {
    const range = resolveTimeRange({ preset: 'thisMonth' }, new Date(year, month, day, 12))
    expect(range.start).toEqual(new Date(year, month, 1))
    expect(range.end).toEqual(new Date(year, month + 1, 1))
    expect(localDateKey(new Date(range.end.getTime() - 1))).toBe(
      localDateKey(new Date(year, month, lastDay))
    )
  })

  it('uses custom closed bounds 00:00:00 ~ 23:59:59.999', () => {
    const bounds = customDayBounds(new Date(2026, 6, 1), new Date(2026, 6, 3))
    expect(bounds.start).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0))
    expect(bounds.end).toEqual(new Date(2026, 6, 3, 23, 59, 59, 999))

    const range = resolveTimeRange({
      preset: 'custom',
      customStart: bounds.start.toISOString(),
      customEnd: bounds.end.toISOString()
    })
    expect(range.start.getTime()).toBe(bounds.start.getTime())
    expect(range.end.getTime()).toBe(bounds.end.getTime())
  })

  it('rejects invalid custom ranges', () => {
    expect(() => resolveTimeRange({ preset: 'custom' })).toThrow()
    expect(() =>
      resolveTimeRange({
        preset: 'custom',
        customStart: new Date(2026, 6, 3).toISOString(),
        customEnd: new Date(2026, 6, 1).toISOString()
      })
    ).toThrow(/早于/)
  })

  it('handles year boundary and leap day month ranges', () => {
    const newYearEve = new Date(2025, 0, 1, 12, 0, 0)
    const lastMonth = resolveTimeRange({ preset: 'lastMonth' }, newYearEve)
    expect(lastMonth.start).toEqual(new Date(2024, 11, 1, 0, 0, 0, 0))
    expect(lastMonth.end).toEqual(new Date(2025, 0, 1, 0, 0, 0, 0))

    const leapDay = new Date(2024, 2, 1, 10, 0, 0) // March 1, 2024
    const february = resolveTimeRange({ preset: 'lastMonth' }, leapDay)
    expect(february.start).toEqual(new Date(2024, 1, 1, 0, 0, 0, 0))
    expect(february.end).toEqual(new Date(2024, 2, 1, 0, 0, 0, 0))
  })

  it('handles week crossing year boundary', () => {
    const wednesday = new Date(2025, 0, 1, 12, 0, 0) // Wed Jan 1 2025
    const thisWeek = resolveTimeRange({ preset: 'thisWeek' }, wednesday)
    expect(thisWeek.start).toEqual(new Date(2024, 11, 30, 0, 0, 0, 0))
    expect(thisWeek.end).toEqual(new Date(2025, 0, 6))
    expect(thisWeek.label).toContain('2025-01-05 23:59')
  })
})

describe('localDateKey', () => {
  it('groups ISO timestamps by the current local calendar day', () => {
    const localTime = new Date(2026, 8, 4, 0, 30)
    expect(localDateKey(localTime.toISOString())).toBe('2026-09-04')
  })

  it('rejects invalid timestamps', () => {
    expect(() => localDateKey('not-a-date')).toThrow(/无效日期/)
  })
})
