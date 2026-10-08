import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { HolidayCalendar } from '@shared/holiday-calendar'

interface HolidayDateTagProps {
  date: string
  calendar: HolidayCalendar
}

export function HolidayDateTag({ date, calendar }: HolidayDateTagProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const day = calendar.days.get(date)
  if (!day) return null
  return (
    <Tag color={day.isOffDay ? 'orange' : 'blue'} bordered={false} className="m-0 text-xs">
      {day.name} · {t(day.isOffDay ? 'holidays.offDay' : 'holidays.makeupWorkday')}
    </Tag>
  )
}
