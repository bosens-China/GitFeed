import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import dayjs, { type Dayjs } from 'dayjs'
import { expect, it, vi } from 'vitest'
import { HolidayRangePicker } from '../src/renderer/src/components/HolidayRangePicker'
import { createHolidayCalendar } from '../src/shared/holiday-calendar'
import bundled2026 from '../src/main/holidays/2026.json'

vi.mock('antd', () => ({
  DatePicker: {
    RangePicker: ({
      cellRender
    }: {
      cellRender: (date: Dayjs, info: { type: 'date'; originNode: ReactElement }) => React.ReactNode
    }) =>
      createElement(
        'div',
        null,
        ...['2026-10-01', '2026-10-10', '2026-10-11', '2027-01-02'].map((date) =>
          createElement(
            'div',
            { key: date, 'data-date': date },
            cellRender(dayjs(date), {
              type: 'date',
              originNode: createElement('span', null, dayjs(date).date())
            })
          )
        )
      )
  }
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

it('marks known rest days and make-up workdays with distinct dots, leaving unknown dates unmarked', () => {
  const html = renderToStaticMarkup(
    createElement(HolidayRangePicker, {
      value: null,
      calendar: createHolidayCalendar([bundled2026]),
      onChange: vi.fn()
    })
  )

  expect(html.match(/pointer-events-none[^"\n]*bg-amber-500/g)).toHaveLength(2)
  expect(html.match(/pointer-events-none[^"\n]*bg-sky-500/g)).toHaveLength(1)
  expect(html).toContain('data-date="2027-01-02"><span>2</span>')
  expect(html).toContain('holidays.restDay')
  expect(html).toContain('holidays.makeupWorkday')
})
