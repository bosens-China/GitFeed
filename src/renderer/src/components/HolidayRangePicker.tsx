import { DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { classifyHolidayDate, type HolidayCalendar } from '@shared/holiday-calendar'

interface HolidayRangePickerProps {
  value: [Dayjs, Dayjs] | null
  calendar: HolidayCalendar
  onChange: (start: Dayjs, end: Dayjs) => void
}

export function HolidayRangePicker({
  value,
  calendar,
  onChange
}: HolidayRangePickerProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <DatePicker.RangePicker
      className="w-[290px] max-w-full"
      value={value}
      renderExtraFooter={() => (
        <div className="flex items-center gap-3 text-[11px] text-[var(--ant-color-text-tertiary)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {t('holidays.restDay')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            {t('holidays.makeupWorkday')}
          </span>
        </div>
      )}
      allowClear={false}
      cellRender={(current, info) => {
        if (info.type !== 'date' || !dayjs.isDayjs(current)) return info.originNode
        const date = current.format('YYYY-MM-DD')
        const kind = classifyHolidayDate(date, calendar)
        const isMakeup = calendar.days.get(date)?.isOffDay === false
        if (kind !== 'restDay' && !isMakeup) return info.originNode
        return (
          <div className="relative" title={calendar.days.get(date)?.name}>
            {info.originNode}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isMakeup ? 'bg-sky-500' : 'bg-amber-500'}`}
            />
          </div>
        )
      }}
      onChange={(dates) => {
        if (dates?.[0] && dates[1]) onChange(dates[0], dates[1])
      }}
    />
  )
}
