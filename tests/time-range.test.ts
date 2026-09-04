import { describe, expect, it } from 'vitest'
import { customDayBounds, localDateKey, resolveTimeRange } from '../src/shared/time-range'

describe('resolveTimeRange', () => {
  it('resolves thisWeek as Monday 00:00 to now (left-closed right-open label)', () => {
    const now = new Date(2026, 6, 20, 15, 30, 0) // Monday
    const range = resolveTimeRange({ preset: 'thisWeek' }, now)
    expect(range.start).toEqual(new Date(2026, 6, 20, 0, 0, 0, 0))
    expect(range.end).toEqual(now)
  })

  it('resolves lastWeek as previous Monday to this Monday', () => {
    const now = new Date(2026, 6, 22, 12, 0, 0) // Wednesday
    const range = resolveTimeRange({ preset: 'lastWeek' }, now)
    expect(range.start).toEqual(new Date(2026, 6, 13, 0, 0, 0, 0))
    expect(range.end).toEqual(new Date(2026, 6, 20, 0, 0, 0, 0))
  })

  it('resolves thisMonth and lastMonth boundaries', () => {
    const now = new Date(2026, 6, 20, 18, 0, 0)
    const thisMonth = resolveTimeRange({ preset: 'thisMonth' }, now)
    expect(thisMonth.start).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0))
    expect(thisMonth.end).toEqual(now)

    const lastMonth = resolveTimeRange({ preset: 'lastMonth' }, now)
    expect(lastMonth.start).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0))
    expect(lastMonth.end).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0))
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
    expect(thisWeek.end).toEqual(wednesday)
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
