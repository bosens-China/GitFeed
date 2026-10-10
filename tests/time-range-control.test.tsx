import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import dayjs, { type Dayjs } from 'dayjs'
import { beforeEach, expect, it, vi } from 'vitest'
import { TimeRangeControl } from '../src/renderer/src/components/TimeRangeControl'
import { createHolidayCalendar } from '../src/shared/holiday-calendar'
import { resolveTimeRange } from '../src/shared/time-range'
import type { TimeRangeState } from '../src/shared/models'
import bundled2026 from '../src/main/holidays/2026.json'

const controls = vi.hoisted(() => ({
  select: null as null | ((value: string) => void),
  pick: null as null | ((start: Dayjs, end: Dayjs) => void),
  value: null as null | [Dayjs, Dayjs]
}))
vi.mock('antd', () => ({
  Segmented: ({ onChange }: { onChange: (value: string) => void }) => {
    controls.select = onChange
    return null
  }
}))
vi.mock('../src/renderer/src/components/HolidayRangePicker', () => ({
  HolidayRangePicker: ({
    value,
    onChange
  }: {
    value: [Dayjs, Dayjs]
    onChange: (start: Dayjs, end: Dayjs) => void
  }) => {
    controls.value = value
    controls.pick = onChange
    return null
  }
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
const calendar = createHolidayCalendar([bundled2026])
const change = vi.fn()
function render(state: TimeRangeState, now = new Date(2026, 9, 10, 15, 30)): void {
  const range = resolveTimeRange(state, now)
  renderToStaticMarkup(
    createElement(TimeRangeControl, { state, range, calendar, onChange: change })
  )
}
beforeEach(() => change.mockClear())

it('shows the complete calendar period and preserves its dates when switching to custom', () => {
  render({ preset: 'thisWeek' })
  expect(controls.value?.map((date) => date.format('YYYY-MM-DD'))).toEqual([
    '2026-10-05',
    '2026-10-11'
  ])
  controls.select?.('custom')
  expect(change).toHaveBeenCalledWith({
    preset: 'custom',
    customStart: new Date(2026, 9, 5).toISOString(),
    customEnd: new Date(2026, 9, 11, 23, 59, 59, 999).toISOString()
  })
  controls.select?.('thisMonth')
  expect(change).toHaveBeenLastCalledWith({ preset: 'thisMonth' })
})

it('shows the last included date for exclusive bounds and keeps midnight ranges ordered', () => {
  render({ preset: 'lastWeek' })
  expect(controls.value?.map((date) => date.format('YYYY-MM-DD'))).toEqual([
    '2026-09-28',
    '2026-10-04'
  ])
  render({ preset: 'thisWeek' }, new Date(2026, 9, 5))
  expect(controls.value?.map((date) => date.format('YYYY-MM-DD'))).toEqual([
    '2026-10-05',
    '2026-10-11'
  ])
})

it('turns direct calendar edits into custom full-day bounds', () => {
  render({ preset: 'thisMonth' })
  controls.pick?.(dayjs(new Date(2026, 9, 1)), dayjs(new Date(2026, 9, 7)))
  expect(change).toHaveBeenCalledWith({
    preset: 'custom',
    customStart: new Date(2026, 9, 1).toISOString(),
    customEnd: new Date(2026, 9, 7, 23, 59, 59, 999).toISOString()
  })
})
