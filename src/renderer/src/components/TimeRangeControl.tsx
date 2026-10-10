import { Segmented } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { ResolvedTimeRange, TimeRangePreset, TimeRangeState } from '@shared/models'
import type { HolidayCalendar } from '@shared/holiday-calendar'
import { customDayBounds } from '@shared/time-range'
import { HolidayRangePicker } from './HolidayRangePicker'

interface TimeRangeControlProps {
  state: TimeRangeState
  range: ResolvedTimeRange
  calendar: HolidayCalendar
  onChange: (state: TimeRangeState) => void
}

export function TimeRangeControl({
  state,
  range,
  calendar,
  onChange
}: TimeRangeControlProps): React.JSX.Element {
  const { t } = useTranslation()
  const start = dayjs(range.start)
  const end = dayjs(state.preset === 'custom' ? range.end : new Date(range.end.getTime() - 1))
  const selectDates = (startDate: Date, endDate: Date): void => {
    const bounds = customDayBounds(startDate, endDate)
    onChange({
      preset: 'custom',
      customStart: bounds.start.toISOString(),
      customEnd: bounds.end.toISOString()
    })
  }

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-3">
      <div className="max-w-full overflow-x-auto">
        <Segmented
          value={state.preset}
          options={(['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'custom'] as const).map(
            (preset) => ({ label: t(`filterBar.${preset}`), value: preset })
          )}
          onChange={(value) => {
            const preset = value as TimeRangePreset
            if (preset === 'custom') selectDates(start.toDate(), end.toDate())
            else onChange({ preset })
          }}
        />
      </div>
      <HolidayRangePicker
        value={[start, end]}
        calendar={calendar}
        onChange={(startDate, endDate) => selectDates(startDate.toDate(), endDate.toDate())}
      />
    </div>
  )
}
