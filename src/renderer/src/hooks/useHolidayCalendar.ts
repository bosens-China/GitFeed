import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createHolidayCalendar, type HolidayCalendar } from '@shared/holiday-calendar'

export const holidayCalendarKey = ['holiday-calendar'] as const

export function useHolidayCalendar(): {
  calendar: HolidayCalendar
  isLoading: boolean
  error: Error | null
} {
  const query = useQuery({
    queryKey: holidayCalendarKey,
    queryFn: () => window.api.getHolidayCalendar(),
    refetchInterval: 15_000,
    retry: false
  })
  const calendar = useMemo(() => createHolidayCalendar(query.data ?? []), [query.data])
  return { calendar, isLoading: query.isLoading, error: query.error as Error | null }
}
